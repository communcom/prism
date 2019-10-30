const { JsonRpc, Api } = require('cyberwayjs');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');
const core = require('cyberway-core-service');
const { cloneDeep } = require('lodash');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const env = require('../../data/env');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');
const ProposalModel = require('../../models/Proposal');

const LAST_LEADER_POSITION = 9999999;

const SET_PARAMS = 'setparams';

const ALLOWED_CONTRACTS = {
    publish: [SET_PARAMS],
    ctrl: [SET_PARAMS],
    referral: [SET_PARAMS],
    emit: [SET_PARAMS],
    vesting: [SET_PARAMS],
    charge: ['setrestorer'],
};

class Leader extends Abstract {
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
        let isNeedReorderLeaders = false;

        switch (action) {
            case 'regleader':
                await this._register(params);
                isNeedReorderLeaders = true;
                break;

            case 'unregleader':
                await this._unregister(params);
                isNeedReorderLeaders = true;
                break;

            case 'startleader':
                await this._activate(params);
                isNeedReorderLeaders = true;
                break;

            case 'stopleader':
                await this._deactivate(params);
                isNeedReorderLeaders = true;
                break;

            case 'voteleader':
                await this._vote(params);
                isNeedReorderLeaders = true;
                break;

            case 'unvotelead':
                await this._unvote(params);
                isNeedReorderLeaders = true;
                break;

            default:
            // Do nothing
        }

        if (meta.events && meta.events.length) {
            if (await this._updateLeadersRating(meta.events)) {
                isNeedReorderLeaders = true;
            }
        }

