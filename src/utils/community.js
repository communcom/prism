const CommunityModel = require('../models/Community');

async function lookUpCommunity(communityCode) {
    return Boolean(await CommunityModel.findOne({ communityCode }, { _id: true }));
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
            communityCode: true,
        },
        {
            lean: true,
        }
    );

    if (!community) {
        return null;
    }

    return community.communityCode;
}

module.exports = {
    lookUpCommunityCode,
    lookUpCommunity,
};
