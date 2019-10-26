const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Report',
    {
        contentId: {
            userId: {
                type: String,
                required: true,
            },
            permlink: {
                type: String,
                required: true,
            },
            communityId: {
                type: String,
                required: true,
            },
        },
        reports: [
            {
                reporter: {
                    type: String,
                    required: true,
                },
                reason: {
                    type: String,
                    required: true,
                },
            },
        ],
        reportsCount: {
            type: Number,
            default: 0,
        },
        contentType: {
            type: String,
            enum: ['post', 'comment'],
        },
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
        },
    },
    {
        schema: {
            strict: false,
        },
        index: [
            {
                fields: {},
            },
        ],
    }
);
