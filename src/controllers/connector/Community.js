const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const { addFieldIsIncludes } = require('../../utils/mongodb');
const { resolveCommunityId } = require('../../utils/lookup');
const {
    KAVA_SPECIAL_SORTED_COMMUNITIES,
    DANK_MEME_SPECIAL_SORTED_COMMUNITIES,
} = require('../../data/constants');
const CommunityModel = require('../../models/Community');
const ProfileModel = require('../../models/Profile');
const LeaderModel = require('../../models/Leader');
const BanModel = require('../../models/Ban');

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

const FRIEND_SUBSCRIBERS_LIMIT = 5;

class Community extends BasicController {
    async isInCommunityBlacklist({ userId, communityId }) {
        const community = await this.getCommunity({ communityId }, { userId });
        if (!community) {
            return false;
        }

        return community.isBlocked;
    }

    async getCommunityBanHistory({ communityId, communityAlias, userId, limit, offset }) {
        communityId = await resolveCommunityId({ communityId, communityAlias });

        const filter = { communityId };
        if (userId) {
            filter.userId = userId;
        }

        const items = await BanModel.find(
            filter,
            {
                _id: false,
                type: true,
                userId: true,
                leaderUserId: true,
                communityId: true,
                reason: true,
            },
            { lean: true }
        )
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit);

