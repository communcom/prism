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
                communityId: '$$community.communityId',
                communityName: '$$community.communityName',
                avatarUrl: '$$community.avatar',
            },
        },
    },
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

    async getPost({ communityId, userId, permlink }) {
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
                $project: baseProjection,
            },
        ]);

        this._fixPost(post);

        return post;
    }

    _fixPost(post) {
        if (!post.author.userId) {
            post.author = {
                userId: post.contentId.userId,
                username: null,
                avatarUrl: null,
            };
        }

        if (!post.community.communityId) {
            post.community = {
                communityId: post.communityId,
                communityName: null,
                avatarUrl: null,
            };
        }

        delete post.communityId;
    }
}

module.exports = Posts;
