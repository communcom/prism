const core = require('cyberway-core-service');
const { MongoDB } = core.services;

const ProfileModel = MongoDB.makeModel(
    'Profile',
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
        },
        avatarUrl: {
            type: String,
        },
        coverUrl: {
            type: String,
        },
        personal: {
            biography: {
                type: String,
            },
            facebook: {
                type: String,
            },
            telegram: {
                type: String,
            },
            whatsApp: {
                type: String,
            },
            weChat: {
                type: String,
            },
            firstName: {
                type: String,
            },
            lastName: {
                type: String,
            },
            country: {
                type: String,
            },
            city: {
                type: String,
            },
            birthDate: {
                type: Date,
            },
            instagram: {
                type: String,
            },
            linkedin: {
                type: String,
            },
            twitter: {
                type: String,
            },
            gitHub: {
                type: String,
            },
            websiteUrl: {
                type: String,
            },
        },
        subscriptions: {
            userIds: {
                type: [String],
                default: [],
            },
            usersCount: {
                type: Number,
                default: 0,
            },
            communityIds: {
                type: [String],
                default: [],
            },
            communitiesCount: {
                type: Number,
                default: 0,
            },
        },
        subscribers: {
            userIds: {
                type: [String],
                default: [],
            },
            usersCount: {
                type: Number,
                default: 0,
            },
            communityIds: {
                type: [String],
                default: [],
            },
            communitiesCount: {
                type: Number,
                default: 0,
            },
        },
        blacklist: {
            userIds: {
                type: [String],
                default: [],
            },
            communityIds: {
                type: [String],
                default: [],
            },
        },
        registration: {
            time: {
                type: Date,
            },
        },
        stats: {
            reputation: {
                type: Number,
                default: 0,
            },
            postsCount: {
                type: Number,
                default: 0,
            },
            commentsCount: {
                type: Number,
                default: 0,
            },
        },
        leaderIn: {
            type: [String],
            default: [],
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    username: 1,
                },
            },
        ],
    }
);

module.exports = ProfileModel;
