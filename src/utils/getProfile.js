const core = require('cyberway-core-service');
const { Logger } = core.utils;
const ProfileModel = require('../models/Profile');
const { addFieldIsIncludes } = require('./mongodb');
const { mongoTypes } = core.services.MongoDB;
const { ObjectId } = mongoTypes;

async function getProfile(id, { userId: authUserId }) {
    const filter = { _id: ObjectId(id) };

    const projection = {
        _id: false,
        stats: true,
        leaderIn: true,
        userId: true,
        username: true,
        avatarUrl: true,
        coverUrl: true,
        registration: true,
        personal: true,
        'subscriptions.communitiesCount': true,
        'subscriptions.usersCount': true,
        'subscribers.usersCount': true,
        isSubscribed: true,
        isSubscription: true,
        isBlocked: true,
    };

    const aggregation = [{ $match: filter }];

    if (authUserId) {
        aggregation.push(
            addFieldIsIncludes({
                newField: 'isSubscribed',
                arrayPath: '$subscribers.userIds',
                value: authUserId,
            }),
            addFieldIsIncludes({
                newField: 'isSubscription',
                arrayPath: '$subscriptions.userIds',
                value: authUserId,
            }),
            addFieldIsIncludes({
                newField: 'isBlocked',
                arrayPath: '$blacklist.userIds',
                value: authUserId,
            })
        );
    }

    aggregation.push({ $project: projection });

    const [resultUser] = await ProfileModel.aggregate(aggregation);

    if (resultUser) {
        resultUser.personal = resultUser.personal || {};
        resultUser.personal.avatarUrl = resultUser.avatarUrl;
        resultUser.personal.coverUrl = resultUser.coverUrl;
    }

    return resultUser;
}

module.exports = {
    getProfile,
};
