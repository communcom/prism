const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;
const env = require('../data/env');
const Comment = require('../controllers/connector/Comment');
const Posts = require('../controllers/connector/Posts');
const Profile = require('../controllers/connector/Profile');
const Notify = require('../controllers/connector/Notify');
const HashTag = require('../controllers/connector/HashTag');
const Leaders = require('../controllers/connector/Leaders');
const Block = require('../controllers/connector/Block');
const Search = require('../controllers/connector/Search');
const Vote = require('../controllers/connector/Vote');
const Community = require('../controllers/connector/Community');
const Reports = require('../controllers/connector/Reports');

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
            this._notify = new Notify(linking);
            this._hashTag = new HashTag(linking);
            this._leaders = new Leaders(linking);
            this._search = new Search(linking);
            this._vote = new Vote(linking);
            this._community = new Community(linking);
            this._reports = new Reports(linking);
        } else {
            this._posts = empty;
            this._comment = empty;
            this._profile = empty;
            this._notify = empty;
            this._hashTag = empty;
            this._leaders = empty;
            this._search = empty;
            this._vote = empty;
            this._community = empty;
            this._reports = empty;
        }
    }

    async start() {
        await super.start({
            serverRoutes: {
                search: {
                    handler: this._search.search,
                    scope: this._search,
                    inherits: ['onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['text'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['matchPrefix', 'match'],
                                default: 'matchPrefix',
                            },
                            where: {
                                type: 'string',
                                enum: ['all', 'post', 'comment'],
                                default: 'all',
                            },
                            text: {
                                type: 'string',
                            },
                            field: {
                                type: 'string',
                                enum: ['all', 'title', 'raw', 'full', 'preview', 'permlink'],
                                default: 'all',
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                            offset: {
                                type: 'number',
                                default: 0,
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
                                    'byUser',
                                    'new',
                                    'topLikes',
                                    'topComments',
                                    'topRewards',
                                    'hot',
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
                                items: {
                                    type: 'string',
                                },
                                default: [],
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
                    inherits: ['onlyWhenPublicApiEnabled'],
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
                getNotifyMeta: {
                    handler: this._notify.getMeta,
                    scope: this._notify,
                    inherits: ['username', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            communityId: {
                                type: 'string',
                            },
                            postId: {
                                type: 'object',
                            },
                            commentId: {
                                type: 'object',
                            },
                            contentId: {
                                type: 'object',
                            },
                        },
                    },
                },
                getHashTagTop: {
                    handler: this._hashTag.getTop,
                    scope: this._hashTag,
                    inherits: ['feedPaging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
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
                getProposals: {
                    handler: this._leaders.getProposals,
                    scope: this._leaders,
                    inherits: ['feedPaging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['communityId'],
                        properties: {
                            communityId: {
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
                getPostVotes: {
                    handler: this._vote.getPostVotes,
                    scope: this._vote,
                    inherits: ['contentId', 'feedPaging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['userId', 'permlink', 'type'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['like', 'dislike'],
                            },
                        },
                    },
                },
                getCommentVotes: {
                    handler: this._vote.getCommentVotes,
                    scope: this._vote,
                    inherits: ['contentId', 'feedPaging', 'onlyWhenPublicApiEnabled'],
                    validation: {
                        required: ['userId', 'permlink', 'type'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['like', 'dislike'],
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
