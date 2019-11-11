const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const LeaderModel = require('../../models/Leader');
const CommunityModel = require('../../models/Community');
const { reorderLeaders } = require('../../utils/leaders');

const LAST_LEADER_POSITION = 9999999;

class Leader extends Abstract {
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
                url,
                isActive: true,
                rating: '0',
                ratingNum: 0,
                hasRating: false,
                position: LAST_LEADER_POSITION,
            });

            await this.registerForkChanges({
                type: 'create',
                Model: LeaderModel,
                documentId: newModel._id,
            });
        }

        await this._incrementLeadersCount({ communityId, inc: 1 });
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

        await this._incrementLeadersCount({ communityId, inc: -1 });
    }

    async _activate({ commun_code: communityId, leader: userId }) {
        await this._setActiveState({ communityId, userId, isActive: true });
    }

    async _deactivate({ commun_code: communityId, leader: userId }) {
        await this._setActiveState({ communityId, userId, isActive: false });
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
                        isActive: previousModel.isActive,
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
            type: 'vote',
        });
    }

    async _unvote({ commun_code: communityId, leader: leaderId, voter: userId }) {
        await this._saveVote({
            communityId,
            leaderId,
            userId,
            type: 'unvote',
        });
    }

    async _saveVote({ communityId, leaderId, userId, type }) {
        let action, revert, inc;

        if (type === 'vote') {
            action = '$addToSet';
            revert = '$pull';
            inc = 1;
        } else {
            action = '$pull';
            revert = '$addToSet';
            inc = -1;
        }

        const previousModel = await LeaderModel.findOneAndUpdate(
            {
                communityId,
                userId: leaderId,
            },
            {
                [action]: { votes: userId },
                $inc: { votesCount: inc },
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
                $inc: { votesCount: -inc },
            },
        });
    }

    async _reorderLeaders(communityId) {
        try {
            await reorderLeaders(communityId);

            await this.registerForkChanges({
                type: 'reorderLeaders',
                meta: {
                    communityId,
                },
            });
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

                const ratingNum = Number(rating) || 0;

                const previous = await LeaderModel.findOneAndUpdate(
                    {
                        communityId,
                        userId,
                    },
                    {
                        $set: {
                            rating,
                            ratingNum: ratingNum,
                            hasRating: ratingNum > 0,
                            isActive,
                        },
                    }
                );

                if (previous) {
                    await this.registerForkChanges({
                        type: 'update',
                        Model: LeaderModel,
                        documentId: previous._id,
                        data: {
                            $set: {
                                rating: previous.rating,
                                ratingNum: previous.ratingNum,
                                hasRating: previous.hasRating,
                                isActive: previous.isActive,
                            },
                        },
                    });

                    isSomebodyUpdated = true;
                }
            }
        }

        return isSomebodyUpdated;
    }

    async _incrementLeadersCount({ communityId, inc }) {
        const previous = await CommunityModel.findOneAndUpdate(
            { communityId },
            {
                $inc: {
                    leadersCount: inc,
                },
            }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: CommunityModel,
            documentId: previous._id,
            data: {
                $inc: {
                    leadersCount: -inc,
                },
            },
        });
    }
}

module.exports = Leader;
