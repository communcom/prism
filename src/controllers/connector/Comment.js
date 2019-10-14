const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const CommentModel = require('../../models/Comment');
const { lookUpCommunityByAlias } = require('../../utils/community');
const { isIncludes } = require('../../utils/mongodb');
const env = require('../../data/env');

// todo: fix projection
const baseProjection = {
    _id: false,
    communityId: true,
    contentId: true,
    'content.type': true,
    'content.body': true,
    'votes.upCount': true,
    'votes.downCount': true,
    childCommentsCount: true,
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

class Comment extends BasicController {
    async getComment({ userId, permlink, communityId, communityAlias }, { userId: authUserId }) {
        communityId = await this._fixCommunityId({ communityId, communityAlias });

        const filter = {
            'contentId.userId': userId,
            'contentId.permlink': permlink,
            'contentId.communityId': communityId,
        };
        const projection = { ...baseProjection };
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

    async getComments({ type, ...params }, auth) {
        switch (type) {
            case 'post':
                return await this._getPostComments({ ...params }, auth);
            case 'user':
            case 'replies':
                return await this._getProfileComments({ ...params, type }, auth);
        }
    }

    async _getProfileComments({ userId, limit, offset, sortBy, type }, { userId: authUserId }) {
        const filter = {};

        if (type === 'user') {
            filter.$match = { 'contentId.userId': userId };
        } else {
            filter.$match = {
                $or: [{ 'parents.comment.userId': userId }, { 'parents.post.userId': userId }],
            };
        }

        const paging = [{ $skip: offset }, { $limit: limit }];
        const sorting = {
            $sort: {
                'meta.creationTime': sortBy === 'time' ? -1 : 1,
            },
        };
        const aggregation = [
            filter,
            ...paging,
            sorting,
            profileLookup,
            communityLookup,
            { $project: baseProjection },
            ...this._addCurrentUserFields(authUserId),
            {
                $project: { 'author.subscribers': false, 'community.subscribers': false },
            },
        ];

        const items = await CommentModel.aggregate(aggregation);

        return { items };
    }

    async _getPostComments(
        { userId, communityId, communityAlias, permlink, limit, offset, sortBy, parentComment },
        { userId: authUserId }
    ) {
        let parentCommentPermlink;
        let parentCommentUserId;

        if (parentComment) {
            parentCommentPermlink = parentComment.permlink;
            parentCommentUserId = parentComment.userId;
        }

        communityId = await this._fixCommunityId({ communityId, communityAlias });

        const filter = {
            'parents.post.userId': userId,
            'parents.post.permlink': permlink,
            'parents.post.communityId': communityId,
        };

        let nestedLevel = 1;

        if (parentCommentPermlink && parentCommentUserId) {
            nestedLevel = 2;
            filter['parents.comment.permlink'] = parentCommentPermlink;
            filter['parents.comment.userId'] = parentCommentUserId;
        }

        filter.nestedLevel = nestedLevel;

        const sorting = {
            $sort: {
                'meta.creationTime': sortBy === 'time' ? -1 : 1,
            },
        };

        const projection = { ...baseProjection };
        const aggregation = [{ $match: filter }, sorting, { $skip: offset }, { $limit: limit }];

        aggregation.push(profileLookup);
        aggregation.push(communityLookup);
        aggregation.push({ $project: projection });

        aggregation.push(...this._addCurrentUserFields(authUserId));

        aggregation.push({
            $project: { 'author.subscribers': false, 'community.subscribers': false },
        });

        const items = await CommentModel.aggregate(aggregation);

        if (nestedLevel === 1) {
            const getCommentChildren = async comment => {
                comment.children = (await this._getPostComments(
                    {
                        userId,
                        communityId,
                        permlink,
                        limit: 5,
                        offset: 0,
                        sortBy,
                        parentComment: comment.contentId,
                    },
                    { userId: authUserId }
                )).items;
            };

            const commentChildrenPopulation = [];
            for (const comment of items) {
                if (comment.childCommentsCount <= 5) {
                    commentChildrenPopulation.push(getCommentChildren(comment));
                }
            }
            await Promise.all(commentChildrenPopulation);
        }

        return { items };
    }

    _addCurrentUserFields(userId) {
        if (!userId) {
            return [];
        }

        return [
            isIncludes({
                newField: 'author.isSubscribed',
                arrayPath: '$author.subscribers.userIds',
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

    async _fixCommunityId({ communityId, communityAlias }) {
        if (!communityId && !communityAlias) {
            throw {
                code: 409,
                message: 'Invalid params',
            };
        }

        if (!communityId) {
            communityId = await lookUpCommunityByAlias(communityAlias);
        }

        if (!communityId) {
            throw {
                code: 404,
                message: 'Community not found',
            };
        }

        return communityId;
    }
}

module.exports = Comment;
