const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const PostModel = require('../../models/Post');
const { lookUpCommunityByAlias } = require('../../utils/community');

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
            localField: 'communityId',
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
            },
        },
    },
};

const fullPostProjection = {
    ...baseProjection,
    'content.article': true,
};

class Posts extends BasicController {
    async getPosts({ type, limit, offset = 0 }) {
        if (offset < 0) {
            throw {
                code: 500,
                message: 'Invalid offset value',
            };
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
        ]);

        for (const post of items) {
            this._fixPost(post);
        }

        return {
            items,
        };
    }

    async getPost({ communityId, communityAlias, userId, permlink }, auth) {
        // "auth" can be used here

        if (!communityId && !communityAlias) {
            throw {
                code: 409,
                message: 'Invalid params',
            };
        }

        if (!communityId) {
            communityId = lookUpCommunityByAlias(communityAlias);
        }

        if (!communityId) {
            throw {
                code: 404,
                message: 'Post not found',
            };
        }

        const [post] = await PostModel.aggregate([
            {
                $match: {
                    communityId,
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
