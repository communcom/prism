const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;
const env = require('../data/env');
const { SEARCHABLE_ENTITIES } = require('../data/constants');
const Comment = require('../controllers/connector/Comment');
const Posts = require('../controllers/connector/Posts');
const Profile = require('../controllers/connector/Profile');
const Leaders = require('../controllers/connector/Leaders');
const LeaderProposals = require('../controllers/connector/LeaderProposals');
const Block = require('../controllers/connector/Block');
const Community = require('../controllers/connector/Community');
const Reports = require('../controllers/connector/Reports');
const Search = require('../controllers/connector/Search');

class Connector extends BasicConnector {
    constructor({ prism }) {
        super();

        const linking = { connector: this };
        const empty = {};

        if (env.GLS_ENABLE_BLOCK_HANDLE) {
            this._block = new Block({ prismService: prism, ...linking });
        } else {
            this._block = empty;
        }

        if (env.GLS_ENABLE_PUBLIC_API) {
            this._posts = new Posts(linking);
            this._comment = new Comment(linking);
            this._profile = new Profile(linking);
            this._leaders = new Leaders(linking);
            this._leaderProposals = new LeaderProposals(linking);
            this._community = new Community(linking);
            this._reports = new Reports({ ...linking, leaderProposals: this._leaderProposals });
            this._search = new Search(linking);
        } else {
            this._posts = empty;
            this._comment = empty;
            this._profile = empty;
            this._leaders = empty;
            this._leaderProposals = empty;
            this._community = empty;
            this._reports = empty;
            this._search = empty;
        }
    }

