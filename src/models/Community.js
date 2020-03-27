const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Community',
    {
        communityId: {
            type: String,
            required: true,
        },
        issuer: {
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
        nameLower: {
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
            type: [
                {
                    id: {
                        type: String,
                        required: true,
                    },
                    title: {
                        type: String,
                        required: true,
                    },
                    text: {
                        type: String,
                        required: true,
                    },
                },
            ],
            required: true,
        },
        subscribers: {
            type: [String],
            default: [],
        },
        subscribersCount: {
            type: Number,
            default: 0,
        },
        leadersCount: {
            type: Number,
            default: 0,
        },
        language: {
            type: String,
            default: 'en',
        },
        blacklist: {
            type: [String],
        },
        settings: {
            type: Object,
        },
        postsCount: {
            type: Number,
            default: 0,
        },
        registrationTime: {
            type: Date,
            required: true,
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
                    name: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    nameLower: 1,
                },
            },
            {
                fields: {
                    subscribersCount: 1,
                    language: 1,
                },
            },
        ],
    }
);