        if (isNeedReorderLeaders) {
            await this._reorderLeaders(communityId);
        }
    }

    async _register({ commun_code: communityId, leader: userId, url }) {
        const previousModel = await LeaderModel.findOne(
            { communityId, userId },
            { url: true, isActive: true },
            { lean: true }
        );

        if (previousModel) {
            await LeaderModel.updateOne(
                { communityId, userId },
                {
                    $set: {
                        isActive: true,
                        url,
                    },
                }
            );

            await this.registerForkChanges({
                type: 'update',
                Model: LeaderModel,
                documentId: previousModel._id,
                data: {
                    $set: {
                        isActive: previousModel.isActive,
                        url: previousModel.url,
                    },
                },
            });
        } else {
            const newModel = await LeaderModel.create({
                communityId,
                userId,
                isActive: true,
                rating: '0',
                ratingNum: 0,
                position: LAST_LEADER_POSITION,
            });

            await this.registerForkChanges({
                type: 'create',
                Model: LeaderModel,
                documentId: newModel._id,
            });
        }

        await this._updateProfileLeaderIn(userId);
    }

    async _unregister({ commun_code: communityId, leader: userId }) {
        const previousModel = await LeaderModel.findOneAndDelete({ userId, communityId });

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'remove',
            Model: LeaderModel,
            documentId: previousModel._id,
            data: previousModel.toObject(),
        });

        await this._updateProfileLeaderIn(userId);
    }

    async _activate({ commun_code: communityId, leader: userId }) {
        await this._setActiveState({ communityId, userId, isActive: true });
        await this._updateProfileLeaderIn(userId);
    }

    async _deactivate({ commun_code: communityId, leader: userId }) {
        await this._setActiveState({ communityId, userId, isActive: false });
        await this._updateProfileLeaderIn(userId);
    }

    async _setActiveState({ userId, communityId, isActive }) {
        const previousModel = await LeaderModel.findOneAndUpdate(
            { communityId, userId },
            { $set: { isActive } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: LeaderModel,
                documentId: previousModel._id,
                data: {
                    $set: {
                        isActive: !isActive,
                    },
                },
            });
        }
    }

    async _vote({ commun_code: communityId, leader: leaderId, voter: userId }) {
        await this._saveVote({
            communityId,
            leaderId,
            userId,
            action: '$addToSet',
            revert: '$pull',
        });
    }

    async _unvote({ commun_code: communityId, leader: leaderId, voter: userId }) {
        await this._saveVote({
            communityId,
            leaderId,
            userId,
            action: '$pull',
            revert: '$addToSet',
        });
    }

    async _saveVote({ communityId, leaderId, userId, action, revert }) {
        const previousModel = await LeaderModel.findOneAndUpdate(
            {
                communityId,
                userId: leaderId,
            },
            {
                [action]: { votes: userId },
            }
        );

        if (!previousModel) {
            Logger.warn(`Voting for unknown leader (${leaderId})`);
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: LeaderModel,
            documentId: previousModel._id,
            data: {
                [revert]: { votes: userId },
            },
        });
    }

    async _updateProfileLeaderIn(userId) {
        const communities = await LeaderModel.find(
            { userId, isActive: true },
            { communityId: true },
            { lean: true }
        );

        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            {
                $set: {
                    leaderIn: communities.map(community => community.communityId),
                },
            }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel._id,
            data: {
                $set: {
                    leaderIn: previousModel.leaderIn.toObject(),
                },
            },
        });
    }

    /**
     * @param {string} proposer
     * @param {string} proposalId
     * @param {[{ actor: string, permission: string }]} requested
     * @param {Object} trx
     * @param {Date} blockTime
     */
    async handleNewProposal(
        { proposer, proposal_name: proposalId, requested, trx },
        { blockTime }
    ) {
        if (trx.actions.length !== 1) {
            return;
        }

        const action = trx.actions[0];
        const [communityId, type] = action.account.split('.');

        const allowedActions = ALLOWED_CONTRACTS[type];

        if (!allowedActions || !allowedActions.includes(action.name)) {
            return;
        }

        const expiration = new Date(trx.expiration + 'Z');
        const [{ data }] = await this._api.deserializeActions(trx.actions);
        const proposalModel = new ProposalModel({
            communityId,
            userId: proposer,
            proposalId,
            code: action.account,
            action: action.name,
            blockTime,
            expiration,
            isExecuted: false,
            approves: requested.map(({ actor, permission }) => ({ userId: actor, permission })),
            ...this._extractProposalChanges(data, action.name),
        });
        const saved = await proposalModel.save();

        await this.registerForkChanges({
            type: 'create',
            Model: ProposalModel,
            documentId: saved._id,
        });
    }

    /**
     * @param {string} proposer
     * @param {string} proposalId
     * @param {{ actor: string, permission: string }} level
     * @returns {Promise<void>}
     */
    async handleProposalApprove({ proposer, proposal_name: proposalId, level }) {
        const proposal = await ProposalModel.findOne(
            {
                userId: proposer,
                proposalId,
            },
            {
                _id: true,
                approves: true,
            },
            {
                lean: true,
            }
        );

        if (!proposal) {
            Logger.warn(`Proposal (${proposer}/${proposalId}) not found.`);
            return;
        }

        const approvesUpdated = cloneDeep(proposal.approves);

        const approve = approvesUpdated.find(approve => approve.userId === level.actor);

        if (!approve) {
            Logger.warn(
                `Proposal (${proposer}/${proposalId})`,
                `approve by ${level.actor} not found in requested list (skipping).`
            );
            return;
        }

        approve.isSigned = true;

        await ProposalModel.updateOne(
            {
                userId: proposer,
                proposalId,
            },
            {
                $set: {
                    approves: approvesUpdated,
                },
            }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: ProposalModel,
            documentId: proposal._id,
            data: {
                $set: {
                    approves: proposal.approves,
                },
            },
        });
    }

    async handleProposalExec(
        { proposer, proposal_name: proposalId, executer },
        { communityId, blockTime }
    ) {
        const prev = await ProposalModel.findOneAndUpdate(
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

        // Если такого пропозала не было, значит это был пропозл не настроек сообщества, ничего не делаем.
        if (!prev) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProposalModel,
            documentId: prev._id,
            data: {
                $set: {
                    executer: prev.executer,
                    isExecuted: prev.isExecuted,
                    executedBlockTime: prev.executedBlockTime,
                },
            },
        });
    }

    _extractProposalChanges(data, actionName) {
        if (actionName === SET_PARAMS) {
            return {
                changes: data.params.map(([structureName, values]) => ({
                    structureName,
                    values,
                })),
            };
        }

        return {
            data,
        };
    }

    async _reorderLeaders(communityId) {
        try {
            const leaders = await LeaderModel.find(
                { communityId },
                { _id: false, userId: true, position: true },
                { sort: { isActive: -1, ratingNum: -1, userId: 1 }, lean: true }
            );

            for (let i = 0; i < leaders.length; i++) {
                const { userId, position } = leaders[i];

                // Позиции начинаем с 1
                const updatedPosition = i + 1;

                if (position !== updatedPosition) {
                    await LeaderModel.updateOne(
                        { communityId, userId },
                        { position: updatedPosition }
                    );
                }
            }
        } catch (err) {
            Logger.error('Leaders reordering failed:', err);
        }
    }

    async _updateLeadersRating(events) {
        let isSomebodyUpdated = false;

        for (const { code, event, args } of events) {
            if (code === 'c.ctrl' && event === 'leaderstate') {
                const {
                    commun_code: communityId,
                    leader: userId,
                    weight: rating,
                    active: isActive,
                } = args;

                const updatedObject = await LeaderModel.findOneAndUpdate(
                    {
                        communityId,
                        userId,
                    },
                    {
                        $set: {
                            rating,
                            ratingNum: Number(rating) || 0,
                            isActive,
                        },
                    }
                );

                if (updatedObject) {
                    await this.registerForkChanges({
                        type: 'update',
                        Model: LeaderModel,
                        documentId: updatedObject._id,
                        data: {
                            $set: {
                                rating: updatedObject.rating,
                                ratingNum: updatedObject.ratingNum,
                                isActive: updatedObject.isActive,
                            },
                        },
                    });

                    isSomebodyUpdated = true;
                }
            }
        }

        return isSomebodyUpdated;
    }
}

module.exports = Leader;
