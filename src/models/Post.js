const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Post',
    {
        contentId: {
            communityId: {
                type: String,
                required: true,
            },
            userId: {
                type: String,
                required: true,
            },
            permlink: {
                type: String,
                required: true,
            },
        },
        content: {
            type: {
                type: String,
                enum: ['basic', 'article'],
            },
            title: {
                type: String,
            },
            body: {
                type: Object,
            },
            article: {
                type: Object,
            },
            metadata: {
                type: Object,
            },
            tags: {
                type: [String],
            },
        },
        votes: {
            upVotes: {
                type: Array,
                default: [],
            },
            upCount: {
                type: Number,
                default: 0,
            },
            downVotes: {
                type: Array,
                default: [],
            },
            downCount: {
                type: Number,
                default: 0,
            },
        },
        stats: {
            commentsCount: {
                type: Number,
                default: 0,
            },
        },
        meta: {
            creationTime: {
                type: Date,
                default: null,
            },
        },
    },
    {
        index: [
            {
                fields: {
                    'contentId.userId': 1,
                    'contentId.permlink': 1,
                    'contentId.communityId': 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    'contentId.userId': 1,
                    'content.tags': 1,
                    'meta.creationTime': 1,
                },
            },
            {
                fields: {
                    'contentId.userId': 1,
                    'meta.creationTime': 1,
                },
            },
            {
                fields: {
                    'contentId.communityId': 1,
                },
            },
            {
                fields: {
                    'votes.upCount': -1,
                },
            },
        ],
    }
);
