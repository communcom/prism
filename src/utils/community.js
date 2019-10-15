const CommunityModel = require('../models/Community');
const ProfileModel = require('../models/Profile');

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

async function lookUpUserIdByUsername(username) {
    const profile = await ProfileModel.findOne(
        {
            username,
        },
        {
            userId: true,
        },
        {
            lean: true,
        }
    );

    if (!profile) {
        return null;
    }

    return profile.userId;
}

async function normalizeContentId(params) {
    let { communityId, communityAlias, userId, username, permlink } = params;

    if (!permlink || (!userId && !username) || (!communityId && !communityAlias)) {
        throw {
            code: 409,
            message: 'Invalid params',
        };
    }

    if (!communityId) {
        communityId = await lookUpCommunityByAlias(communityAlias);
    }

    if (!userId) {
        userId = await lookUpUserIdByUsername(username);
    }

    if (!communityId || !userId) {
        throw {
            code: 404,
            message: 'Content not found',
        };
    }

    return {
        communityId,
        userId,
        permlink,
    };
}

async function fixCommunityId({ communityId, communityAlias }) {
    if (!communityId && !communityAlias) {
        throw {
            code: 409,
            message: 'Invalid params',
        };
    }

    if (!communityId) {
        communityId = await lookUpCommunityByAlias(communityAlias);
    }

    if (!communityId) {
        throw {
            code: 404,
            message: 'Community not found',
        };
    }

    return communityId;
}

module.exports = {
    isCommunityExists,
    lookUpCommunityByAlias,
    lookUpUserIdByUsername,
    normalizeContentId,
    fixCommunityId,
};
