const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'LeaderProposal',
    {
        communityId: {
            type: String,
            required: true,
        },
        proposer: {
            type: String,
            required: true,
        },
        proposalId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['setInfo', 'banUser', 'unbanUser', 'banPost'],
            required: true,
        },
        contract: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        permission: {
            type: String,
            required: true,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        expiration: {
            type: Date,
            required: true,
        },
        executer: {
            type: String,
        },
        isExecuted: {
            type: Boolean,
            required: true,
        },
        executedBlockTime: {
            type: Date,
        },
        data: {
            type: Object,
        },
        approves: {
            type: [
                {
                    type: String,
                },
            ],
            required: true,
        },
        contentType: {
            type: String,
        },
        isExpired: {
            type: Boolean,
            default: false,
        },
    },
    {
        index: [
            {
                fields: {
                    communityId: 1,
                    isExecuted: -1,
                    blockTime: -1,
                },
            },
            {
                fields: {
                    communityId: 1,
                    proposer: 1,
                    proposalId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    proposer: 1,
                    proposalId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    communityId: 1,
                    'data.message_id.author': 1,
                    'data.message_id.permlink': 1,
                },
            },
        ],
    }
);
