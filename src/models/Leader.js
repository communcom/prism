const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Leader',
    {
        communityId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
        },
        url: {
            type: String,
            default: '',
        },
        rating: {
            type: String,
            default: '0',
        },
        ratingNum: {
            type: Number,
            default: 0,
        },
        votes: {
            type: [String],
            default: [],
        },
        votesCount: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        position: {
            type: Number,
            required: true,
        },
    },
    {
        index: [
            {
                // search for find leader aggregation
                fields: {
                    userId: 1,
                },
            },
            {
                // Search for change
                fields: {
                    communityId: 1,
                    userId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                // Leaders top
                fields: {
                    communityId: 1,
                    position: 1,
                    userId: 1,
                },
            },
            {
                // Detect votes
                fields: {
                    _id: 1,
                    votes: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    communityId: 1,
                    isActive: -1,
                    ratingNum: -1,
                    userId: 1,
                },
            },
            {
                fields: {
                    communityId: 1,
                    ratingNum: 1,
                },
            },
        ],
    }
);
