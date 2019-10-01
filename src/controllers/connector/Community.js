const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const CommunityModel = require('../../models/Community');

class Community extends BasicController {
    async getCommunity({ requestedUserId, communityId }) {
        const community = (await CommunityModel.aggregate([
            {
                $match: { communityId },
            },
            {
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscribers', requestedUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                },
            },
            {
                $project: {
                    subscribers: false,
                    _id: false,
                    __v: false,
                    createdAt: false,
                    updatedAt: false,
                },
            },
        ]))[0];

        if (!community) {
            throw {
                code: -1101,
                message: 'Community not found',
            };
        }

        return community;
    }

    async getCommunities({ requestedUserId, limit, offset }) {
        const communities = await CommunityModel.aggregate([
            { $match: {} },
            {
                $skip: offset,
            },
            {
                $limit: limit,
            },
            { $sort: { subscribersCount: -1 } },
            {
                $addFields: {
                    isSubscribed: {
                        $cond: {
                            if: {
                                $eq: [
                                    -1,
                                    {
                                        $indexOfArray: ['$subscribers', requestedUserId],
                                    },
                                ],
                            },
                            then: false,
                            else: true,
                        },
                    },
                },
            },
            {
                $project: {
                    subscribers: false,
                    _id: false,
                    __v: false,
                    createdAt: false,
                    updatedAt: false,
                    rules: false,
                    description: false,
                },
            },
        ]);

        return { communities };
    }
}

module.exports = Community;
