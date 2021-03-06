const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const CommentModel = require('../../models/Comment');
const { resolveCommunityId } = require('../../utils/lookup');
const { addFieldIsIncludes } = require('../../utils/mongodb');
const env = require('../../data/env');

const CHILD_COMMENTS_INLINE_LIMIT = 5;

// todo: fix projection
const baseProjection = {
    _id: false,
    communityId: true,
    contentId: true,
    'document.type': true,
    'document.body': true,
    'document.textLength': true,
    'votes.upCount': true,
    'votes.downCount': true,
    'votes.hasUpVote': true,
    'votes.hasDownVote': true,
    childCommentsCount: true,
    isSubscribedAuthor: true,
    isSubscribedCommunity: true,
    parents: true,
    meta: true,
    isDeleted: true,
    author: {
        $let: {
            vars: {
                profile: { $arrayElemAt: ['$profile', 0] },
            },
            in: {
                userId: '$$profile.userId',
                username: '$$profile.username',
                avatarUrl: '$$profile.avatarUrl',
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
        localField: 'contentId.communityId',
        foreignField: 'communityId',
        as: 'community',
    },
};

const postLookup = {
    $lookup: {
        from: 'posts',
        let: {
            communityId: '$parents.post.communityId',
            userId: '$parents.post.userId',
            permlink: '$parents.post.permlink',
        },
        as: 'post',
        pipeline: [
            {
                $match: {
                    $and: [
                        { $expr: { $eq: ['$contentId.communityId', '$$communityId'] } },
                        { $expr: { $eq: ['$contentId.userId', '$$userId'] } },
                        { $expr: { $eq: ['$contentId.permlink', '$$permlink'] } },
                    ],
                },
            },
            {
                $project: {
                    contentId: 1,
                },
            },
        ],
    },
};

class Comment extends BasicController {
    async getComment({ userId, permlink, communityId, communityAlias }, { userId: authUserId }) {
        communityId = await resolveCommunityId({ communityId, communityAlias });

        const filter = {
            'contentId.userId': userId,
            'contentId.permlink': permlink,
            'contentId.communityId': communityId,
        };
        const projection = { ...baseProjection, 'votes.upVotes': true, 'votes.downVotes': true };
        const aggregation = [{ $match: filter }];

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
            aggregation.push(...this._addCurrentUserFields(authUserId));
        }

        aggregation.push({
            $project: {
                'author.subscribers': false,
                'community.subscribers': false,
                'votes.upVotes': false,
                'votes.downVotes': false,
            },
        });

        const [comment] = await CommentModel.aggregate(aggregation);

        if (!comment) {
            throw {
                code: 404,
                message: 'Comment not found',
            };
        }

        this._fixComment(comment);

        return comment;
    }

    async getComments({ type, ...params }, { userId: authUserId }) {
        switch (type) {
            case 'post':
                return await this._getPostComments({ ...params }, authUserId);
            case 'user':
            case 'replies':
                return await this._getProfileComments({ ...params, type }, authUserId);
        }
    }

    async _getProfileComments({ userId, limit, offset, sortBy, type }, authUserId) {
        const filter = { $match: { status: 'clean' } };

        if (type === 'user') {
            filter.$match['contentId.userId'] = userId;
        } else {
            filter.$match.$or = [
                { 'parents.comment.userId': userId },
                { 'parents.post.userId': userId },
            ];
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sorting = {
            $sort: {
                'meta.creationTime': sortBy === 'time' ? 1 : -1,
            },
        };
        const aggregation = [
            filter,
            sorting,
            ...paging,
            profileLookup,
            communityLookup,
            postLookup,
            {
                $addFields: {
                    'parents.isDeleted': {
                        $cond: {
                            if: { $size: '$post' },
                            then: false,
                            else: true,
                        },
                    },
                },
            },
            ...this._addCurrentUserFields(authUserId),
            { $project: baseProjection },
            {
                $project: { 'author.subscribers': false, 'community.subscribers': false },
            },
        ];

        const items = await CommentModel.aggregate(aggregation);

        this._fixComments(items);

        return { items };
    }

    async _getPostComments(
        {
            userId,
            communityId,
            communityAlias,
            permlink,
            limit,
            offset,
            sortBy,
            parentComment,
            resolveNestedComments,
        },
        authUserId
    ) {
        let parentCommentPermlink;
        let parentCommentUserId;

        if (parentComment) {
            parentCommentPermlink = parentComment.permlink;
            parentCommentUserId = parentComment.userId;
        }

        communityId = await resolveCommunityId({ communityId, communityAlias });

        const filter = {
            'parents.post.userId': userId,
            'parents.post.permlink': permlink,
            'parents.post.communityId': communityId,
            status: 'clean',
        };

        let nestedLevel = 1;

        if (parentCommentPermlink && parentCommentUserId) {
            nestedLevel = 2;
            filter['parents.comment.permlink'] = parentCommentPermlink;
            filter['parents.comment.userId'] = parentCommentUserId;
        }

        filter.nestedLevel = nestedLevel;

        const sorting = {};

        switch (sortBy) {
            case 'popularity':
                sorting.$sort = {
                    'votes.upCount': -1,
                };
                break;
            case 'timeDesc':
                sorting.$sort = {
                    'meta.creationTime': -1,
                };
                break;
            case 'time':
            default:
                sorting.$sort = {
                    'meta.creationTime': 1,
                };
        }

        const projection = { ...baseProjection };
        const aggregation = [{ $match: filter }, sorting, { $skip: offset }, { $limit: limit }];

        aggregation.push(profileLookup);
        aggregation.push(communityLookup);
        aggregation.push(...this._addCurrentUserFields(authUserId));

        aggregation.push({ $project: projection });

        aggregation.push({
            $project: { 'author.subscribers': false, 'community.subscribers': false },
        });

        const items = await CommentModel.aggregate(aggregation);

        if (nestedLevel === 1 && resolveNestedComments === true) {
            const promises = [];

            for (const comment of items) {
                if (comment.childCommentsCount > 0) {
                    promises.push(
                        this._fetchCommentChildren({
                            userId,
                            communityId,
                            permlink,
                            comment,
                            authUserId,
                        })
                    );
                }
            }

            await Promise.all(promises);
        }

        this._fixComments(items);

        return { items };
    }

    async _fetchCommentChildren({ userId, communityId, permlink, comment, authUserId }) {
        const results = await this._getPostComments(
            {
                userId,
                communityId,
                permlink,
                limit: CHILD_COMMENTS_INLINE_LIMIT,
                offset: 0,
                sortBy: 'time',
                parentComment: comment.contentId,
            },
            authUserId
        );

        comment.children = results.items;
    }

    _addCurrentUserFields(userId) {
        if (!userId) {
            return [];
        }

        return [
            addFieldIsIncludes({
                newField: 'author.isSubscribed',
                arrayPath: '$author.subscribers.userIds',
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

    _fixComments(comments) {
        for (const comment of comments) {
            this._fixComment(comment);
        }
    }

    _fixComment(comment) {
        comment.type = 'comment';

        if (comment.document) {
            comment.document = comment.document.body;
        }
    }
}

module.exports = Comment;
