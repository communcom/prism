const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Community',
    {
        communityId: {
            type: String,
            required: true,
        },
        communityName: {
            type: String,
            required: true,
        },
        tokenName: {
            type: String,
            required: true,
        },
        ticker: {
            type: String,
        },
        avatar: {
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
                    subscribersCount: 1,
                },
            },
        ],
    }
);
