const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Ban',
    {
        type: {
            type: {
                type: String,
                enum: ['ban', 'unban'],
            },
        },
        userId: {
            type: String,
        },
        leaderUserId: {
            type: String,
        },
        communityId: {
            type: String,
        },
        reason: {
            type: String,
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    userId: 1,
                    communityId: 1,
                    createdAt: -1,
                },
            },
        ],
    }
);
