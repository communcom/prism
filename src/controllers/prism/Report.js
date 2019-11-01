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
            { contentId },
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

        const oldReportObject = await ReportModel.findOne({ contentId });

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

    async _appendReport({ type, contentId, reporter, reason }) {
        let model = type === 'post' ? PostModel : CommentModel;

        const previousContentModel = await model.findOneAndUpdate(
            {
                contentId,
            },
            { $addToSet: { 'reports.userIds': reporter }, $inc: { 'reports.reportsCount': 1 } }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: model,
            documentId: previousContentModel._id,
            data: {
                $pull: { 'reports.userIds': reporter },
                $inc: { 'reports.reportsCount': -1 },
            },
        });

        const previousReportModel = await ReportModel.findOneAndUpdate(
            { contentId },
            { $addToSet: { reports: { reporter, reason } }, $inc: { reportsCount: 1 } }
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

    async _createReport({ contentId, reporter, reason }) {
        const type = PostModel.findOne({ contentId }) ? 'post' : 'comment';
        const model = type === 'post' ? PostModel : CommentModel;

        const previousContentModel = await model.findOneAndUpdate(
            {
                contentId,
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
                Model: model,
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
