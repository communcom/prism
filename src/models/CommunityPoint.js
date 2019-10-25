const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'CommunityPoint',
    {
        issuer: {
            type: String,
            required: true,
        },
        communityId: {
            type: String,
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
        ],
    }
);
