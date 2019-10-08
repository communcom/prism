const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const CommunityModel = require('../../models/Community');

const baseProjection = {
    communityId: true,
    code: true,
    name: true,
    accountName: true,
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
                code: -1101,
                message: 'Community not found',
            };
        }

        return this._fixCommunity(community);
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

        let communities = await CommunityModel.aggregate(aggregation);

        communities = communities.map(community => this._fixCommunity(community));

        if (isQuerySubscriptions) {
            for (const community of communities) {
                community.isSubscribed = true;
            }
        }

        return {
            items: communities,
        };
    }

    _fixCommunity(community) {
        return {
            ...community,
            id: community.accountName || community.communityId,
            accountName: undefined,
            communityId: undefined,
        };
    }
}

module.exports = Community;
