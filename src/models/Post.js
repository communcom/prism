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
        document: {
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
        reports: {
            userIds: {
                type: [String],
                default: [],
            },
            reportsCount: {
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
        status: {
            type: String,
            enum: ['clean', 'locked', 'banned'],
            default: 'clean',
        },
        mosaicState: {
            tracery: {
                type: String,
                required: true,
            },
            gemCount: {
                type: Number,
            },
            shares: {
                type: Number,
            },
            damnShares: {
                type: Number,
            },
            reward: {
                type: String,
            },
            banned: {
                type: Boolean,
            },
        },
        hot: {
            type: Number,
            default: null,
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
                    'document.tags': 1,
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
                    'mosaicState.tracery': 1,
                },
            },
            {
                fields: {
                    'votes.upCount': -1,
                },
            },
            {
                fields: {
                    hot: -1,
                    'contentId.communityId': 1,
                },
                options: {
                    sparse: true,
                },
            },
        ],
    }
);
