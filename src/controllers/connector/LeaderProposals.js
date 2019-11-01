const { isNil } = require('lodash');
const core = require('cyberway-core-service');
const { Logger } = core.utils;
const BasicController = core.controllers.Basic;
const LeaderProposalModel = require('../../models/LeaderProposal');

class LeaderProposals extends BasicController {
    async getProposals({ communitiesIds, limit, offset }, { userId }) {
        const items = await LeaderProposalModel.aggregate([
            {
                $match: {
                    communityId: {
                        $in: communitiesIds,
                    },
                    isExecuted: false,
                },
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
                $project: {
                    _id: false,
                    proposer: true,
                    proposalId: true,
                    contract: true,
                    action: true,
                    blockTime: true,
                    expiration: true,
                    data: true,
                    approvesCount: {
                        $size: '$approves',
                    },
                    proposerProfile: {
                        $let: {
                            vars: {
                                proposer: { $arrayElemAt: ['$proposerProfile', 0] },
                            },
                            in: {
                                userId: '$$proposer.userId',
                                username: '$$proposer.username',
                                avatarUrl: '$$proposer.personal.avatarUrl',
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
                },
            },
        ]);

        for (const item of items) {
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

            this._formatChanges(item);

            item.community = {
                communityId: item.community.communityId,
                alias: item.community.alias,
                name: item.community.name,
                avatarUrl: item.community.avatarUrl,
            };
        }

        return {
            items,
        };
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
                    old: community.description,
                    new: description,
                };
            }

            if (!isNil(language)) {
                proposal.change = {
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
