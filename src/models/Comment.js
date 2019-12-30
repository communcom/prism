const core = require('cyberway-core-service');
const { MongoDB } = core.services;

const { contentIdType } = require('./common');

module.exports = MongoDB.makeModel(
    'Comment',
    {
        contentId: contentIdType,
        parents: {
            post: {
                type: contentIdType,
                required: true,
            },
            comment: {
                type: contentIdType,
            },
        },
        document: {
            title: {
                type: String,
            },
            body: {
                type: Object,
            },
            metadata: {
                type: Object,
            },
            textLength: {
                type: Number,
                default: 0,
            },
            imagesProcessingStatus: {
                type: Number,
                default: 0,
            },
        },
        childCommentsCount: {
            type: Number,
            default: 0,
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
            status: {
                type: String,
                enum: [
                    'open',
                    'closed',
                    // for 0 reports
                    'clean',
                ],
                default: 'clean',
            },
        },
        meta: {
            creationTime: {
                type: Date,
                default: null,
            },
        },
        nestedLevel: {
            type: Number,
            default: 1,
        },
        ordering: {
            byTime: {
                type: String,
            },
        },
        status: {
            type: String,
            enum: ['clean', 'locked', 'banned'],
            default: 'clean',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        mosaicState: {
            tracery: {
                type: String,
                required: true,
            },
            collectionEnd: {
                type: Date,
            },
            gemCount: {
                type: Number,
                default: 0,
            },
            shares: {
                type: Number,
                default: 0,
            },
            damnShares: {
                type: Number,
                default: 0,
            },
            reward: {
                type: String,
                default: '',
            },
            banned: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        index: [
            // Default
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
            // Post comments, sorted by time
            {
                fields: {
                    'parents.post.userId': 1,
                    'parents.post.permlink': 1,
                    'ordering.byTime': 1,
                },
                options: {
                    sparse: true,
                },
            },
            {
                fields: {
                    'parents.post': 1,
                    'ordering.byTime': 1,
                },
                options: {
                    sparse: true,
                },
            },
            // User comments, sorted by time
            {
                fields: {
                    'contentId.userId': 1,
                    'meta.creationTime': 1,
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
                    'document.imagesProcessingStatus': 1,
                },
            },
        ],
    }
);
