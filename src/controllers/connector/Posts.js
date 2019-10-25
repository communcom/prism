const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const { Logger } = core.utils;

const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');
const {
    normalizeContentId,
    lookupUserIdByUsername,
    resolveCommunityId,
} = require('../../utils/lookup');
const { isIncludes } = require('../../utils/mongodb');

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
        votes: true,
        stats: true,
        meta: true,
        author: {
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
                    { type, timeframe, allowNsfw, offset, limit },
                    authUserId
                );
        }
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

    async _getPostsByUser({ userId, allowNsfw, limit, offset }, authUserId) {
        const filter = { $match: { 'contentId.userId': userId } };

        if (!allowNsfw) {
            filter.$match['document.tags'] = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': 1 } };

        const items = await this._aggregate([
            filter,
            ...paging,
            sort,
            ...lookups,
            baseProjection,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async _getFeedNew({ allowNsfw, limit, offset }, authUserId) {
        const filter = { $match: {} };

        if (!allowNsfw) {
            filter.$match['document.tags'] = { $ne: 'nsfw' };
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
        const filter = { $match: { 'contentId.communityId': communityId } };

        if (!allowNsfw) {
            filter.$match['document.tags'] = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': -1 } };

        const items = await this._aggregate([
            filter,
            sort,
            ...paging,
            ...lookups,
            baseProjection,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ]);

        return { items };
    }

    async _getTopFeed(
        { type, timeframe, allowNsfw, limit, offset, communityId, communityAlias },
        authUserId
    ) {
        // make default sorting, so nothing breaks
        const sortBy = { $sort: { _id: -1 } };
        const filter = { $match: {} };
        let addSortingField;

        if (!allowNsfw) {
            filter.$match['document.tags'] = { $ne: 'nsfw' };
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

        switch (type) {
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
                // todo: implement after rewards parse implementation
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

            if (isFullPostQuery) {
                post.document = post.document.article || post.document.body;
            } else {
                post.document = post.document.body;
            }
        } else {
            post.type = 'basic';
        }
    }

    _addCurrentUserFields(userId) {
        if (!userId) {
            return [];
        }

        return [
            isIncludes({
                newField: 'author.isSubscribed',
                arrayPath: '$author.subscribers',
                value: userId,
            }),
            isIncludes({
                newField: 'community.isSubscribed',
                arrayPath: '$community.subscribers',
                value: userId,
            }),
            isIncludes({
                newField: 'votes.hasUpVote',
                arrayPath: '$votes.upVotes.userId',
                value: userId,
            }),
            isIncludes({
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

        return items;
    }
}

module.exports = Posts;
