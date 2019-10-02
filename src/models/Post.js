const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Post',
    {
        contentId: {
            userId: {
                type: String,
                required: true,
            },
            permlink: {
                type: String,
                required: true,
            },
        },
        communityId: {
            type: String,
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
                    communityId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    communityId: 1,
                },
            },
        ],
    }
);
