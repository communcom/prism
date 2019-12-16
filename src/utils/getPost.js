const core = require('cyberway-core-service');
const { Logger } = core.utils;
const PostModel = require('../models/Post');
const { normalizeContentId } = require('./lookup');
const { addFieldIsIncludes } = require('./mongodb');
const { mongoTypes } = core.services.MongoDB;
const { ObjectId } = mongoTypes;

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
        'document.textLength': true,
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
                    avatarUrl: '$$profile.avatarUrl',
                    subscribers: '$$profile.subscribers.userIds',
                    postsCount: '$$profile.stats.postsCount',
                    subscribersCount: '$$profile.subscribers.usersCount',
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
        tags: true,
    },
};

const addUrl = {
    $addFields: {
        url: {
            $concat: [
                '/',
                '$community.alias',
                '/@',
                '$author.username',
                '/',
                '$contentId.permlink',
            ],
        },
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

async function getPost(id, { userId: authUserId } = {}) {
    let match = { _id: ObjectId(id) };

    const aggregation = [
        {
            $match: match,
        },
        ...lookups,
        fullPostProjection,
        addUrl,
        ...addCurrentUserFields(authUserId),
        cleanUpProjection,
    ];

    return (await _aggregate(aggregation, true))[0];
}

async function _aggregate(aggregation, isFullPostQuery = false) {
    const finalAggregation = aggregation.filter(item => Boolean(item));

    const items = await PostModel.aggregate(finalAggregation);

    for (const post of items) {
        _fixPost(post, isFullPostQuery);
    }

    return items;
}

function _fixPost(post, isFullPostQuery) {
    if (!post.author.userId) {
        post.author = {
            userId: post.contentId.userId,
            username: null,
            avatarUrl: null,
        };
    }

    if (post.document) {
        post.type = post.document.type;
        post.textLength = post.document.textLength;

        if (isFullPostQuery) {
            post.document = post.document.article || post.document.body;
        } else {
            post.document = post.document.body;
        }
    } else {
        post.type = 'basic';
        post.document = null;
        post.textLength = 0;
    }
}

function addCurrentUserFields(userId) {
    if (!userId) {
        return [];
    }

    return [
        addFieldIsIncludes({
            newField: 'author.isSubscribed',
            arrayPath: '$author.subscribers',
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

module.exports = {
    getPost,
};