    async start() {
        await super.start({
            serverRoutes: {
                quickSearch: {
                    handler: this._search.quickSearch,
                    scope: this._search,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['queryString'],
                        properties: {
                            limit: {
                                type: 'number',
                                default: 5,
                            },
                            entities: {
                                type: 'array',
                                items: {
                                    enum: [...SEARCHABLE_ENTITIES, 'all'],
                                },
                                default: ['all'],
                            },
                            queryString: {
                                type: 'string',
                            },
                        },
                    },
                },
                extendedSearch: {
                    handler: this._search.extendedSearch,
                    scope: this._search,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['queryString', 'entities'],
                        properties: {
                            // will make following to be a valid request:
                            // { entities: { posts: { limit: 20, offset: 0 }, profiles: { limit: 10, offset: 2 } } }
                            entities: {
                                type: 'object',
                                properties: SEARCHABLE_ENTITIES.reduce((entities, entityName) => {
                                    entities[entityName] = {
                                        properties: {
                                            limit: {
                                                type: 'number',
                                                default: 10,
                                            },
                                            offset: {
                                                type: 'number',
                                                default: 0,
                                            },
                                        },
                                    };

                                    return entities;
                                }, {}),
                            },
                            queryString: {
                                type: 'string',
                            },
                        },
                    },
                },
                entitySearch: {
                    handler: this._search.entitySearch,
                    scope: this._search,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        required: ['queryString', 'entity'],
                        properties: {
                            entity: {
                                type: 'string',
                                enum: SEARCHABLE_ENTITIES,
                            },
                            queryString: {
                                type: 'string',
                            },
                        },
                    },
                },
                getPost: {
                    handler: this._posts.getPost,
                    scope: this._posts,
                    inherits: [
                        'username',
                        'communityAlias',
                        'contentIdNew',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: ['permlink'],
                        properties: {},
                    },
                },
                getComment: {
                    handler: this._comment.getComment,
                    scope: this._comment,
                    inherits: ['contentId', 'communityId', 'onlyWhenPublicApiEnabled'],
                },
                getComments: {
                    handler: this._comment.getComments,
                    scope: this._comment,
                    inherits: [
                        'feedPaging',
                        'username',
                        'paging',
                        'communityId',
                        'contentId',
                        'onlyWhenPublicApiEnabled',
                    ],
                    validation: {
                        required: [],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['post', 'user', 'replies'],
                                default: 'post',
                            },
                            sortBy: {
                                type: 'string',
                                enum: ['time', 'timeDesc', 'popularity'],
                                default: 'time',
                            },
                            parentComment: {
                                permlink: {
                                    type: 'string',
                                },
                                userId: {
                                    type: 'string',
                                },
                            },
                            resolveNestedComments: {
                                type: 'boolean',
                                default: false,
                            },
                        },
                    },
                },
                getPosts: {
                    handler: this._posts.getPosts,
                    scope: this._posts,
                    inherits: ['paging', 'nsfwFilter', 'username', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: [],
                        properties: {
                            type: {
                                type: 'string',
                                enum: [
                                    'community',
                                    'subscriptions',
                                    'subscriptionsHot',
                                    'subscriptionsPopular',
                                    'byUser',
                                    'new',
                                    'topLikes',
                                    'topComments',
                                    'topRewards',
                                    'hot',
                                    'voted',
                                ],
                                default: 'community',
                            },
                            sortBy: {
                                type: 'string',
                                enum: ['time', 'timeDesc'],
                                default: 'time',
                            },
                            timeframe: {
                                type: 'string',
                                enum: ['day', 'week', 'month', 'all'],
                                default: 'day',
                            },
                            userId: {
                                type: 'string',
                            },
                            communityId: {
                                type: 'string',
                            },
                            communityAlias: {
                                type: 'string',
                            },
                        },
                    },
                },
                getReportsList: {
                    handler: this._reports.getReportsList,
                    scope: this._reports,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        required: ['contentType'],
                        properties: {
                            contentType: {
                                enum: ['post', 'comment'],
                            },
                            communityIds: {
                                type: 'array',
                                minItems: 1,
                                items: {
                                    type: 'string',
                                },
                            },
                            status: {
                                enum: ['open', 'closed'],
                                default: 'open',
                            },
                            sortBy: {
                                enum: ['time', 'timeDesc', 'reportsCount'],
                                default: 'time',
                            },
                        },
                    },
                },
                getEntityReports: {
                    handler: this._reports.getEntityReports,
                    scope: this._reports,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        required: ['communityId', 'userId', 'permlink'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            userId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                        },
                    },
                },
                getProfile: {
                    handler: this._profile.getProfile,
                    scope: this._profile,
                    inherits: ['username', 'onlyWhenPublicApiEnabled', 'userByAnyName'],
                    validation: {
                        required: [],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            maxCommonCommunities: {
                                type: 'number',
                                default: 2,
                            },
                        },
                    },
                },
                getProfileBanHistory: {
                    handler: this._profile.getProfileBanHistory,
                    scope: this._profile,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        properties: {
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getBlacklist: {
                    handler: this._profile.getBlacklist,
                    scope: this._profile,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        required: ['userId', 'type'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            type: {
                                enum: ['communities', 'users'],
                            },
                        },
                    },
                },
                suggestNames: {
                    handler: this._profile.suggestNames,
                    scope: this._profile,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['text'],
                        properties: {
                            text: {
                                type: 'string',
                            },
                        },
                    },
                },
                getLeaders: {
                    handler: this._leaders.getLeaders,
                    scope: this._leaders,
                    inherits: ['paging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            prefix: {
                                type: 'string',
                            },
                        },
                    },
                },
                getVotedLeader: {
                    handler: this._leaders.getVotedLeader,
                    scope: this._leaders,
                    inherits: ['paging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId', 'userId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getLeaderCommunities: {
                    handler: this._leaders.getLeaderCommunities,
                    scope: this._leaders,
                    inherits: ['paging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        properties: {
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getProposals: {
                    handler: this._leaderProposals.getProposals,
                    scope: this._leaderProposals,
                    inherits: ['paging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        properties: {
                            communityIds: {
                                type: 'array',
                                minItems: 1,
                                items: {
                                    type: 'string',
                                },
                            },
                            types: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    enum: ['all', 'setInfo', 'banUser', 'unbanUser', 'banPost'],
                                },
                                default: ['all'],
                            },
                        },
                    },
                },
                getBanPostProposal: {
                    handler: this._leaderProposals.getBanPostProposal,
                    scope: this._leaderProposals,
                    inherits: ['contentIdNew'],
                    validation: {
                        required: ['communityId', 'userId', 'permlink'],
                    },
                },
                getProposal: {
                    handler: this._leaderProposals.getProposal,
                    scope: this._leaderProposals,
                    validation: {
                        required: ['communityId', 'proposer', 'proposalId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            proposer: {
                                type: 'string',
                            },
                            proposalId: {
                                type: 'string',
                            },
                        },
                    },
                },
                waitForBlock: {
                    handler: this._block.waitForBlock,
                    scope: this._block,
                    inherits: ['onlyWhenBlockHandleEnabled'],
                    validation: {
                        required: ['blockNum'],
                        properties: {
                            blockNum: {
                                type: 'number',
                                minValue: 0,
                            },
                        },
                    },
                },
                waitForTransaction: {
                    handler: this._block.waitForTransaction,
                    scope: this._block,
                    inherits: ['onlyWhenBlockHandleEnabled'],
                    validation: {
                        required: ['transactionId'],
                        properties: {
                            transactionId: {
                                type: 'string',
                            },
                        },
                    },
                },

                resolveProfile: {
                    handler: this._profile.resolveProfile,
                    scope: this._profile,
                    inherits: ['username', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['username'],
                        properties: {},
                    },
                },
                getSubscriptions: {
                    handler: this._profile.getSubscriptions,
                    scope: this._profile,
                    inherits: ['paging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['userId', 'type'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            type: {
                                type: 'string',
                                enum: ['user', 'community'],
                            },
                        },
                    },
                },
                getSubscribers: {
                    handler: this._profile.getSubscribers,
                    scope: this._profile,
                    inherits: ['paging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            communityId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getCommunitySettings: {
                    handler: this._community.getSettings,
                    scope: this._community,
                    validation: {
                        required: [],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            communityAlias: {
                                type: 'string',
                            },
                        },
                    },
                },
                getCommunity: {
                    handler: this._community.getCommunity,
                    scope: this._community,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            communityAlias: {
                                type: 'string',
                            },
                        },
                    },
                },
                getCommunityBlacklist: {
                    handler: this._community.getCommunityBlacklist,
                    scope: this._community,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            communityAlias: {
                                type: 'string',
                            },
                        },
                    },
                },
                getCommunityBanHistory: {
                    handler: this._community.getCommunityBanHistory,
                    scope: this._community,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            communityAlias: {
                                type: 'string',
                            },
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getCommunities: {
                    handler: this._community.getCommunities,
                    scope: this._community,
                    inherits: ['onlyWhenPublicApiEnabled', 'paging'],
                    validation: {
                        required: [],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['all', 'user'],
                                default: 'all',
                            },
                            userId: {
                                type: 'string',
                            },
                            search: {
                                type: 'string',
                            },
                            excludeMySubscriptions: {
                                type: 'boolean',
                                default: false,
                            },
                            sortingToken: {
                                type: 'string',
                            },
                            allowedLanguages: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                default: ['en'],
                            },
                        },
                    },
                },
                isInCommunityBlacklist: {
                    handler: this._community.isInCommunityBlacklist,
                    scope: this._community,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId', 'userId'],
                        properties: {
                            communityId: {
                                type: 'string',
                            },
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                isInUserBlacklist: {
                    handler: this._profile.isInUserBlacklist,
                    scope: this._profile,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['targetUserId', 'userId'],
                        properties: {
                            targetUserId: {
                                type: 'string',
                            },
                            userId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getUsers: {
                    handler: this._profile.getUsers,
                    scope: this._profile,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['userIds'],
                        properties: {
                            userIds: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
            serverDefaults: {
                parents: {
                    paging: {
                        validation: {
                            properties: {
                                limit: {
                                    type: 'number',
                                    default: 10,
                                    minValue: 1,
                                    maxValue: env.GLS_MAX_FEED_LIMIT,
                                },
                                offset: {
                                    type: 'number',
                                    default: 0,
                                    minValue: 0,
                                },
                            },
                        },
                    },
                    feedPaging: {
                        validation: {
                            properties: {
                                limit: {
                                    type: 'number',
                                    default: 10,
                                    minValue: 1,
                                    maxValue: env.GLS_MAX_FEED_LIMIT,
                                },
                                sequenceKey: {
                                    type: ['string', 'null'],
                                },
                            },
                        },
                    },
                    username: {
                        validation: {
                            properties: {
                                username: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    userByAnyName: {
                        validation: {
                            properties: {
                                user: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    communityAlias: {
                        validation: {
                            properties: {
                                communityAlias: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    contentId: {
                        validation: {
                            properties: {
                                userId: {
                                    type: 'string',
                                },
                                permlink: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    contentIdNew: {
                        validation: {
                            properties: {
                                communityId: {
                                    type: 'string',
                                },
                                userId: {
                                    type: 'string',
                                },
                                permlink: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    communityId: {
                        validation: {
                            properties: {
                                communityId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    nsfwFilter: {
                        validation: {
                            properties: {
                                allowNsfw: {
                                    type: 'boolean',
                                    default: false,
                                },
                            },
                        },
                    },
                    onlyWhenBlockHandleEnabled: {
                        before: [{ handler: this._onlyWhenBlockHandleEnabled, scope: this }],
                    },
                    onlyWhenPublicApiEnabled: {
                        before: [{ handler: this._onlyWhenPublicApiEnabled, scope: this }],
                    },
                },
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                embedsCache: env.GLS_EMBEDS_CACHE_CONNECT,
                meta: env.GLS_META_CONNECT,
            },
        });
    }

    _onlyWhenBlockHandleEnabled() {
        if (!env.GLS_ENABLE_BLOCK_HANDLE) {
            throw { code: 405, message: 'Method disabled by configuration' };
        }
    }

    _onlyWhenPublicApiEnabled() {
        if (!env.GLS_ENABLE_PUBLIC_API) {
            throw { code: 405, message: 'Method disabled by configuration' };
        }
    }
}

module.exports = Connector;
