const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const ReportModel = require('../../models/Report');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');

const basePostProjection = {
    $project: {
        _id: false,
        contentId: true,
        'document.type': true,
        'document.body': true,
        votes: true,
        stats: true,
        meta: true,
        'reports.reportsCount': true,
        author: {
            $let: {
                vars: {
                    profile: { $arrayElemAt: ['$profile', 0] },
                },
                in: {
                    userId: '$$profile.userId',
                    username: '$$profile.username',
                    avatarUrl: '$$profile.personal.avatarUrl',
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
                },
            },
        },
    },
};

const baseCommentProjection = {
    $project: {
        _id: false,
        communityId: true,
        contentId: true,
        'document.type': true,
        'document.body': true,
        'votes.upCount': true,
        'votes.downCount': true,
        'reports.reportsCount': true,
        childCommentsCount: true,
        isSubscribedAuthor: true,
        isSubscribedCommunity: true,
        parents: true,
        meta: true,
        author: {
            $let: {
                vars: {
                    profile: { $arrayElemAt: ['$profile', 0] },
                },
                in: {
                    userId: '$$profile.userId',
                    username: '$$profile.username',
                    avatarUrl: '$$profile.personal.avatarUrl',
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
                },
            },
        },
    },
};

const profileLookup = {
    $lookup: {
        from: 'profiles',
        localField: 'contentId.userId',
        foreignField: 'userId',
        as: 'profile',
    },
};

const communityLookup = {
    $lookup: {
        from: 'communities',
        localField: 'contentId.communityId',
        foreignField: 'communityId',
        as: 'community',
    },
};

class Reports extends BasicController {
    async getReportsList({ contentType, communityIds, status, sortBy, offset, limit }, { userId }) {
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

        let model;
        let projection;
        let sorting;

        switch (contentType) {
            case 'post':
                model = PostModel;
                projection = basePostProjection;
                break;
            case 'comment':
                model = CommentModel;
                projection = baseCommentProjection;
                break;
        }

        switch (sortBy) {
            case 'reportsCount':
                sorting = { $sort: { 'reports.reportsCount': -1 } };
                break;
            case 'time':
                sorting = { $sort: { 'meta.creationTime': -1 } };
                break;
            case 'timeDesc':
                sorting = { $sort: { 'meta.creationTime': 1 } };
                break;
        }

        const match = {
            $match: {
                $or: communityIds.map(communityId => ({
                    'contentId.communityId': communityId,
                })),
                'reports.reportsCount': { $gt: 0 },
                'reports.status': status,
            },
        };

        const aggregation = [
            match,
            sorting,
            { $skip: offset },
            { $limit: limit },
            profileLookup,
            communityLookup,
            projection,
        ];

        const items = await model.aggregate(aggregation);

        this._fixDocuments(items, contentType);

        return { items };
    }

    async getEntityReports({ communityId, userId, permlink, limit, offset }) {
        const match = {
            $match: {
                'contentId.communityId': communityId,
                'contentId.userId': userId,
                'contentId.permlink': permlink,
            },
        };

        const projection = {
            $project: {
                reports: true,
                _id: false,
            },
        };

        const unwind = {
            $unwind: {
                path: '$reports',
            },
        };

        const replaceRoot = {
            $replaceRoot: {
                newRoot: {
                    reporter: '$reports.reporter',
                    reason: '$reports.reason',
                },
            },
        };

        const reporterLookup = {
            $lookup: {
                from: 'profiles',
                localField: 'reporter',
                foreignField: 'userId',
                as: 'reporter',
            },
        };

        const finalProjection = {
            $project: {
                author: {
                    $let: {
                        vars: {
                            reporter: { $arrayElemAt: ['$reporter', 0] },
                        },
                        in: {
                            userId: '$$reporter.userId',
                            username: '$$reporter.username',
                            avatarUrl: '$$reporter.personal.avatarUrl',
                        },
                    },
                },
                reason: true,
                _id: false,
            },
        };

        const aggregation = [
            match,
            projection,
            unwind,
            { $limit: limit },
            { $skip: offset },
            replaceRoot,
            reporterLookup,
            finalProjection,
        ];

        const items = await ReportModel.aggregate(aggregation);

        return { items };
    }

    _fixDocuments(documents, type) {
        for (const document of documents) {
            this._fixDocument(document, type);
        }
    }

    _fixDocument(document, type) {
        document.type = type;

        if (document.document) {
            document.document = document.document.body;
        }
    }
}

module.exports = Reports;
