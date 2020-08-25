const core = require('cyberway-core-service');
const { Logger } = core.utils;
const ProfileModel = require('../models/Profile');
const { addFieldIsIncludes } = require('./mongodb');
const { mongoTypes } = core.services.MongoDB;
const { ObjectId } = mongoTypes;

const MESSENGERS = {
    TELEGRAM: 'telegram',
    WATSAPP: 'whatsApp',
    WECHAT: 'weChat',
};

const LINKS = {
    FACEBOOK: 'facebook',
    INSTAGRAM: 'instagram',
    LINKEDIN: 'linkedin',
    GITHUB: 'gitHub',
    TWITTER: 'twitter',
};

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

function processPersonalInfo(personal) {
    if (!personal) {
        return {};
    }

    const result = { defaultContacts: [], messengers: {}, links: {} };

    for (const key of Object.keys(personal)) {
        if (Object.values(MESSENGERS).includes(key)) {
            try {
                const messenger = JSON.parse(personal[key]);
                messenger.href = _makeContactLink(key, messenger.value);

                result.messengers[key] = messenger;

                if (messenger.default) {
                    result.defaultContacts.push(key);
                }
            } catch (err) {}
        } else if (Object.values(LINKS).includes(key)) {
            try {
                const link = JSON.parse(personal[key]);
                link.href = _makeContactLink(key, link.value);

                result.links[key] = link;
            } catch (err) {}
        } else {
            result[key] = personal[key];
        }
    }

    return result;
}

function _makeContactLink(contact, value) {
    switch (contact) {
        case MESSENGERS.TELEGRAM:
            return `https://t.me/${value}`;
        case MESSENGERS.WATSAPP:
            return `https://wa.me/${value}`;
        case LINKS.FACEBOOK:
            return `https://facebook.com/${value}`;
        case LINKS.INSTAGRAM:
            return `https://instagram.com/${value}`;
        case LINKS.GITHUB:
            return `https://github.com/${value}`;
        case LINKS.TWITTER:
            return `https://twitter.com/${value}`;
        case LINKS.LINKEDIN:
            return `https://linkedin.com/in/${value}`;
        default:
            return null;
    }
}

module.exports = {
    getProfile,
    processPersonalInfo,
};
