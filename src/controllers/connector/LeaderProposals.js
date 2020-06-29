const { isNil } = require('lodash');
const core = require('cyberway-core-service');
const { Logger } = core.utils;
const BasicController = core.controllers.Basic;

const ProfileModel = require('../../models/Profile');
const LeaderModel = require('../../models/Leader');
const LeaderProposalModel = require('../../models/LeaderProposal');
const { isIncludes } = require('../../utils/mongodb');

const APPROVES_THRESHOLD = {
    'lead.smajor': 3,
    'lead.major': 3,
    'lead.minor': 2,
};

class LeaderProposals extends BasicController {
    async getBanPostProposal(contentId, { userId }) {
        const { items } = await this._getProposals(
            [
                {
                    $match: {
                        communityId: contentId.communityId,
                        'data.message_id.author': contentId.userId,
                        'data.message_id.permlink': contentId.permlink,
                    },
                },
                {
                    $limit: 1,
                },
            ],
            userId
        );

        const [proposal] = items;

        if (!proposal) {
            throw {
                code: 404,
                message: 'Proposal is not found',
            };
        }

        return {
            proposal,
        };
    }

    async getProposal({ proposer, proposalId, communityId }, { userId }) {
        const { items } = await this._getProposals(
            [
                {
                    $match: {
                        communityId,
                        proposer,
                        proposalId,
                    },
                },
                {
                    $limit: 1,
                },
            ],
            userId
        );

        const [proposal] = items;

        if (!proposal) {
            throw {
                code: 404,
                message: 'Proposal is not found',
            };
        }

        return {
            proposal,
        };
    }

    async getProposals({ communityIds, limit, offset, types }, { userId }) {
        if (!communityIds) {
            const profile = await ProfileModel.findOne(
                { userId },
                { _id: false, leaderIn: true },
                { lean: true }
            );

            if (!profile) {
                throw {
                    code: 404,
                    message: 'Profile is not found',
                };
            }

            communityIds = profile.leaderIn;
        }

        const match = {
            communityId: {
                $in: communityIds,
            },
            isExecuted: false,
        };

        if (!types.includes('all')) {
            match.type = { $in: types };
        }

        const { items, proposalsCount } = await this._getProposals(
            [
                {
                    $match: match,
                },
                {
                    $sort: {
                        blockTime: -1,
                    },
                },
                {
                    $skip: offset,
                },
                {
                    $limit: limit,
                },
            ],
            userId
        );

        return {
            items,
            proposalsCount,
        };
    }

    async _getProposals(aggregate, userId) {
        const projection = {
            _id: false,
            proposer: true,
            proposalId: true,
            type: true,
            contract: true,
            action: true,
            permission: true,
            blockTime: true,
            expiration: true,
            data: true,
            approves: true,
            contentType: true,
            proposerProfile: {
                $let: {
                    vars: {
                        proposer: { $arrayElemAt: ['$proposerProfile', 0] },
                    },
                    in: {
                        userId: '$$proposer.userId',
                        username: '$$proposer.username',
                        avatarUrl: '$$proposer.avatarUrl',
                    },
                },
            },
            community: {
                $let: {
                    vars: {
                        community: { $arrayElemAt: ['$community', 0] },
                    },
                    in: {
                        communityId: '$$community.communityId',
                        alias: '$$community.alias',
                        name: '$$community.name',
                        avatarUrl: '$$community.avatarUrl',
                        coverUrl: '$$community.coverUrl',
                        description: '$$community.description',
                        rules: '$$community.rules',
                    },
                },
            },
        };

        if (userId) {
            projection.isApproved = isIncludes('$approves', userId);
        }

        const match = aggregate.shift();

        const [result] = await LeaderProposalModel.aggregate([
            match,
            {
                $facet: {
                    items: [
                        ...aggregate,
                        {
                            $lookup: {
                                from: 'profiles',
                                localField: 'proposer',
                                foreignField: 'userId',
                                as: 'proposerProfile',
                            },
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
                            $project: projection,
                        },
                    ],
                    meta: [{ $count: 'count' }],
                },
            },
        ]);

        const { items, meta } = result;

        if (!items.length) {
            return { items: [] };
        }

        const leaderIds = new Set();

        for (const item of items) {
            for (const leaderId of item.approves) {
                leaderIds.add(leaderId);
            }
        }

        const leaders = await LeaderModel.find(
            {
                userId: { $in: [...leaderIds] },
                inTop: true,
            },
            { _id: false, userId: true },
            { lean: true }
        );

        const leadersInTop = new Set(leaders.map(leader => leader.userId));

        for (const item of items) {
            item.approvesCount = item.approves.filter(leaderIn =>
                leadersInTop.has(leaderIn)
            ).length;
            delete item.approves;

            if (item.proposerProfile.userId) {
                item.proposer = item.proposerProfile;
            } else {
                item.proposer = {
                    userId: item.proposer,
                    username: null,
                    avatarUrl: null,
                };
            }

            item.proposerProfile = undefined;
            item.approvesNeed = APPROVES_THRESHOLD[item.permission];

            this._formatChanges(item);

            item.community = {
                communityId: item.community.communityId,
                alias: item.community.alias,
                name: item.community.name,
                avatarUrl: item.community.avatarUrl,
            };
        }

        let proposalsCount = 0;

        if (meta.length) {
            const [{ count }] = meta;
            proposalsCount = count;
        }

        return { items, proposalsCount };
    }

