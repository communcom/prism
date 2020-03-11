const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Fork',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        blockSequence: {
            type: Number,
            required: true,
        },
        finalized: {
            type: Boolean,
            required: true,
        },
        stack: {
            type: [
                {
                    type: {
                        type: String,
                        enum: ['swap', 'update', 'create', 'remove', 'reorderLeaders'],
                        required: true,
                    },
                    className: {
                        type: String,
                    },
                    documentId: {
                        type: MongoDB.mongoTypes.ObjectId,
                    },
                    data: {
                        type: Object,
                    },
                    meta: {
                        type: Object,
                    },
                },
            ],
        },
    },
    {
        index: [
            {
                fields: {
                    blockNum: -1,
                },
                options: {
                    unique: true,
                },
            },
        ],
    }
);
