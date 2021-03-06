const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

const { Logger } = core.utils;

const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');
const TopFeedBlacklistCommunitiesModel = require('../../models/TopFeedBlacklistCommunities');
const {
    normalizeContentId,
    lookupUserIdByUsername,
    resolveCommunityId,
} = require('../../utils/lookup');
const { addFieldIsIncludes } = require('../../utils/mongodb');
const { appendViewsCount } = require('../../utils/viewsCount');

const lookups = [
    {
        $lookup: {
            from: 'profiles',
            localField: 'contentId.userId',
            foreignField: 'userId',
            as: 'profile',
        },
    },
    {
        $lookup: {
            from: 'communities',
            localField: 'contentId.communityId',
            foreignField: 'communityId',
            as: 'community',
        },
    },
];

const baseProjection = {
    $project: {
        _id: false,
        contentId: true,
        'document.type': true,
        'document.body': true,
        'document.textLength': true,
        votes: true,
        'stats.commentsCount': true,
        meta: true,
        isNsfw: { $in: ['nsfw', '$tags'] },
        language: true,
        author: {
            $let: {
                vars: {
                    profile: { $arrayElemAt: ['$profile', 0] },
                },
                in: {
                    userId: '$$profile.userId',
                    username: '$$profile.username',
                    avatarUrl: '$$profile.avatarUrl',
                    subscribers: '$$profile.subscribers.userIds',
                    postsCount: '$$profile.stats.postsCount',
                    subscribersCount: '$$profile.subscribers.usersCount',
                },
            },
        },
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
                    subscribers: '$$community.subscribers',
                },
            },
        },
    },
};

const fullPostProjection = {
    $project: {
        ...baseProjection.$project,
        'document.article': true,
        tags: true,
    },
};

const addUrl = {
    $addFields: {
        url: {
            $concat: [
                '/',
                '$community.alias',
                '/@',
                '$author.username',
                '/',
                '$contentId.permlink',
            ],
        },
    },
};

const cleanUpProjection = {
    $project: {
        'community.subscribers': false,
        'author.subscribers': false,
        'votes.upVotes': false,
        'votes.downVotes': false,
    },
};

class Posts extends BasicController {
    async getPosts(
        {
            type,
            timeframe,
            allowNsfw,
            userId,
            limit,
            offset,
            communityId,
            communityAlias,
            username,
            allowedLanguages,
        },
        { userId: authUserId }
    ) {
        if (!userId) {
            userId = await lookupUserIdByUsername(username);
        }

        if (offset < 0) {
            throw {
                code: 500,
                message: 'Invalid offset value',
            };
        }

        switch (type) {
            case 'subscriptions':
            case 'subscriptionsHot':
                return await this._getPostsBySubscriptions(
                    { userId, limit, type, offset, allowNsfw },
                    authUserId
                );
            case 'byUser':
                return await this._getPostsByUser({ userId, limit, offset, allowNsfw }, authUserId);
            case 'new':
                return await this._getFeedNew({ limit, offset, allowNsfw }, authUserId);
            case 'community':
                return await this._getCommunityFeedNew(
                    { limit, offset, allowNsfw, communityId, communityAlias },
                    authUserId
                );
            case 'topLikes':
            case 'topComments':
            case 'topRewards':
                return await this._getTopFeed(
                    {
                        type,
                        timeframe,
                        userId,
                        allowNsfw,
                        communityId,
                        communityAlias,
                        offset,
                        limit,
                        allowedLanguages,
                        excludeSpecificCommunities: true,
                    },
                    authUserId
                );
            case 'subscriptionsPopular':
                return await this._getTopFeed(
                    {
                        type,
                        timeframe,
                        userId,
                        allowNsfw,
                        communityId,
                        communityAlias,
                        offset,
                        limit,
                    },
                    authUserId
                );
            case 'hot':
                return await this._getHotFeed(
                    {
                        communityId,
                        communityAlias,
                        allowNsfw,
                        offset,
                        limit,
                        allowedLanguages,
                        excludeSpecificCommunitues: true,
                    },
                    authUserId
                );
            case 'voted':
                return await this._getVotedPosts({ userId, allowNsfw, limit, offset }, authUserId);
        }
    }

