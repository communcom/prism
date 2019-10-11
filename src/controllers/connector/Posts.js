const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const PostModel = require('../../models/Post');
const { normalizeContentId } = require('../../utils/community');
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
        'content.type': true,
        'content.body': true,
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
        'content.article': true,
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
    async getPosts({ type, allowNsfw, userId, limit, offset = 0 }, { userId: authUserId }) {
        if (offset < 0) {
            throw {
                code: 500,
                message: 'Invalid offset value',
            };
        }

        if (type === 'byUser') {
            return await this._getPostsByUser({ userId, limit, offset, allowNsfw }, authUserId);
        }

        const aggregation = [
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
            baseProjection,
            ...this._addCurrentUserFields(authUserId),
            cleanUpProjection,
        ];

        const items = await this._aggregate(aggregation);

        return {
            items,
        };
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
            filter.$match['content.tags'] = { $ne: 'nsfw' };
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
