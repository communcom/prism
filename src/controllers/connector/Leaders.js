const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const { addFieldIsIncludes } = require('../../utils/mongodb');
const LeaderModel = require('../../models/Leader');

class Leaders extends BasicController {
    async getLeaders({ communityId, limit, offset, prefix }, { userId }) {
        const queryText = prefix ? prefix.trim() : null;
        const isSearching = Boolean(queryText);

        const offsetLimit = [
            {
                $skip: offset,
            },
            {
                $limit: limit,
            },
        ];

        const totalRating = await this.getCommunityTotalRating(communityId);

        const aggregation = [];

        aggregation.push(
            {
                $match: {
                    communityId,
                },
            },
            {
                $sort: {
                    position: 1,
                    userId: 1,
                },
            }
        );

        if (!isSearching) {
            aggregation.push(...offsetLimit);
        }

        if (userId) {
            aggregation.push(
                addFieldIsIncludes({
                    newField: 'isVoted',
                    arrayPath: '$votes',
                    value: userId,
                })
            );
        }

        aggregation.push(
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'profiles',
                },
            },
            {
                $project: {
                    userId: true,
                    profile: { $arrayElemAt: ['$profiles', 0] },
                    url: true,
                    position: true,
                    rating: true,
                    isVoted: true,
                    isActive: true,
                    ratingPercent: totalRating
                        ? {
                              $divide: ['$ratingNum', totalRating],
                          }
                        : { $literal: 0 },
                },
            }
        );

        if (isSearching) {
            aggregation.push(
                {
                    $match: {
                        'profile.username': {
                            $regex: `^${queryText}`,
                        },
                    },
                },
                ...offsetLimit
            );
        }

        if (userId) {
            aggregation.push(
                addFieldIsIncludes({
                    newField: 'isSubscribed',
                    arrayPath: '$profile.subscribers.userIds',
                    value: userId,
                })
            );
        }

        aggregation.push({
            $project: {
                _id: false,
                userId: true,
                url: true,
                position: true,
                rating: true,
                ratingPercent: true,
                isActive: true,
                isVoted: true,
                isSubscribed: true,
                username: '$profile.username',
                avatarUrl: '$profile.avatarUrl',
            },
        });

        const leaders = await LeaderModel.aggregate(aggregation);

        for (const item of leaders) {
            if (!item.username) {
                item.username = null;
            }

            if (!item.avatarUrl) {
                item.avatarUrl = null;
            }

            if (item.rating) {
                item.rating /= 1000;
            } else {
                item.rating = 0;
            }
        }

        return {
            items: leaders,
        };
    }

    async getCommunityTotalRating(communityId) {
        const [result] = await LeaderModel.aggregate([
            {
                $match: {
                    communityId,
                },
            },
            {
                $group: {
                    _id: 1,
                    totalRating: { $sum: '$ratingNum' },
                },
            },
        ]);

        if (!result) {
            return null;
        }

        return result.totalRating;
    }

    async getLeaderCommunities({ offset, limit }, { userId }) {
        if (!userId) {
            throw {
                code: 401,
                message: 'Unauthorized',
            };
        }

        const items = await LeaderModel.aggregate([
            {
                $match: {
                    userId,
                },
            },
            {
                $skip: offset,
            },
            {
                $limit: limit,
            },
            {
                $lookup: {
                    from: 'communities',
                    localField: 'communityId',
                    foreignField: 'communityId',
                    as: 'community',
                },
            },
            {
                $project: {
                    'community.communityId': true,
                    'community.alias': true,
                    'community.issuer': true,
                    'community.avatarUrl': true,
                    'community.name': true,
                    'community.subscribersCount': true,
                },
            },
        ]);

        return {
            items: items.map(({ community }) => community),
        };
    }
}

module.exports = Leaders;
