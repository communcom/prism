const core = require('cyberway-core-service');
const { Logger } = core.utils;
const { mongoTypes } = core.services.MongoDB;
const { ObjectId } = mongoTypes;

const CommentModel = require('../models/Comment');
const { addFieldIsIncludes } = require('./mongodb');

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

async function getComment(id, { userId: authUserId }) {
    const filter = {
        _id: ObjectId(id),
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
        aggregation.push(..._addCurrentUserFields(authUserId));
    }

    aggregation.push({
        $project: { 'author.subscribers': false, 'community.subscribers': false },
    });

    const [comment] = await CommentModel.aggregate(aggregation);

    if (comment) {
        _fixComment(comment);
    }
    return comment;
}

function _addCurrentUserFields(userId) {
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

function _fixComments(comments) {
    for (const comment of comments) {
        _fixComment(comment);
    }
}

function _fixComment(comment) {
    comment.type = 'comment';

    if (comment.document) {
        comment.document = comment.document.body;
    }
}

module.exports = { getComment };
