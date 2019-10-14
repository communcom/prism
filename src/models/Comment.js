const core = require('cyberway-core-service');
const { MongoDB } = core.services;

const contentIdType = {
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
};

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
        content: {
            title: {
                type: String,
            },
            body: {
                type: Object,
            },
            metadata: {
                type: Object,
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
            // User comments, sorted by time
            {
                fields: {
                    'contentId.userId': 1,
                    'meta.creationTime': 1,
                },
            },
        ],
    }
);
