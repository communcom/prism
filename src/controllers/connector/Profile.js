const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const ProfileModel = require('../../models/Profile');
const CommunityModel = require('../../models/Community');
const { isIncludes } = require('../../utils/mongodb');

class Profile extends BasicController {
    async getBlacklist({ userId, user, type }, { userId: authUserId }) {
        let path;
        const lookup = {};
        const replaceRoot = {};
        const addFields = [];
        const finalProjection = {};

        if (type === 'communities') {
            path = 'communityIds';

            lookup.$lookup = {
                from: 'communities',
                localField: 'blacklist',
                foreignField: 'communityId',
                as: 'blacklist',
            };

            replaceRoot.$replaceRoot = {
                newRoot: {
                    subscribers: '$blacklist.subscribers',
                    communityId: '$blacklist.communityId',
                    avatarUrl: '$blacklist.avatarUrl',
                    alias: '$blacklist.alias',
                    name: '$blacklist.name',
                },
            };

            if (authUserId) {
                addFields.push(
                    isIncludes({
                        newField: 'isSubscribed',
                        arrayPath: '$subscribers',
                        value: authUserId,
                    })
                );
            }

            finalProjection.$project = {
                communityId: true,
                avatarUrl: true,
                alias: true,
                name: true,
                isSubscribed: true,
            };
        }

        if (type === 'users') {
            path = 'userIds';

            lookup.$lookup = {
                from: 'profiles',
                localField: 'blacklist',
                foreignField: 'userId',
                as: 'blacklist',
            };

            replaceRoot.$replaceRoot = {
                newRoot: {
                    subscribers: '$blacklist.subscribers',
                    userId: '$blacklist.userId',
                    username: '$blacklist.username',
                    avatarUrl: '$blacklist.personal.avatarUrl',
                },
            };

            if (authUserId) {
                addFields.push(
                    isIncludes({
                        newField: 'isSubscribed',
                        arrayPath: '$subscribers.userIds',
                        value: authUserId,
                    })
                );
            }

            finalProjection.$project = {
                userId: true,
                username: true,
                avatarUrl: true,
                isSubscribed: true,
            };
        }

        const filter = { userId };

        const projection = {
            _id: false,
            blacklist: `$blacklist.${path}`,
        };

        const unwind = {
            $unwind: {
                path: '$blacklist',
            },
        };

        const aggregation = [
            { $match: filter },
            { $project: projection },
            lookup,
            unwind,
            replaceRoot,
            ...addFields,
            finalProjection,
        ];

        const items = await ProfileModel.aggregate(aggregation);

        return { items };
    }

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
            blacklist: false,
        };

        const aggregation = [{ $match: filter }];

        if (authUserId) {
            aggregation.push(
                isIncludes({
                    newField: 'isSubscribed',
                    arrayPath: '$subscribers.userIds',
                    value: authUserId,
                }),
                isIncludes({
                    newField: 'isSubscription',
                    arrayPath: '$subscriptions.userIds',
                    value: authUserId,
                }),
                isIncludes({
                    newField: 'isBlocked',
                    arrayPath: '$blacklist.userIds',
                    value: authUserId,
                })
            );
        }
        aggregation.push({ $project: projection });

        const result = await ProfileModel.aggregate(aggregation);

        if (result.length === 0) {
            throw {
                code: 404,
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

    async _getUserSubscribers({ userId, limit, offset }, { userId: authUserId }) {
        const aggregation = [];

        const filter = {};
        const subscribersProject = {};
        const unwind = {};
        const lookup = {};
        const resultProject = {};
        const paging = [{ $skip: offset }, { $limit: limit }];

        filter.$match = { userId };
        subscribersProject.$project = {
            subscribers: '$subscribers.userIds',
        };
        unwind.$unwind = { path: '$subscribers' };
        lookup.$lookup = {
            from: 'profiles',
            localField: 'subscribers',
            foreignField: 'userId',
            as: 'subscribers',
        };
        resultProject.$project = {
            subscriber: {
                $let: {
                    vars: {
                        subscriber: { $arrayElemAt: ['$subscribers', 0] },
                    },
                    in: {
                        userId: '$$subscriber.userId',
                        username: '$$subscriber.username',
                        avatarUrl: '$$subscriber.personal.avatarUrl',
                        subscribers: '$$subscriber.subscribers.userIds',
                    },
                },
            },
        };
        aggregation.push(filter, subscribersProject, unwind, lookup, resultProject, ...paging);

        if (authUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscriber.subscribers', authUserId],
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

        aggregation.push({
            $replaceRoot: {
                newRoot: {
                    userId: '$subscriber.userId',
                    username: '$subscriber.username',
                    avatarUrl: '$subscriber.avatarUrl',
                    isSubscribed: '$isSubscribed',
                },
            },
        });

        const items = await ProfileModel.aggregate(aggregation);

        return { items };
    }

    async _getCommunitySubscribers({ communityId, limit, offset }, { userId: authUserId }) {
        const aggregation = [];

        const filter = {};
        const subscribersProject = {};
        const unwind = {};
        const lookup = {};
        const resultProject = {};
        const paging = [{ $skip: offset }, { $limit: limit }];

        filter.$match = { communityId };
        subscribersProject.$project = {
            subscribers: true,
        };
        unwind.$unwind = { path: '$subscribers' };
        lookup.$lookup = {
            from: 'profiles',
            localField: 'subscribers',
            foreignField: 'userId',
            as: 'subscribers',
        };
        resultProject.$project = {
            subscriber: {
                $let: {
                    vars: {
                        subscriber: { $arrayElemAt: ['$subscribers', 0] },
                    },
                    in: {
                        userId: '$$subscriber.userId',
                        username: '$$subscriber.username',
                        avatarUrl: '$$subscriber.personal.avatarUrl',
                        subscribers: '$$subscriber.subscribers.userIds',
                    },
                },
            },
        };
        aggregation.push(filter, subscribersProject, unwind, lookup, resultProject, ...paging);
        if (authUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscriber.subscribers', authUserId],
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
        aggregation.push({
            $replaceRoot: {
                newRoot: {
                    userId: '$subscriber.userId',
                    username: '$subscriber.username',
                    avatarUrl: '$subscriber.avatarUrl',
                    isSubscribed: '$isSubscribed',
                },
            },
        });

        const items = await CommunityModel.aggregate(aggregation);

        return { items };
    }

    async getSubscribers({ communityId, userId, limit, offset }, auth) {
        if (communityId && userId) {
            throw {
                code: 409,
                message: 'communityId and userId should not be both set',
            };
        }

        if (!communityId && !userId) {
            throw {
                code: 409,
                message: 'One of communityId and userId should not be set',
            };
        }

        if (userId) {
            return await this._getUserSubscribers({ userId, limit, offset }, auth);
        } else {
            return await this._getCommunitySubscribers({ communityId, offset, limit }, auth);
        }
    }

    async getSubscriptions({ type, userId, offset, limit }, { userId: authUserId }) {
        const aggregation = [];

        const filter = { $match: { userId } };
        aggregation.push(filter);

        const projectionOnSubscriptions = {};
        const unwindSubscriptions = {};
        const unwindProject = {};
        const lookupSubscriptions = {};
        const subscriptionsProjection = {};
        const finalRoot = {};

        switch (type) {
            case 'user':
                projectionOnSubscriptions.$project = { 'subscriptions.userIds': true };
                unwindSubscriptions.$unwind = { path: '$subscriptions.userIds' };
                unwindProject.$project = {
                    userId: '$subscriptions.userIds',
                };
                lookupSubscriptions.$lookup = {
                    from: 'profiles',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'profile',
                };
                subscriptionsProjection.$project = {
                    profile: {
                        $let: {
                            vars: {
                                profile: { $arrayElemAt: ['$profile', 0] },
                            },
                            in: {
                                userId: '$$profile.userId',
                                username: '$$profile.username',
                                avatarUrl: '$$profile.personal.avatarUrl',
                                subscribers: '$$profile.subscribers.userIds',
                            },
                        },
                    },
                };
                finalRoot.$replaceRoot = {
                    newRoot: {
                        userId: '$profile.userId',
                        username: '$profile.username',
                        avatarUrl: '$profile.avatarUrl',
                        isSubscribed: '$isSubscribed',
                    },
                };
                break;
            case 'community':
                projectionOnSubscriptions.$project = { 'subscriptions.communityIds': true };
                unwindSubscriptions.$unwind = { path: '$subscriptions.communityIds' };
                unwindProject.$project = {
                    communityId: '$subscriptions.communityIds',
                };
                lookupSubscriptions.$lookup = {
                    from: 'communities',
                    localField: 'communityId',
                    foreignField: 'communityId',
                    as: 'community',
                };
                subscriptionsProjection.$project = {
                    community: {
                        $let: {
                            vars: {
                                community: { $arrayElemAt: ['$community', 0] },
                            },
                            in: {
                                communityId: '$$community.communityId',
                                name: '$$community.name',
                                code: '$$community.code',
                                avatarUrl: '$$community.avatarUrl',
                                subscribers: '$$community.subscribers.userIds',
                            },
                        },
                    },
                };
                finalRoot.$replaceRoot = {
                    newRoot: {
                        communityId: '$community.communityId',
                        name: '$community.name',
                        code: '$community.code',
                        avatarUrl: '$community.avatarUrl',
                        isSubscribed: '$isSubscribed',
                    },
                };
                break;
        }
        aggregation.push(
            projectionOnSubscriptions,
            unwindSubscriptions,
            unwindProject,
            lookupSubscriptions
        );

        aggregation.push({ $limit: limit });
        aggregation.push({ $skip: offset });

        aggregation.push(subscriptionsProjection);

        if (authUserId) {
            let pathPrefix = '';
            switch (type) {
                case 'user':
                    pathPrefix = 'profile';
                    break;
                case 'community':
                    pathPrefix = 'communities';
                    break;
            }

            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: [`$${pathPrefix}.subscribers`, authUserId],
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

        aggregation.push(finalRoot);

        return { items: await ProfileModel.aggregate(aggregation) };
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
