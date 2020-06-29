const { isNil } = require('lodash');
const { community } = require('commun-utils');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

const { patchRules } = require('../../utils/patchRules');
const CommunityModel = require('../../models/Community');
const CommunityPointModel = require('../../models/CommunityPoint');
const ProfileModel = require('../../models/Profile');
const BanModel = require('../../models/Ban');

// Менять соль нельзя, это приведет к расхождению в alias между призмами.
const SALT = 'AL1tsa3up0at';
const RESERVED_SYSTEM_ID = '$$system';

class Community {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async handleSettings({
        leaders_num: leadersNum,
        max_votes: maxVotes,
        // todo: after MVP
        // permission,
        // required_threshold,
        commun_code: communityId,
        community_name: name,
        collection_period: collectionPeriod,
        moderation_period: moderationPeriod,
        lock_period: lockPeriod,
        gems_per_day: gemsPerDay,
        rewarded_mosaic_num: rewardedMosaicNum,
        // todo: after MVP
        // opuses,
        // remove_opuses,
        min_lead_rating: minLeaderRating,
        emission_rate: emissionRate,
        leaders_percent: leadersPercent,
        author_percent: authorPercent,
    }) {
        const newSettings = {
            leadersNum,
            maxVotes,
            communityId,
            collectionPeriod,
            moderationPeriod,
            lockPeriod,
            gemsPerDay,
            rewardedMosaicNum,
            minLeaderRating,
            emissionRate,
            leadersPercent,
            authorPercent,
            name,
        };

        const updates = {
            settings: newSettings,
        };

        if (name) {
            updates.name = name;
        }

        const oldCommunityObject = await CommunityModel.findOneAndUpdate(
            { communityId },
            { $set: updates }
        );

        if (oldCommunityObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: CommunityModel,
                documentId: oldCommunityObject._id,
                data: {
                    $set: {
                        settings: oldCommunityObject.settings,
                        name: oldCommunityObject.name,
                    },
                },
            });
        }
    }

    async handleBanUnban(
        { commun_code: communityId, account: userId, leader: leaderUserId, reason },
        type
    ) {
        let changeMethod, revertMethod;

        if (type === 'ban') {
            changeMethod = '$addToSet';
            revertMethod = '$pull';
        } else {
            changeMethod = '$pull';
            revertMethod = '$addToSet';
        }

        const oldCommunityObject = await CommunityModel.findOneAndUpdate(
            { communityId },
            { [changeMethod]: { blacklist: userId } }
        );

        if (oldCommunityObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: CommunityModel,
                documentId: oldCommunityObject._id,
                data: {
                    [revertMethod]: {
                        blacklist: userId,
                    },
                },
            });
        }

        const newBanObject = await BanModel.create({
            userId,
            communityId,
            leaderUserId,
            reason,
            type,
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: BanModel,
            documentId: newBanObject._id,
        });
    }

    async handleHideUnhide({ commun_code: communityId, follower: userId }, type) {
        let changeMethod, revertMethod;

        if (type === 'hide') {
            changeMethod = '$addToSet';
            revertMethod = '$pull';
        } else {
            changeMethod = '$pull';
            revertMethod = '$addToSet';
        }

        const oldUserObject = await ProfileModel.findOneAndUpdate(
            { userId },
            { [changeMethod]: { 'blacklist.communityIds': communityId } }
        );

        if (oldUserObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: oldUserObject._id,
                data: {
                    [revertMethod]: {
                        'blacklist.communityIds': userId,
                    },
                },
            });
        }
    }

    async handleCreate({ community_name: originalName, commun_code: communityId }, { blockTime }) {
        const { alias, name, nameLower } = community.normalizeCommunityNames({
            communityId,
            name: originalName,
        });

        const point = await CommunityPointModel.findOne(
            {
                communityId: communityId,
            },
            {
                issuer: true,
            },
            {
                lean: true,
            }
        );

        if (!point) {
            Logger.error(`Community creation without created point: (${communityId}). Skipping`);
            return;
        }

        const newObject = await CommunityModel.create({
            communityId,
            issuer: point.issuer,
            alias,
            rules: [],
            name,
            nameLower,
            registrationTime: new Date(blockTime),
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunityModel,
            documentId: newObject._id,
        });
    }

    async handleAddInfo({
        commun_code: communityId,
        avatar_image: avatarUrl,
        cover_image: coverUrl,
        description,
        rules,
        language,
        subject,
    }) {
        const updates = {};
        let hasUpdate = false;

        if (!isNil(language)) {
            updates.language = language === 'eng' ? 'en' : language;
            hasUpdate = true;
        }

        if (!isNil(avatarUrl)) {
            updates.avatarUrl = avatarUrl;
            hasUpdate = true;
        }

        if (!isNil(coverUrl)) {
            updates.coverUrl = coverUrl;
            hasUpdate = true;
        }

        if (!isNil(description)) {
            updates.description = description;
            hasUpdate = true;
        }

        if (!isNil(subject)) {
            updates.subject = subject;
            hasUpdate = true;
        }

        if (!isNil(rules)) {
            const updatedRules = await this._tryToApplyPatchOrSet(communityId, rules);

            if (updatedRules) {
                updates.rules = updatedRules;
                hasUpdate = true;
            }
        }

        if (!hasUpdate) {
            return;
        }

        const oldObject = await CommunityModel.findOneAndUpdate(
            { communityId },
            {
                $set: updates,
            }
        );

        if (oldObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: CommunityModel,
                documentId: oldObject._id,
                data: {
                    $set: {
                        language: oldObject.language,
                        avatarUrl: oldObject.avatarUrl,
                        coverUrl: oldObject.coverUrl,
                        description: oldObject.description,
                        rules: oldObject.rules,
                        subject: oldObject.subject,
                    },
                },
            });
        }
    }

    async handleFollowUnfollow({ commun_code: communityId, follower: userId }, type) {
        let changeMethod, revertMethod, inc;

        const communityMatch = {
            communityId,
        };

        if (type === 'follow') {
            changeMethod = '$addToSet';
            revertMethod = '$pull';
            inc = 1;
            communityMatch.subscribers = { $ne: userId };
        } else {
            changeMethod = '$pull';
            revertMethod = '$addToSet';
            inc = -1;
            communityMatch.subscribers = userId;
        }

        const update = {
            [changeMethod]: { subscribers: userId },
            $inc: {
                subscribersCount: inc,
            },
        };
        const revert = {
            [revertMethod]: {
                subscribers: userId,
            },
            $inc: {
                subscribersCount: -inc,
            },
        };

        const oldCommunityObject = await CommunityModel.findOneAndUpdate(communityMatch, update);

        if (oldCommunityObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: CommunityModel,
                documentId: oldCommunityObject._id,
                data: revert,
            });
        }

        const oldProfileObject = await ProfileModel.findOneAndUpdate(
            { userId },
            {
                [changeMethod]: { 'subscriptions.communityIds': communityId },
                $inc: {
                    'subscriptions.communitiesCount': inc,
                },
            }
        );

        if (oldProfileObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: oldProfileObject._id,
                data: {
                    [changeMethod]: {
                        'subscriptions.communityIds': communityId,
                    },
                    $inc: { 'subscriptions.communitiesCount': -inc },
                },
            });
        }
    }

    async _tryToApplyPatchOrSet(communityId, rawRules) {
        let rules = null;

        try {
            rules = JSON.parse(rawRules);

            if (!rules) {
                return null;
            }

            if (Array.isArray(rules)) {
                return rules;
            }
        } catch (err) {
            Logger.warn('Rules parse failed:', rawRules, err);

            return [
                {
                    id: RESERVED_SYSTEM_ID,
                    title: rawRules,
                    text: '',
                },
            ];
        }

        const community = await CommunityModel.findOne(
            {
                communityId,
            },
            {
                _id: true,
                rules: true,
            },
            {
                lean: true,
            }
        );

        if (!community) {
            return null;
        }

        if (rules.type === 'patch') {
            return patchRules(community.rules, rules);
        }

        return null;
    }
}

module.exports = Community;