        return { items };
    }

    async getSettings({ communityId, communityAlias }) {
        communityId = await resolveCommunityId({ communityId, communityAlias });
        const { settings } = await CommunityModel.findOne(
            { communityId },
            { settings: true, _id: false },
            { lean: true }
        );

        if (!settings) {
            throw {
                code: 404,
                message: 'Community is not found',
            };
        }

        return { settings };
    }

    async getCommunityBlacklist({ communityId, communityAlias, offset, limit }) {
        communityId = await resolveCommunityId({ communityId, communityAlias });

        const match = { $match: { communityId } };

        const communityProjection = {
            $project: {
                _id: false,
                userId: '$blacklist',
            },
        };

        const unwindUserIds = {
            $unwind: {
                path: '$userId',
            },
        };

        const paging = [
            {
                $skip: offset,
            },
            {
                $limit: limit,
            },
        ];

        const profileLookup = {
            $lookup: {
                from: 'profiles',
                localField: 'userId',
                foreignField: 'userId',
                as: 'profile',
            },
        };

        const unwindProfiles = {
            $unwind: {
                path: '$profile',
            },
        };

        const profileProjection = {
            $project: {
                userId: true,
                username: '$profile.username',
                avatarUrl: '$profile.avatarUrl',
            },
        };

        const aggregation = [
            match,
            communityProjection,
            unwindUserIds,
            ...paging,
            profileLookup,
            unwindProfiles,
            profileProjection,
        ];

        const items = await CommunityModel.aggregate(aggregation);

        return { items };
    }

    async getCommunity({ communityId, communityAlias }, { userId: authUserId }) {
        communityId = await resolveCommunityId({ communityId, communityAlias });
        const match = { communityId };

        const aggregation = [
            {
                $match: match,
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
                description: true,
                rules: true,
                isSubscribed: true,
                isBlocked: true,
                subscribers: true,
            },
        });

        const [community] = await CommunityModel.aggregate(aggregation);

        if (!community) {
            throw {
                code: 404,
                message: 'Community is not found',
            };
        }

        if (authUserId) {
            const [authUser, authLeader] = await Promise.all([
                ProfileModel.findOne(
                    {
                        userId: authUserId,
                    },
                    { _id: false, subscriptions: true, blacklist: true }
                ),
                LeaderModel.findOne(
                    {
                        communityId,
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

            if (authUser) {
                const friendsSubscribers = authUser.subscriptions.userIds.filter(friend =>
                    community.subscribers.includes(friend)
                );

                community.friendsCount = friendsSubscribers.length;

                const resolveSubscribersPromises = [];

                for (
                    let i = 0;
                    i < FRIEND_SUBSCRIBERS_LIMIT && i < friendsSubscribers.length;
                    i++
                ) {
                    resolveSubscribersPromises.push(
                        ProfileModel.findOne(
                            { userId: friendsSubscribers[i] },
                            {
                                userId: true,
                                username: true,
                                avatarUrl: true,
                                _id: false,
                            },
                            { lean: true }
                        )
                    );
                }

                community.friends = await Promise.all(resolveSubscribersPromises);

                community.isInBlacklist = authUser.blacklist.communityIds.includes(communityId);
            }

            community.isLeader = Boolean(authLeader);
            community.isStoppedLeader = authLeader ? !authLeader.isActive : false;
        }

        delete community.subscribers;

        return community;
    }

    async getCommunities(
        {
            type,
            userId,
            search,
            limit,
            offset,
            excludeMySubscriptions,
            allowedLanguages,
            sortingToken,
            forceQuery,
        },
        { userId: authUserId },
        { clientType }
    ) {
        let specialSortedCommunities = [];
        if (sortingToken && offset === 0) {
            specialSortedCommunities = (await this.getCommunities(
                {
                    type,
                    userId,
                    search,
                    limit,
                    offset,
                    forceQuery: this._getSortingTokenQuery(sortingToken),
                },
                { userId: authUserId },
                { clientType }
            )).items;

            offset = specialSortedCommunities.length;
        }

        let query = {};
        let forceIsSubscribed = null;

        if (forceQuery) {
            query = forceQuery;
        } else {
            if (clientType !== 'web') {
                query.$and = [{ communityId: { $ne: 'PORN' } }, { communityId: { $ne: 'NSFW' } }];
            }

            if (search) {
                query.nameLower = { $regex: `^${escape(search.trim().toLowerCase())}` };
            }

            if (allowedLanguages.length > 0 && !allowedLanguages.includes('all')) {
                query.$and = query.$and || [];
                query.$and.push({ language: { $in: allowedLanguages } });
            }

            if (type === 'user') {
                query.subscribers = userId;

                if (authUserId === userId) {
                    forceIsSubscribed = true;
                }
            } else if (excludeMySubscriptions && authUserId) {
                query.subscribers = {
                    $ne: authUserId,
                };
                forceIsSubscribed = false;
            }
        }

        const aggregation = [
            {
                $match: query,
            },
            {
                $skip: offset,
            },
            {
                $limit: limit,
            },
            {
                $sort: { subscribersCount: -1 },
            },
        ];

        if (authUserId) {
            if (forceIsSubscribed === null) {
                aggregation.push(
                    addFieldIsIncludes({
                        newField: 'isSubscribed',
                        arrayPath: '$subscribers',
                        value: authUserId,
                    })
                );
            }

            aggregation.push(
                addFieldIsIncludes({
                    newField: 'isBlocked',
                    arrayPath: '$blacklist',
                    value: authUserId,
                })
            );
        }

        aggregation.push({
            $project: baseProjection,
        });

        let communities = await CommunityModel.aggregate(aggregation);

        if (forceIsSubscribed !== null) {
            for (const community of communities) {
                community.isSubscribed = forceIsSubscribed;
            }
        }

        if (authUserId) {
            const authUser = await ProfileModel.findOne(
                { userId: authUserId },
                { blacklist: true, _id: false },
                { lean: true }
            );

            if (authUser) {
                for (const community of communities) {
                    community.isInBlacklist = authUser.blacklist.communityIds.includes(
                        community.communityId
                    );
                }
            }
        }

        communities = [
            ...this._finalizeSortingByToken({
                sortingToken,
                communities: specialSortedCommunities,
            }),
            ...communities,
        ];

        return {
            items: this._excludeDuplicates(communities),
        };
    }

    _getSortingTokenQuery(sortingToken) {
        switch (sortingToken) {
            case 'kava':
                return { communityId: { $in: KAVA_SPECIAL_SORTED_COMMUNITIES } };
            case 'dankmeme':
                return { communityId: { $in: DANK_MEME_SPECIAL_SORTED_COMMUNITIES } };
            default:
                return {};
        }
    }

    _finalizeSortingByToken({ sortingToken, communities }) {
        switch (sortingToken) {
            case 'kava':
                return communities.sort((communityOne, communityTwo) => {
                    const kavaIndexOne = KAVA_SPECIAL_SORTED_COMMUNITIES.indexOf(
                        communityOne.communityId
                    );
                    const kavaIndexTwo = KAVA_SPECIAL_SORTED_COMMUNITIES.indexOf(
                        communityTwo.communityId
                    );

                    if (kavaIndexOne < 0) {
                        return -1;
                    }
                    if (kavaIndexTwo < 0) {
                        return -1;
                    }

                    return kavaIndexOne - kavaIndexTwo;
                });
                break;
            case 'dankmeme':
                return communities.sort((communityOne, communityTwo) => {
                    const dankmemeIndexOne = DANK_MEME_SPECIAL_SORTED_COMMUNITIES.indexOf(
                        communityOne.communityId
                    );
                    const dankmemeIndexTwo = DANK_MEME_SPECIAL_SORTED_COMMUNITIES.indexOf(
                        communityTwo.communityId
                    );

                    if (dankmemeIndexOne < 0) {
                        return -1;
                    }
                    if (dankmemeIndexTwo < 0) {
                        return -1;
                    }

                    return dankmemeIndexOne - dankmemeIndexTwo;
                });
                break;
            default:
                return communities;
        }
    }

    _excludeDuplicates(communities) {
        const nonDuplicates = [];
        const nonDuplicatesIds = [];
        for (const community of communities) {
            if (!nonDuplicatesIds.includes(community.communityId)) {
                nonDuplicates.push(community);
                nonDuplicatesIds.push(community.communityId);
            }
        }

        return nonDuplicates;
    }
}

module.exports = Community;
