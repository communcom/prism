const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const PostModel = require('../../models/Post');

const baseProjection = {
    _id: false,
    communityId: true,
    contentId: true,
    'content.type': true,
    'content.body': true,
    'votes.upCount': true,
    'votes.downCount': true,
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
                id: '$$community.communityId',
                name: '$$community.communityName',
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
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'contentId.userId',
                    foreignField: 'userId',
                    as: 'profile',
                },
            },
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

    async getPost({ communityId, userId, permlink }, auth) {
        // "auth" can be used here

        const [post] = await PostModel.aggregate([
            {
                $match: {
                    communityId,
                    'contentId.userId': userId,
                    'contentId.permlink': permlink,
                },
            },
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

        if (!post.community.communityId) {
            post.community = {
                id: post.communityId,
                name: null,
                avatarUrl: null,
            };
        }

        delete post.communityId;

        post.type = post.content.type;

        if (isFullPostQuery) {
            post.content = post.content.article || post.content.body;
        } else {
            post.content = post.content.body;
        }
    }
}

module.exports = Posts;
