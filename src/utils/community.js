const CommunityModel = require('../models/Community');

async function isCommunityExists(communityId) {
    return Boolean(await CommunityModel.findOne({ communityId }, { _id: true }));
}

async function lookUpCommunityByAlias(alias) {
    const community = await CommunityModel.findOne(
        {
            alias,
        },
        {
            communityId: true,
        },
        {
            lean: true,
        }
    );

    if (!community) {
        return null;
    }

    return community.communityId;
}

module.exports = {
    isCommunityExists,
    lookUpCommunityByAlias,
};
