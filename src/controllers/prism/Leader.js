const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const LeaderModel = require('../../models/Leader');
const ProfileModel = require('../../models/Profile');

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
