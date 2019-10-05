const CommunityModel = require('../models/Community');

async function lookUpCommunity(code) {
    return Boolean(await CommunityModel.findOne({ code }, { _id: true }));
}

async function lookUpCommunityCode(communityId) {
    const community = await CommunityModel.findOne(
        {
            $or: [
                {
                    communityId,
                },
                {
                    accountName: communityId,
                },
            ],
        },
        {
            code: true,
        },
        {
            lean: true,
        }
    );

    if (!community) {
        return null;
    }

    return community.code;
}

module.exports = {
    lookUpCommunityCode,
    lookUpCommunity,
};