    _formatChanges(proposal) {
        const { contract, action, community, data } = proposal;

        if (contract === 'c.list' && action === 'setinfo') {
            const {
                description,
                language,
                rules,
                avatar_image: avatarUrl,
                cover_image: coverUrl,
            } = data;

            if (!isNil(description)) {
                proposal.change = {
                    type: 'description',
                    old: community.description,
                    new: description,
                };
            }

            if (!isNil(language)) {
                proposal.change = {
                    type: 'language',
                    old: community.language,
                    new: language,
                };
            }

            if (!isNil(avatarUrl)) {
                proposal.change = {
                    type: 'avatarUrl',
                    old: community.avatarUrl,
                    new: avatarUrl,
                };
            }

            if (!isNil(coverUrl)) {
                proposal.change = {
                    type: 'coverUrl',
                    old: community.coverUrl,
                    new: coverUrl,
                };
            }

            if (!isNil(rules)) {
                const currentRules = community.rules;

                if (!Array.isArray(currentRules)) {
                    Logger.warn('Invalid rules json:', currentRules);
                }

                const rules = JSON.parse(data.rules);

                if (rules && rules.type === 'patch') {
                    // При сохранении предложений призмой она проверяет что массив actions содержит
                    // один единственный action, так что тут дополнительная проверка не требуется.
                    const action = rules.actions[0];
                    const actionData = action.data;

                    let changes = null;

                    switch (action.type) {
                        case 'add': {
                            changes = {
                                new: {
                                    id: actionData.id,
                                    title: actionData.title,
                                    text: actionData.text,
                                },
                                old: null,
                            };
                            break;
                        }
                        case 'update': {
                            const rule = currentRules.find(rule => rule.id === actionData.id);

                            if (rule) {
                                const updated = { ...rule };

                                if (actionData.title !== undefined) {
                                    updated.title = actionData.title;
                                }

                                if (actionData.text !== undefined) {
                                    updated.text = actionData.text;
                                }

                                changes = {
                                    old: rule,
                                    new: updated,
                                };
                            }
                            break;
                        }
                        case 'remove': {
                            const rule = currentRules.find(rule => rule.id === actionData.id);

                            if (rule) {
                                changes = {
                                    old: rule,
                                    new: null,
                                };
                            }
                            break;
                        }
                        default:
                            throw new Error(`Unknown proposal patch action: "${action.type}"`);
                    }

                    if (changes && changes.old !== changes.new) {
                        proposal.change = {
                            type: 'rules',
                            subType: action.type,
                            ...changes,
                        };
                    }
                } else {
                    if (rules !== currentRules) {
                        proposal.change = {
                            type: 'rules',
                            subType: 'replace',
                            old: currentRules,
                            new: rules,
                        };
                    }
                }
            }
        }
    }
}

module.exports = LeaderProposals;
