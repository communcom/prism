const core = require('gls-core-service');
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

MongoDB.mongoose.connection
    .createCollection('CommunUsers', {
        viewOn: 'profiles',
        pipeline: [
            {
                $match: {
                    username: { $exists: true },
                },
            },
        ],
    })
    .then(() => Logger.log('CommunUsers view has been created'))
    .catch(e => Logger.error('Error during CommunUsers view creation:', e));

module.exports = ProfileModel;
