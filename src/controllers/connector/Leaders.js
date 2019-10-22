const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const { isIncludes } = require('../../utils/mongodb');
const LeaderModel = require('../../models/Leader');

class Leaders extends BasicController {
    async getTop({ communityId, limit, offset, prefix }, { userId }) {
        const queryText = prefix ? prefix.trim() : null;
        const isSearching = Boolean(queryText);

        const offsetLimit = [
            offset
                ? {
                      $skip: offset,
                  }
                : null,
            {
                $limit: limit,
            },
        ];

        const leaders = await LeaderModel.aggregate(
            [
                {
                    $match: {
                        communityId,
                    },
                },
                {
                    $sort: {
                        position: 1,
                    },
                },
                ...(isSearching ? [] : offsetLimit),
                userId
                    ? isIncludes({
                          newField: 'isVoted',
                          arrayPath: '$votes',
                          value: userId,
                      })
                    : null,
                {
                    $lookup: {
                        from: 'profiles',
                        localField: 'userId',
                        foreignField: 'userId',
                        as: 'profile',
                    },
                },
                {
                    $project: {
                        _id: false,
                        userId: true,
                        username: { $arrayElemAt: ['$profile.username', 0] },
                        avatarUrl: { $arrayElemAt: ['$profile.avatarUrl', 0] },
                        position: true,
                        rating: true,
                        isVoted: true,
                    },
                },
                ...(isSearching
                    ? [
                          {
                              $match: {
                                  username: {
                                      $regex: `^${queryText}`,
                                  },
                              },
                          },
                          ...offsetLimit,
                      ]
                    : []),
            ].filter(part => part)
        );

        return {
            items: leaders,
        };
    }

    async getProposals() {
        throw {
            code: -100,
            message: 'Method not ready yet',
        };
    }
}

module.exports = Leaders;