    async _getVotedPosts({ userId, allowNsfw, limit, offset }, authUserId) {
        const filter = { $match: { 'votes.upVotes.userId': userId, status: 'clean' } };

        if (!allowNsfw) {
            filter.$match.tags = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': -1 } };

        const items = await this._aggregate([
            filter,
            sort,
            ...paging,
            ...lookups,
            baseProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async getPost(params, { userId: authUserId }) {
        const { communityId, userId, permlink } = await normalizeContentId(params);

        const aggregation = [
            {
                $match: {
                    'contentId.communityId': communityId,
                    'contentId.userId': userId,
                    'contentId.permlink': permlink,
                },
            },
            ...lookups,
            fullPostProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ];

        const [post] = await this._aggregate(aggregation, true);

        if (!post) {
            throw {
                code: 404,
                message: 'Post not found',
            };
        }

        return post;
    }

    async _getPostsBySubscriptions({ userId, allowNsfw, type, limit, offset }, authUserId) {
        const profile = await ProfileModel.findOne(
            { userId },
            { _id: false, subscriptions: true, blacklist: true },
            { lean: true }
        );

        if (!profile) {
            throw {
                code: 404,
                message: `Profile ${userId} is not found`,
            };
        }

        const filter = {
            $match: {
                $or: [
                    { 'contentId.userId': { $in: profile.subscriptions.userIds } },
                    { 'contentId.communityId': { $in: profile.subscriptions.communityIds } },
                ],
                status: 'clean',
                $nor: [
                    { 'contentId.userId': { $in: profile.blacklist.userIds } },
                    { 'contentId.communityId': { $in: profile.blacklist.communityIds } },
                ],
            },
        };

        if (!allowNsfw) {
            filter.$match.tags = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: {} };

        switch (type) {
            case 'subscriptionsHot':
                sort.$sort = { hot: -1 };

                const now = Date.now();
                const scope = 1000 * 60 * 60 * env.GLS_HOT_SCOPE_HOURS;
                const startDate = now - scope;
                filter.$match['meta.creationTime'] = { $gte: new Date(startDate) };
                break;
            case 'subscriptions':
            default:
                sort.$sort = { 'meta.creationTime': -1 };
                break;
        }

        const items = await this._aggregate([
            filter,
            sort,
            ...paging,
            ...lookups,
            baseProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async _getPostsByUser({ userId, allowNsfw, limit, offset }, authUserId) {
        const filter = { $match: { 'contentId.userId': userId, status: 'clean' } };

        if (!allowNsfw) {
            filter.$match.tags = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': -1 } };

        const items = await this._aggregate([
            filter,
            sort,
            ...paging,
            ...lookups,
            baseProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async _getFeedNew({ allowNsfw, limit, offset }, authUserId) {
        const filter = { $match: { status: 'clean', language: 'en' } };

        if (!allowNsfw) {
            filter.$match.tags = { $ne: 'nsfw' };
        }

        if (authUserId) {
            const blacklist = await this._getBlacklist(authUserId);
            if (blacklist.userIds.length > 0) {
                filter.$match['contentId.userId'] = { $nin: blacklist.userIds };
            }
            if (blacklist.communityIds.length > 0) {
                filter.$match['contentId.communityId'] = { $nin: blacklist.communityIds };
            }
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': -1 } };

        const items = await this._aggregate([
            filter,
            sort,
            ...paging,
            ...lookups,
            baseProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async _getCommunityFeedNew(
        { allowNsfw, limit, offset, communityId, communityAlias },
        authUserId
    ) {
        communityId = await resolveCommunityId({ communityId, communityAlias });
        const filter = { $match: { 'contentId.communityId': communityId, status: 'clean' } };

        if (!allowNsfw) {
            filter.$match.tags = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': -1 } };

        const items = await this._aggregate([
            filter,
            sort,
            ...paging,
            ...lookups,
            baseProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async _getHotFeed(
        {
            communityId,
            communityAlias,
            allowNsfw,
            offset,
            limit,
            allowedLanguages,
            excludeSpecificCommunities = false,
        },
        authUserId
    ) {
        const now = Date.now();
        const scope = 1000 * 60 * 60 * env.GLS_HOT_SCOPE_HOURS;
        const startDate = now - scope;

        let communitiesToExclude = [];
        if (excludeSpecificCommunities) {
            communitiesToExclude = await TopFeedBlacklistCommunitiesModel.find(
                {},
                { communityId: 1 },
                { lean: true }
            );
        }

        const match = {
            $match: {
                'meta.creationTime': {
                    $gte: new Date(startDate),
                },
                status: 'clean',
                'contentId.communityId': {
                    $nin: communitiesToExclude.map(({ communityId }) => communityId),
                },
            },
        };

        if (allowedLanguages && !allowedLanguages.includes('all')) {
            match.$match.language = { $in: allowedLanguages };
        }

        if (communityId || communityAlias) {
            communityId = await resolveCommunityId({ communityId, communityAlias });
            match.$match['contentId.communityId'] = communityId;
        }

        if (authUserId) {
            const blacklist = await this._getBlacklist(authUserId);

            if (blacklist.userIds.length > 0) {
                match.$match['contentId.userId'] = { $nin: blacklist.userIds };
            }
            if (blacklist.communityIds.length > 0) {
                match.$match['contentId.communityId'] = { $nin: blacklist.communityIds };
            }
        }

        if (!allowNsfw) {
            match.$match.tags = { $ne: 'nsfw' };
        }

        const sorting = {
            $sort: {
                hot: -1,
            },
        };

        const paging = [{ $skip: offset }, { $limit: limit }];

        const projection = { ...baseProjection };

        if (env.GLS_HOT_DEBUG_ENABLED) {
            projection.$project.hotMeta = 1;
            projection.$project.hot = 1;
        }

        const aggregation = [
            match,
            sorting,
            ...paging,
            ...lookups,
            projection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ];

        const items = await this._aggregate(aggregation);

        return { items };
    }

    async _getTopFeed(
        {
            type,
            timeframe,
            allowNsfw,
            limit,
            offset,
            communityId,
            userId,
            communityAlias,
            allowedLanguages,
            excludeSpecificCommunities = false,
        },
        authUserId
    ) {
        let communitiesToExclude = [];
        if (excludeSpecificCommunities) {
            communitiesToExclude = await TopFeedBlacklistCommunitiesModel.find(
                {},
                { communityId: 1 },
                { lean: true }
            );
        }

        // make default sorting, so nothing breaks
        const sortBy = { $sort: { _id: -1 } };
        const filter = {
            $match: {
                status: 'clean',
                'contentId.communityId': {
                    $nin: communitiesToExclude.map(({ communityId }) => communityId),
                },
            },
        };
        if (allowedLanguages && !allowedLanguages.includes('all')) {
            filter.$match.language = { $in: allowedLanguages };
        }

        let addSortingField;

        if (!allowNsfw) {
            filter.$match.tags = { $ne: 'nsfw' };
        }

        if (communityAlias || communityId) {
            filter.$match['contentId.communityId'] = await resolveCommunityId({
                communityId,
                communityAlias,
            });
        }

        const now = Date.now();
        const dayMillis = 1000 * 60 * 60 * 24;
        const weekMillis = dayMillis * 7;
        const monthMillis = weekMillis * 4;

        const dayAgo = new Date(now - dayMillis);
        const weekAgo = new Date(now - weekMillis);
        const monthAgo = new Date(now - monthMillis);

        switch (timeframe) {
            case 'day':
                filter.$match['meta.creationTime'] = { $gte: dayAgo };
                break;
            case 'week':
                filter.$match['meta.creationTime'] = { $gte: weekAgo };
                break;
            case 'month':
                filter.$match['meta.creationTime'] = { $gte: monthAgo };
                break;
        }
        let profile;

        switch (type) {
            case 'subscriptionsPopular':
                profile = await ProfileModel.findOne(
                    { userId },
                    { _id: false, subscriptions: true, blacklist: true },
                    { lean: true }
                );

                if (!profile) {
                    throw {
                        code: 404,
                        message: 'User not found',
                    };
                }

                filter.$match.$or = [
                    { 'contentId.userId': { $in: [...profile.subscriptions.userIds] } },
                    { 'contentId.communityId': { $in: [...profile.subscriptions.communityIds] } },
                ];
                filter.$match.$nor = [
                    { 'contentId.userId': { $in: [...profile.blacklist.userIds] } },
                    { 'contentId.communityId': { $in: [...profile.blacklist.communityIds] } },
                ];
            case 'topLikes':
                addSortingField = {
                    $addFields: {
                        votesSum: {
                            $subtract: ['$votes.upCount', '$votes.downCount'],
                        },
                    },
                };

                sortBy.$sort = { votesSum: -1 };
                break;
            case 'topComments':
                sortBy.$sort = { 'stats.commentsCount': -1 };
                break;
            case 'topRewards':
                sortBy.$sort = { 'mosaicState.shares': -1 };
                break;
        }

        const paging = [{ $skip: offset }, { $limit: limit }];

        const aggregation = [filter];

        if (addSortingField) {
            aggregation.push(addSortingField);
        }

        aggregation.push(
            sortBy,
            ...paging,
            ...lookups,
            baseProjection,
            addUrl,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection
        );

        const items = await this._aggregate(aggregation);

        return { items };
    }

    async _getBlacklist(userId) {
        const profile = await ProfileModel.findOne(
            { userId },
            { _id: false, blacklist: true },
            { lean: true }
        );

        if (!profile) {
            Logger.warn(`Profile (${userId}) is not found`);
            return {
                userIds: [],
                communityIds: [],
            };
        }

        return profile.blacklist;
    }

    _fixPost(post, isFullPostQuery) {
        if (!post.author.userId) {
            post.author = {
                userId: post.contentId.userId,
                username: null,
                avatarUrl: null,
            };
        }

        if (post.document) {
            post.type = post.document.type;
            post.textLength = post.document.textLength;

            if (isFullPostQuery) {
                post.document = post.document.article || post.document.body;
            } else {
                post.document = post.document.body;
            }
        } else {
            post.type = 'basic';
            post.document = null;
            post.textLength = 0;
        }
    }

    _addCurrentUserFields(userId) {
        if (!userId) {
            return [];
        }

        return [
            addFieldIsIncludes({
                newField: 'author.isSubscribed',
                arrayPath: '$author.subscribers',
                value: userId,
            }),
            addFieldIsIncludes({
                newField: 'community.isSubscribed',
                arrayPath: '$community.subscribers',
                value: userId,
            }),
            addFieldIsIncludes({
                newField: 'votes.hasUpVote',
                arrayPath: '$votes.upVotes.userId',
                value: userId,
            }),
            addFieldIsIncludes({
                newField: 'votes.hasDownVote',
                arrayPath: '$votes.downVotes.userId',
                value: userId,
            }),
        ];
    }

    async _aggregate(aggregation, isFullPostQuery = false) {
        const finalAggregation = aggregation.filter(item => Boolean(item));

        const items = await PostModel.aggregate(finalAggregation);

        for (const post of items) {
            this._fixPost(post, isFullPostQuery);
        }

        await appendViewsCount(items, this);

        return items;
    }
}

module.exports = Posts;
