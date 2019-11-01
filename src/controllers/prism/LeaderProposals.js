const { JsonRpc, Api } = require('cyberwayjs');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const { isNil } = require('lodash');
const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const env = require('../../data/env');
const LeaderModel = require('../../models/Leader');
const ProposalModel = require('../../models/LeaderProposal');

const ALLOWED_ACTIONS = [
    {
        contactAction: 'c.list->setinfo',
        fields: ['description', 'language', 'rules', 'avatar_image', 'cover_image'],
    },
];

class LeaderProposals extends Abstract {
    constructor(...args) {
        super(...args);

        const rpc = new JsonRpc(env.GLS_CYBERWAY_CONNECT, { fetch });

        this._api = new Api({
            rpc,
            signatureProvider: null,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });
    }

    async processAction(action, params, meta) {
        // Игнорируем все события без commun_code, потому что функционал внутри контракта ctrl
        // работает не только для сообществ.
        if (!params.commun_code) {
            return;
        }

        const communityId = params.commun_code;

        switch (action) {
            case 'propose':
                await this.handleNewProposal(communityId, params, meta);
                break;

            case 'approve':
            case 'unapprove':
                await this.handleProposalVote(communityId, params, action === 'approve');
                break;

            case 'exec':
                await this.handleProposalExec(communityId, params, meta);
                break;

            default:
            // Do nothing
        }
    }

    async handleNewProposal(
        communityId,
        { proposer, proposal_name: proposalId, permission, trx },
        { blockTime }
    ) {
        if (trx.actions.length !== 1) {
            return;
        }

        const leader = await LeaderModel.findOne(
            { userId: proposer },
            { _id: true },
            { lean: true }
        );

        if (!leader) {
            Logger.warn(`Proposal from unknown leader: (${proposer})`);
            return;
        }

        const { account: contract, name: action } = trx.actions[0];

        const expiration = new Date(trx.expiration + 'Z');
        const [{ data }] = await this._api.deserializeActions(trx.actions);

        if (!data.commun_code) {
            return;
        }

        const contactAction = `${contract}->${action}`;

        const actionInfo = ALLOWED_ACTIONS.find(action => action.contactAction === contactAction);

        if (!actionInfo) {
            return;
        }

        if (contactAction === 'c.list->setinfo') {
            let updatedFieldsCount = 0;

            for (const [key, value] of Object.entries(data)) {
                if (key === 'commun_code') {
                    continue;
                }

                if (!isNil(value)) {
                    updatedFieldsCount++;
                }

                if (!actionInfo.fields.includes(key)) {
                    Logger.warn('Community "setinfo" proposal with unknown field (skip):', data);
                    return;
                }
            }

            // Обрабатываем только предложения с изменением одного поля
            if (updatedFieldsCount !== 1) {
                Logger.warn('Proposal "community->setinfo" with several changes (skip):', data);
                return;
            }

            if (!isNil(data.rules)) {
                if (!this._validateRules(data.rules)) {
                    Logger.warn(
                        'Proposal "community->setinfo" with invalid rules update (skip):',
                        data.rules
                    );
                    return;
                }
            }
        }

        const proposalModel = await ProposalModel.create({
            communityId,
            proposer,
            proposalId,
            contract,
            action,
            blockTime,
            expiration,
            isExecuted: false,
            approves: [],
            data,
        });

        await this.registerForkChanges({
            type: 'create',
            Model: ProposalModel,
            documentId: proposalModel._id,
        });
    }

    async handleProposalVote(
        communityId,
        { proposer, proposal_name: proposalId, approver },
        isApprove
    ) {
        let action;

        if (isApprove) {
            action = {
                direct: '$addToSet',
                revert: '$pull',
            };
        } else {
            action = {
                direct: '$pull',
                revert: '$addToSet',
            };
        }

        const updatedModel = await ProposalModel.findOneAndUpdate(
            {
                communityId,
                proposer,
                proposalId,
            },
            {
                [action.direct]: {
                    approves: approver,
                },
            }
        );

        if (!updatedModel) {
            Logger.warn(`Proposal (${proposer}/${proposalId}) not found.`);
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProposalModel,
            documentId: updatedModel._id,
            data: {
                [action.revert]: {
                    approves: approver,
                },
            },
        });
    }

    async handleProposalExec(
        communityId,
        { proposer, proposal_name: proposalId, executer },
        { blockTime }
    ) {
        const updatedModel = await ProposalModel.findOneAndUpdate(
            {
                communityId,
                proposer,
                proposalId,
            },
            {
                $set: {
                    executer,
                    isExecuted: true,
                    executedBlockTime: blockTime,
                },
            }
        );

        if (!updatedModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProposalModel,
            documentId: updatedModel._id,
            data: {
                $set: {
                    executer: updatedModel.executer,
                    isExecuted: updatedModel.isExecuted,
                    executedBlockTime: updatedModel.executedBlockTime,
                },
            },
        });
    }

    _validateRules(rulesJSON) {
        let rules;

        try {
            rules = JSON.parse(rulesJSON);
        } catch (err) {
            Logger.warn('Invalid community rules format:', rulesJSON);
            return false;
        }

        if (!rules || typeof rules !== 'object') {
            return false;
        }

        try {
            if (rules.type === 'patch') {
                return this._validateRulesPatch(rules);
            } else {
                return this._validateSetRules(rules);
            }
        } catch (err) {
            Logger.error('Error while community rules validation:', err);
            return false;
        }
    }

    _validateRulesPatch(rules) {
        if (rules.actions.length !== 1) {
            return false;
        }

        const action = rules.actions[0];
        const { data } = action;

        switch (action.type) {
            case 'add':
                if (!data.id || typeof data.id !== 'string') {
                    return false;
                }

                if (!data.title || typeof data.title !== 'string') {
                    return false;
                }

                if (!data.text || typeof data.text !== 'string') {
                    return false;
                }
                break;

            case 'update':
                if (!data.id || typeof data.id !== 'string') {
                    return false;
                }

                if (!data.title && !data.text) {
                    return false;
                }

                if (data.title && typeof data.title !== 'string') {
                    return false;
                }

                if (data.text && typeof data.text !== 'string') {
                    return false;
                }
                break;

            case 'remove':
                if (!data.id || typeof data.id !== 'string') {
                    return false;
                }
                break;

            default:
                // Если patch содержит неизвестные типы действий то считаем его невалидным.
                return false;
        }

        return true;
    }

    _validateSetRules(rules) {
        if (!Array.isArray(rules)) {
            return false;
        }

        if (rules.length === 0) {
            return false;
        }

        for (const rule of rules) {
            if (!rule.id || typeof rule.id !== 'string') {
                return false;
            }

            if (!rule.title || typeof rule.title !== 'string') {
                return false;
            }

            if (!rule.text || typeof rule.text !== 'string') {
                return false;
            }
        }

        return true;
    }
}

module.exports = LeaderProposals;
