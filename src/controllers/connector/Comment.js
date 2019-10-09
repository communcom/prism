const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const CommentModel = require('../../models/Comment');
const env = require('../../data/env');

const baseProjection = {
    _id: false,
    communityId: true,
    contentId: true,
    'content.type': true,
    'content.body': true,
    'votes.upCount': true,
    'votes.downCount': true,
    isSubscribedAuthor: true,
    isSubscribedCommunity: true,
    parents: true,
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
                subscribers: '$$profile.subscribers',
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

class Comment extends BasicController {
    async getComment({ userId, permlink, communityId }, { userId: authUserId }) {
        const filter = { contentId: { userId, permlink }, communityId };
        const projection = { ...baseProjection };
        const aggregation = [{ $match: filter }];

        const profileLookup = {
            $lookup: {
                from: 'profiles',
                localField: 'contentId.userId',
                foreignField: 'userId',
                as: 'profile',
            },
        };

        const communityLookup = {
            $lookup: {
                from: 'communities',
                localField: 'communityId',
                foreignField: 'communityId',
                as: 'community',
            },
        };

        aggregation.push(profileLookup);
        aggregation.push(communityLookup);
        aggregation.push({ $project: projection });

        if (authUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribedAuthor: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$author.subscribers.userIds', authUserId],
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

        aggregation.push({
            $project: { 'author.subscribers': false, 'community.subscribers': false },
        });

        const [comment] = await CommentModel.aggregate(aggregation);

        if (!comment) {
            throw {
                code: 404,
                message: 'Comment not found',
            };
        }

        return comment;
    }

    getComments() {
        // TODO: get comments fot specific post
    }
}

module.exports = Comment;
