const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const ProfileModel = require('../../models/Profile');

class Profile extends BasicController {
    async getProfile({ userId, username, user }, { userId: authUserId }) {
        const filter = {};
        if (username) {
            filter.username = username;
        } else if (user) {
            filter.$or = [{ userId: user }, { username: user }];
        } else {
            filter.userId = userId;
        }

        const projection = {
            _id: false,
            createdAt: false,
            updatedAt: false,
            __v: false,
            'subscribers.userIds': false,
            'subscribers.communityIds': false,
            'subscriptions.userIds': false,
            'subscriptions.communityIds': false,
        };

        const aggregation = [{ $match: filter }];

        if (authUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscribers.userIds', authUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                    isSubscription: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscriptions.userIds', authUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                },
            });
        }
        aggregation.push({ $project: projection });

        const result = await ProfileModel.aggregate(aggregation);

        if (result.length === 0) {
            throw {
                code: -1101,
                message: 'User not found',
            };
        }

        if (result.length > 1) {
            return result.find(resultUser => resultUser.username === user);
        }

        return result[0];
    }

    suggestNames() {
        // TODO: suggest names based on input
    }

    getSubscribers() {
        // TODO
    }

    getSubscriptions() {
        // TODO
    }

    async resolveProfile({ username }) {
        const profile = await ProfileModel.findOne(
            {
                username,
            },
            {
                userId: true,
                username: true,
                'personal.avatarUrl': true,
            },
            {
                lean: true,
            }
        );

        if (!profile) {
            throw {
                code: 404,
                message: 'Not found',
            };
        }

        return {
            userId: profile.userId,
            username: profile.username,
            avatarUrl: (profile.personal && profile.personal.avatarUrl) || null,
        };
    }
}

module.exports = Profile;
