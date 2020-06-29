const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'TopFeedBlacklistCommunities',
    {
        communityId: {
            type: String,
            required: true,
        },
    },
    {
        index: [
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
