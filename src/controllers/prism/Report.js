const core = require('cyberway-core-service');
const { Logger } = core.utils;

const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ReportModel = require('../../models/Report');

class Report extends Abstract {
    async handleBan({ commun_code: communityId, message_id: messageId }) {
        const contentId = {
            communityId,
            userId: messageId.author,
            permlink: messageId.permlink,
        };

        const previousReportModel = await ReportModel.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.permlink': contentId.permlink,
                'contentId.userId': contentId.userId,
            },
            { $set: { status: 'closed' } }
        );

        // may not exist: leaders can ban any posts, not only reported ones
        if (previousReportModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: ReportModel,
                documentId: previousReportModel._id,
                data: {
                    $set: {
                        status: previousReportModel.status,
                    },
                },
            });
        }
    }

    async handleReport({ commun_code: communityId, reporter, message_id: messageId, reason }) {
        const contentId = {
            communityId,
            userId: messageId.author,
            permlink: messageId.permlink,
        };

        await this._checkNsftReport(contentId, reason);

        const oldReportObject = await ReportModel.findOne({
            'contentId.communityId': contentId.communityId,
            'contentId.permlink': contentId.permlink,
            'contentId.userId': contentId.userId,
        });

        if (oldReportObject) {
            return await this._appendReport({
                type: oldReportObject.contentType,
                contentId,
                reporter,
                reason,
            });
        } else {
            return await this._createReport({ contentId, reporter, reason });
        }
    }

    async _checkNsftReport(contentId, reason) {
        try {
            const reasonList = JSON.parse(reason);

            if (!reasonList.includes('nsfw') && !reasonList.includes('nudity')) {
                return;
            }
        } catch (err) {
            Logger.error('Invalid report reason format:', reason, err);
            return;
        }

        const postModel = await PostModel.findOne(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                tags: {
                    $ne: 'nsfw',
                },
            },
            {
                _id: true,
            }
        );

        if (postModel) {
            await PostModel.updateOne(
                {
                    _id: postModel._id,
                },
                {
                    $addToSet: {
                        tags: 'nsfw',
                    },
                }
            );

            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: postModel._id,
                data: {
                    $pull: { tags: 'nsfw' },
                },
            });
        }
    }

    async _appendReport({ type, contentId, reporter, reason }) {
        let Model = type === 'post' ? PostModel : CommentModel;

        const previousContentModel = await Model.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.permlink': contentId.permlink,
                'contentId.userId': contentId.userId,
            },
            { $addToSet: { 'reports.userIds': reporter }, $inc: { 'reports.reportsCount': 1 } }
        );

        await this.registerForkChanges({
            type: 'update',
            Model,
            documentId: previousContentModel._id,
            data: {
                $pull: { 'reports.userIds': reporter },
                $inc: { 'reports.reportsCount': -1 },
            },
        });

        const previousReportModel = await ReportModel.findOne(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.permlink': contentId.permlink,
                'contentId.userId': contentId.userId,
            },
            { reports: true, _id: false },
            { lean: true }
        );

        const previousUserReportIndex = previousReportModel.reports.findIndex(
            element => element.reporter === reporter
        );

        if (previousUserReportIndex > -1) {
            await ReportModel.update(
                {
                    'contentId.communityId': contentId.communityId,
                    'contentId.permlink': contentId.permlink,
                    'contentId.userId': contentId.userId,
                },
                {
                    $set: { [`reports.${previousUserReportIndex}`]: { reporter, reason } },
                    $inc: { reportsCount: 1 },
                }
            );

            await this.registerForkChanges({
                type: 'update',
                Model: ReportModel,
                documentId: previousReportModel._id,
                data: {
                    $set: {
                        [`reports.${previousUserReportIndex}`]: previousReportModel.reports[
                            previousUserReportIndex
                        ],
                    },
                },
            });
        } else {
            await ReportModel.update(
                {
                    'contentId.communityId': contentId.communityId,
                    'contentId.permlink': contentId.permlink,
                    'contentId.userId': contentId.userId,
                },
                {
                    $addToSet: { reports: { reporter, reason } },
                    $inc: { reportsCount: 1 },
                }
            );

            await this.registerForkChanges({
                type: 'update',
                Model: ReportModel,
                documentId: previousReportModel._id,
                data: {
                    $pull: { reports: { reporter, reason } },
                    $inc: { reportsCount: -1 },
                },
            });
        }
    }

    async _createReport({ contentId, reporter, reason }) {
        const type = (await PostModel.findOne({ contentId })) ? 'post' : 'comment';
        const Model = type === 'post' ? PostModel : CommentModel;

        const previousContentModel = await Model.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.permlink': contentId.permlink,
                'contentId.userId': contentId.userId,
            },
            {
                $addToSet: { 'reports.userIds': reporter },
                $inc: { 'reports.reportsCount': 1 },
                $set: { 'reports.status': 'open' },
            }
        );

        if (previousContentModel) {
            await this.registerForkChanges({
                type: 'update',
                Model,
                documentId: previousContentModel._id,
                data: {
                    $pull: { 'reports.userIds': reporter },
                    $inc: { 'reports.reportsCount': -1 },
                    $set: { 'reports.status': 'clean' },
                },
            });
        }

        const newReportModel = await ReportModel.create({
            contentId,
            reports: [{ reporter, reason }],
            reportsCount: 1,
            contentType: type,
        });

        await this.registerForkChanges({
            type: 'create',
            Model: ReportModel,
            documentId: newReportModel._id,
        });
    }
}

module.exports = Report;
