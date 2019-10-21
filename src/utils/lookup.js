const CommunityModel = require('../models/Community');
const ProfileModel = require('../models/Profile');

async function isCommunityExists(communityId) {
    return Boolean(await CommunityModel.findOne({ communityId }, { _id: true }));
}

async function lookupCommunityByAlias(alias) {
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

async function lookupUserIdByUsername(username) {
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

async function lookupUsernameByUserId(userId) {
    const profile = await ProfileModel.findOne(
        {
            userId,
        },
        {
            username: true,
        },
        {
            lean: true,
        }
    );

    if (!profile) {
        return null;
    }

    return profile.username;
}

async function normalizeContentId(params) {
    let { communityId, communityAlias, userId, username, permlink } = params;

    if (!permlink || (!userId && !username)) {
        throw {
            code: 409,
            message: 'Invalid params',
        };
    }

    if (!userId) {
        userId = await lookupUserIdByUsername(username);
    }

    if (!userId) {
        throw {
            code: 404,
            message: 'Content not found',
        };
    }

    communityId = await resolveCommunityId({ communityId, communityAlias });

    return {
        communityId,
        userId,
        permlink,
    };
}

async function resolveCommunityId({ communityId, communityAlias }) {
    if (!communityId && !communityAlias) {
        throw {
            code: 409,
            message: 'Invalid params',
        };
    }

    if (!communityId) {
        communityId = await lookupCommunityByAlias(communityAlias);
    }

    if (!communityId) {
        throw {
            code: 404,
            message: 'Community is not found',
        };
    }

    return communityId;
}

module.exports = {
    isCommunityExists,
    resolveCommunityId,
    lookupCommunityByAlias,
    lookupUserIdByUsername,
    lookupUsernameByUserId,
    normalizeContentId,
};
