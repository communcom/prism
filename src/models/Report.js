const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

const { contentIdType } = require('./common');

module.exports = MongoDB.makeModel(
    'Report',
    {
        contentId: contentIdType,
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
            required: true,
            default: 0,
        },
        contentType: {
            type: String,
            enum: ['post', 'comment'],
            required: true,
        },
        status: {
            type: String,
            enum: ['open', 'closed', 'archive'],
            required: true,
            default: 'open',
        },
        proposalId: {
            type: String,
        },
        tracery: {
            type: String,
        },
    },
    {
        schema: {
            strict: false,
        },
        index: [
            {
                fields: {
                    userId: 1,
                    permlink: 1,
                    communityId: 1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
