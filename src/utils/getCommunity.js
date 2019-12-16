const core = require('cyberway-core-service');
const { Logger } = core.utils;
const { mongoTypes } = core.services.MongoDB;
const { ObjectId } = mongoTypes;

const { addFieldIsIncludes } = require('./mongodb');
const CommunityModel = require('../models/Community');
const ProfileModel = require('../models/Profile');
const LeaderModel = require('../models/Leader');

const baseProjection = {
    _id: false,
    communityId: true,
    alias: true,
    name: true,
    avatarUrl: true,
    subscribersCount: true,
    leadersCount: true,
    language: true,
    isSubscribed: true,
    isBlocked: true,
    postsCount: true,
    registrationTime: true,
};

async function getCommunity(id, { userId: authUserId }) {
    const aggregation = [
        {
            $match: { _id: ObjectId(id) },
        },
    ];

    if (authUserId) {
        aggregation.push(
            addFieldIsIncludes({
                newField: 'isSubscribed',
                arrayPath: '$subscribers',
                value: authUserId,
            }),
            addFieldIsIncludes({
                newField: 'isBlocked',
                arrayPath: '$blacklist',
                value: authUserId,
            })
        );
    }

    aggregation.push({
        $project: {
            ...baseProjection,
            issuer: true,
            coverUrl: true,
            isSubscribed: true,
            isBlocked: true,
            subscribers: true,
        },
    });

    const [community] = await CommunityModel.aggregate(aggregation);

    if (authUserId) {
        const [, authLeader] = await Promise.all([
            ProfileModel.findOne(
                {
                    userId: authUserId,
                },
                { _id: false, subscriptions: true }
            ),
            LeaderModel.findOne(
                {
                    communityId: community.communityId,
                    userId: authUserId,
                },
                {
                    _id: false,
                    isActive: true,
                },
                {
                    lean: true,
                }
            ),
        ]);

        community.isLeader = Boolean(authLeader);
        community.isStoppedLeader = authLeader ? !authLeader.isActive : false;
    }

    delete community.subscribers;

    return community;
}

module.exports = { getCommunity };
