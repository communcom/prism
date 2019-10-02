const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'TrashPost',
    {
        userId: {
            type: String,
            required: true,
        },
        permlink: {
            type: String,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                },
            },
        ],
    }
);
