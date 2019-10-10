const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const PostModel = require('../../models/Post');
const { normalizeContentId } = require('../../utils/community');

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
    _id: false,
    contentId: true,
    'content.type': true,
    'content.body': true,
    'votes.upCount': true,
    'votes.downCount': true,
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
};

const subscribersProjection = {
    $project: {
        'community.subscribers': false,
        'author.subscribers': false,
    },
};

const fullPostProjection = {
    ...baseProjection,
    'content.article': true,
};

class Posts extends BasicController {
    async getPosts({ type, allowNsfw, userId, limit, offset = 0 }, auth) {
        if (offset < 0) {
            throw {
                code: 500,
                message: 'Invalid offset value',
            };
        }

        if (type === 'byUser') {
            return await this._getPostsByUser({ userId, limit, offset, allowNsfw }, auth);
        }

        const items = await PostModel.aggregate([
            {
                $sort: {
                    _id: -1,
                },
            },
            {
                $skip: offset,
            },
            {
                $limit: limit,
            },
            ...lookups,
            {
                $project: baseProjection,
            },
            subscribersProjection,
        ]);

        for (const post of items) {
            this._fixPost(post);
        }

        return {
            items,
        };
    }

    async getPost(params, auth) {
        const { communityId, userId, permlink } = await normalizeContentId(params);

        const [post] = await PostModel.aggregate([
            {
                $match: {
                    'contentId.communityId': communityId,
                    'contentId.userId': userId,
                    'contentId.permlink': permlink,
                },
            },
            ...lookups,
            {
                $project: fullPostProjection,
            },
        ]);

        if (!post) {
            throw {
                code: 404,
                message: 'Post not found',
            };
        }

        this._fixPost(post, true);

        return post;
    }

    async _getPostsByUser({ userId, allowNsfw, limit, offset }, { userId: authUserId }) {
        const aggregation = [];

        const filter = { $match: { 'contentId.userId': userId } };

        if (!allowNsfw) {
            filter.$match['content.tags'] = { $ne: 'nsfw' };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sort = { $sort: { 'meta.creationTime': 1 } };
        const projection = {
            $project: baseProjection,
        };

        aggregation.push(filter, ...paging, sort, ...lookups, projection);

        if (authUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribedAuthor: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$author.subscribers', authUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                    isSubscribedCommunity: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$community.subscribers', authUserId],
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

        aggregation.push(subscribersProjection);

        const items = await PostModel.aggregate(aggregation);

        return { items };
    }

    _fixPost(post, isFullPostQuery) {
        if (!post.author.userId) {
            post.author = {
                userId: post.contentId.userId,
                username: null,
                avatarUrl: null,
            };
        }

        if (post.content) {
            post.type = post.content.type;

            if (isFullPostQuery) {
                post.content = post.content.article || post.content.body;
            } else {
                post.content = post.content.body;
            }
        } else {
            post.type = 'basic';
        }
    }
}

module.exports = Posts;
