const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const CommunityModel = require('../../models/Community');

const baseProjection = {
    _id: false,
    communityId: true,
    alias: true,
    name: true,
    avatarUrl: true,
    subscribersCount: true,
    language: true,
    isSubscribed: true,
};

class Community extends BasicController {
    async getCommunity({ userId, communityId }, { userId: authUserId }) {
        const aggregation = [
            {
                $match: { communityId },
            },
        ];

        if (authUserId) {
            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscribers', authUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                },
            });
        }

        aggregation.push({
            $project: {
                ...baseProjection,
                coverUrl: true,
                description: true,
                rules: true,
                isSubscribed: true,
            },
        });

        const community = (await CommunityModel.aggregate(aggregation))[0];

        if (!community) {
            throw {
                code: 404,
                message: 'Community not found',
            };
        }

        return community;
    }

    async getCommunities({ type, userId, limit, offset }, { userId: authUserId }) {
        const query = {};
        let isQuerySubscriptions = false;

        if (type === 'user') {
            query.subscribers = userId;
            isQuerySubscriptions = authUserId === userId;
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

        if (authUserId && !isQuerySubscriptions) {
            aggregation.push({
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscribers', authUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                },
            });
        }

        aggregation.push({
            $project: baseProjection,
        });

        const communities = await CommunityModel.aggregate(aggregation);

        if (isQuerySubscriptions) {
            for (const community of communities) {
                community.isSubscribed = true;
            }
        }

        return {
            items: communities,
        };
    }
}

module.exports = Community;
