const core = require('gls-core-service');
const mongoose = core.services.MongoDB.mongoose;
const BasicController = core.controllers.Basic;

class Profile extends BasicController {
    async getProfile({ requestedUserId, username, user }) {
        const ProfileView = mongoose.connection.db.collection('CommunUsers');

        const filter = {};
        if (username) {
            filter.username = username;
        } else {
            filter.$or = [{ userId: user }, { username: user }];
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

        const aggregation = [{ $match: filter }, { $project: projection }];

        if (requestedUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscribers.userIds', requestedUserId],
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
                                        $indexOfArray: ['$subscriptions.userIds', requestedUserId],
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

        // like this, because `toArray` is the only allowed method
        const result = await ProfileView.aggregate(aggregation).toArray();

        if (!result) {
            throw {
                code: -1101,
                message: 'User not found',
            };
        }

        if (result.length > 1) {
            return result.find(resultUser => {
                return resultUser.username === user;
            });
        }

        return result[0];
    }

    suggestNames() {
        // TODO: suggest names based on input
    }
}

module.exports = Profile;
