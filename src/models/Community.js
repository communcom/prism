const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Community',
    {
        communityId: {
            type: String,
            required: true,
        },
        alias: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        avatarUrl: {
            type: String,
        },
        coverUrl: {
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
        blacklist: {
            type: [String],
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
                    alias: 1,
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
