const contentIdType = {
    communityId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    permlink: {
        type: String,
        required: true,
    },
};

module.exports = {
    contentIdType,
};
