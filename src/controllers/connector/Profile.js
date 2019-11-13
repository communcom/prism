const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const ProfileModel = require('../../models/Profile');
const CommunityModel = require('../../models/Community');
const { addFieldIsIncludes } = require('../../utils/mongodb');
const escape = require('escape-string-regexp');

const COMMON_COMMUNITIES_COUNT = 10;

class Profile extends BasicController {
    async isInUserBlacklist({ userId, targetUserId }) {
        const user = await this.getProfile({ userId: targetUserId }, { userId });
        if (!user) {
            return false;
        }

        return user.isBlocked;
    }

    async getProfileBanHistory({ userId, limit, offset }) {
        const filter = { userId };

        const items = await BanModel.find(
            filter,
            {
                _id: false,
                type: true,
                userId: true,
                leaderUserId: true,
                communityId: true,
                reason: true,
            },
            { lean: true }
        )
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit);

        return { items };
    }

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
                    addFieldIsIncludes({
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
                    postsCount: '$blacklist.stats.postsCount',
                    subscribersCount: '$blacklist.subscribers.usersCount',
                },
            };

            if (authUserId) {
                addFields.push(
                    addFieldIsIncludes({
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
                postsCount: true,
                subscribersCount: true,
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

    async getProfile({ userId, username, user, maxCommonCommunities }, { userId: authUserId }) {
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
            stats: true,
            leaderIn: true,
            userId: true,
            username: true,
            registration: true,
            personal: true,
            'subscriptions.communitiesCount': true,
            'subscriptions.usersCount': true,
            'subscribers.usersCount': true,
            isSubscribed: true,
            isSubscription: true,
            isBlocked: true,
        };

        const aggregation = [{ $match: filter }];

        if (authUserId) {
            aggregation.push(
                addFieldIsIncludes({
                    newField: 'isSubscribed',
                    arrayPath: '$subscribers.userIds',
                    value: authUserId,
                }),
                addFieldIsIncludes({
                    newField: 'isSubscription',
                    arrayPath: '$subscriptions.userIds',
                    value: authUserId,
                }),
                addFieldIsIncludes({
                    newField: 'isBlocked',
                    arrayPath: '$blacklist.userIds',
                    value: authUserId,
                })
            );
        }

        aggregation.push({ $project: projection });

        let resultUser;
        const result = await ProfileModel.aggregate(aggregation);

        if (result.length === 0) {
            throw {
                code: 404,
                message: 'User not found',
            };
        }

        if (result.length > 1) {
            resultUser = result.find(resultUser => resultUser.username === user);
        } else {
            resultUser = result[0];
        }

        resultUser.highlightCommunities = [];
        resultUser.highlightCommunitiesCount = 0;

        if (authUserId) {
            resultUser.highlightCommunities = await this._getHighlightCommunities({
                hostUserId: userId,
                guestUserId: authUserId,
                maxCommonCommunities,
            });
            resultUser.highlightCommunitiesCount = resultUser.highlightCommunities.length;
        }

        return resultUser;
    }

    async suggestNames({ text }) {
        text = text.trim();
        return {
            items: await ProfileModel.aggregate([
                { $match: { username: { $regex: `^${escape(text.toLowerCase())}` } } },
                { $limit: 10 },
                {
                    $project: {
                        _id: false,
                        userId: true,
                        username: true,
                        avatarUrl: '$personal.avatarUrl',
                    },
                },
            ]),
        };
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
                        subscribersCount: '$$subscriber.subscribers.usersCount',
                        postsCount: '$$subscriber.stats.postsCount',
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
                    subscribersCount: '$subscriber.subscribers.usersCount',
                    postsCount: '$subscriber.stats.postsCount',
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
                                subscribersCount: '$$profile.subscribers.usersCount',
                                postsCount: '$$profile.stats.postsCount',
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
                        subscribersCount: '$profile.subscribersCount',
                        postsCount: '$profile.postsCount',
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
                                alias: '$$community.alias',
                                name: '$$community.name',
                                avatarUrl: '$$community.avatarUrl',
                                coverUrl: '$$community.coverUrl',
                                postsCount: '$$community.postsCount',
                                subscribers: '$$community.subscribers',
                            },
                        },
                    },
                };
                finalRoot.$replaceRoot = {
                    newRoot: {
                        communityId: '$community.communityId',
                        alias: '$community.alias',
                        name: '$community.name',
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

        aggregation.push({ $skip: offset });
        aggregation.push({ $limit: limit });

        aggregation.push(subscriptionsProjection);

        if (authUserId) {
            let pathPrefix = '';
            switch (type) {
                case 'user':
                    pathPrefix = 'profile';
                    break;
                case 'community':
                    pathPrefix = 'community';
                    break;
            }

            aggregation.push(
                addFieldIsIncludes({
                    newField: 'isSubscribed',
                    arrayPath: `$${pathPrefix}.subscribers`,
                    value: authUserId,
                })
            );
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

    async _getHighlightCommunities({ hostUserId, guestUserId, maxCommonCommunities }) {
        const [commonCommunities, popularCommunities] = await ProfileModel.aggregate([
            { $match: { userId: hostUserId } },
            { $project: { _id: false, communities: '$subscriptions.communityIds' } },
            {
                $lookup: {
                    from: 'communities',
                    localField: 'communities',
                    foreignField: 'communityId',
                    as: 'communities',
                },
            },
            {
                $unwind: {
                    path: '$communities',
                },
            },
            {
                $sort: { 'communities.subscribers': -1 },
            },
            {
                $project: {
                    communityId: '$communities.communityId',
                    alias: '$communities.alias',
                    name: '$communities.name',
                    avatarUrl: '$communities.avatarUrl',
                    coverUrl: '$communities.coverUrl',
                    postsCount: '$communities.postsCount',
                    subscribers: '$communities.subscribers',
                    subscribersCount: '$communities.subscribersCount',
                },
            },
            addFieldIsIncludes({
                newField: 'isSubscribed',
                arrayPath: '$subscribers',
                value: guestUserId,
            }),
            {
                $group: {
                    _id: '$isSubscribed',
                    communities: {
                        $push: {
                            communityId: '$communityId',
                            alias: '$alias',
                            name: '$name',
                            avatarUrl: '$avatarUrl',
                            coverUrl: '$coverUrl',
                            postsCount: '$postsCount',
                            isSubscribed: '$isSubscribed',
                            subscribersCount: '$subscribersCount',
                        },
                    },
                },
            },
        ]);

        const highlightCommunities = [];

        for (let i = 0; i < maxCommonCommunities && i < commonCommunities.communities.length; i++) {
            highlightCommunities.push(commonCommunities.communities[i]);
        }

        highlightCommunities.push(
            ...popularCommunities.communities.slice(
                0,
                COMMON_COMMUNITIES_COUNT - maxCommonCommunities
            )
        );

        return highlightCommunities;
    }
}

module.exports = Profile;
