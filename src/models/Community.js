const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Community',
    {
        communityId: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        accountName: {
            type: String,
        },
        avatarUrl: {
            type: String,
        },
        coverImageLink: {
            type: String,
        },
        description: {
            type: String,
        },
        rules: {
            type: String,
        },
        subscribers: {
            type: [String],
            default: [],
        },
        subscribersCount: {
            type: Number,
            default: 0,
        },
        language: {
            type: String,
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    communityId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    code: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    subscribersCount: 1,
                },
            },
        ],
    }
);
