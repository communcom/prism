const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;
const Logger = core.utils.Logger;

const ProfileModel = MongoDB.makeModel(
    'Profile',
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
        },
        personal: {
            avatarUrl: {
                type: String,
            },
            coverUrl: {
                type: String,
            },
            biography: {
                type: String,
            },
            contacts: {
                vkontakte: {
                    type: String,
                },
                facebook: {
                    type: String,
                },
                instagram: {
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
            type: [String],
            default: [],
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
