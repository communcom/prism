const { JsonRpc, Api } = require('cyberwayjs');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const { isNil } = require('lodash');
const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const { calculateTracery } = require('../../utils/mosaic');
const env = require('../../data/env');
const LeaderModel = require('../../models/Leader');
const ReportModel = require('../../models/Report');
const ProposalModel = require('../../models/LeaderProposal');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

const ALLOWED_ACTIONS = [
    {
        contract: 'c.list',
        action: 'setinfo',
        type: 'setInfo',
    },
    {
        contract: 'c.list',
        action: 'ban',
        type: 'banUser',
    },
    {
        contract: 'c.list',
        action: 'unban',
        type: 'unbanUser',
    },
    {
        contract: 'c.gallery',
        action: 'ban',
        type: 'banPost',
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
        switch (action) {
            case 'propose':
                // Игнорируем предложения без commun_code, потому что функционал внутри контракта ctrl
                // работает не только для сообществ.
                if (!params.commun_code) {
                    return;
                }

                await this.handleNewProposal(params, meta);
                break;

            case 'approve':
            case 'unapprove':
                await this.handleProposalVote(params, action === 'approve');
                break;

            case 'exec':
                await this.handleProposalExec(params, meta);
                break;

            case 'cancel':
                await this.handleProposalCancel(params);
                break;

            default:
            // Do nothing
        }
    }

    async handleNewProposal(
        { commun_code: communityId, proposer, proposal_name: proposalId, permission, trx },
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

        const actionInfo = ALLOWED_ACTIONS.find(
            allowed => allowed.contract === contract && allowed.action === action
        );

        if (!actionInfo) {
            return;
        }

        if (contract === 'c.list' && action === 'setinfo') {
            if (!this._validateSetInfo(data)) {
                return;
            }
        }

        let contentType;
        if (contract === 'c.gallery' && action === 'ban') {
            contentType = await this._getBannedPublicationType(data);
            if (!contentType) {
                return;
            }

            const { author: userId, permlink } = data.message_id;
            const tracery = calculateTracery(userId, permlink);
            data.tracery = tracery;

            const match = {
                'contentId.communityId': communityId,
                'contentId.userId': userId,
                'contentId.permlink': permlink,
            };

            const report = await ReportModel.findOne(match, { reports: false }, { lean: true });

            if (!report) {
                return;
            }

            await ReportModel.updateOne(match, {
                $set: {
                    proposalId,
                    tracery,
                },
            });
        }

        const proposalModel = await ProposalModel.create({
            communityId,
            proposer,
            proposalId,
            type: actionInfo.type,
            contract,
            action,
            permission,
            blockTime,
            expiration,
            isExecuted: false,
            approves: [],
            data,
            contentType,
        });

        await this.registerForkChanges({
            type: 'create',
            Model: ProposalModel,
            documentId: proposalModel._id,
        });
    }

    async handleProposalVote({ proposer, proposal_name: proposalId, approver }, isApprove) {
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

    async handleProposalExec({ proposer, proposal_name: proposalId, executer }, { blockTime }) {
        const updatedModel = await ProposalModel.findOneAndUpdate(
            {
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

    async handleProposalCancel({ proposer, proposal_name: proposalId }) {
        const deletedModel = await ProposalModel.findOneAndDelete({
            proposer,
            proposalId,
        });

        if (!deletedModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'remove',
            Model: ProposalModel,
            documentId: deletedModel._id,
            data: deletedModel.toObject(),
        });
    }

    _validateSetInfo(data) {
        const allowedFields = [
            'description',
            'language',
            'rules',
            'avatar_image',
            'cover_image',
            'subject',
        ];

        let updatedFieldsCount = 0;

        for (const [key, value] of Object.entries(data)) {
            if (key === 'commun_code') {
                continue;
            }

            if (!isNil(value)) {
                updatedFieldsCount++;
            }

            if (!allowedFields.includes(key)) {
                Logger.warn('Community "setinfo" proposal with unknown field (skip):', data);
                return false;
            }
        }

        // Обрабатываем только предложения с изменением одного поля
        if (updatedFieldsCount !== 1) {
            Logger.warn('Proposal "community->setinfo" with several changes (skip):', data);
            return false;
        }

        if (!isNil(data.rules)) {
            if (!this._validateRules(data.rules)) {
                Logger.warn(
                    'Proposal "community->setinfo" with invalid rules update (skip):',
                    data.rules
                );
                return false;
            }
        }

        return true;
    }

    async _getBannedPublicationType(data) {
        const { commun_code, message_id } = data;

        const match = {
            'contentId.communityId': commun_code,
            'contentId.userId': message_id.author,
            'contentId.permlink': message_id.permlink,
        };

        const [post, comment] = await Promise.all([
            PostModel.findOne(match, { _id: true }, { lean: true }),
            CommentModel.findOne(match, { _id: true }, { lean: true }),
        ]);

        if (!post && !comment) {
            return null;
        }

        let model, type;
        if (post) {
            model = PostModel;
            type = 'post';
        } else {
            model = CommentModel;
            type = 'comment';
        }

        try {
            await model.updateOne(match, {
                $set: {
                    'reports.status': 'open',
                },
            });
        } catch (err) {
            Logger.warn('Publication update failed:', match, err);
        }

        return type;
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
