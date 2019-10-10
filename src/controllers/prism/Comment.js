const core = require('cyberway-core-service');
const { Logger } = core.utils;
const { NESTED_COMMENTS_MAX_INDEX_DEPTH } = require('../../data/constants');
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');
const { processContent, extractContentId } = require('../../utils/content');
const { isCommunityExists } = require('../../utils/community');

class Comment extends Abstract {
    async handleCreate(content, { blockNum, blockTime }) {
        const contentId = extractContentId(content);
        const communityId = content.commun_code;

        if (!(await isCommunityExists(communityId))) {
            Logger.warn(`New comment into unknown community: ${communityId},`, contentId);
            return;
        }

        if (await this._isTrash(contentId)) {
            return;
        }

        let processedContent = null;

        try {
            processedContent = await processContent(this, content, ['comment']);
        } catch (err) {
            Logger.warn(`Invalid comment content, block num: ${blockNum}`, contentId, err);
        }

        const modelData = {
            contentId,
            parents: {},
            content: processedContent,
            meta: {
                creationTime: blockTime,
            },
            payout: {
                meta: {
                    curatorsPercent: Number(content.curators_prcnt),
                },
            },
        };

        await this.applyParentById(modelData, contentId);

        const model = new CommentModel(modelData);

        await this.applyOrdering(model);
        await model.save();
        await this.registerForkChanges({
            type: 'create',
            Model: CommentModel,
            documentId: model._id,
        });
        await this.updatePostCommentsCount(model, 1);
        await this.updateUserCommentsCount(model.contentId.userId, 1);
    }

    async handleUpdate(content, { blockNum }) {
        const contentId = extractContentId(content);

        let updatedContent = null;

        try {
            updatedContent = await processContent(this, content, ['comment']);
        } catch (err) {
            Logger.warn(`Invalid comment content, block num: ${blockNum}`, contentId, err);
        }

        const previousModel = await CommentModel.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            {
                $set: {
                    content: updatedContent,
                },
            }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: CommentModel,
            documentId: previousModel._id,
            data: {
                $set: {
                    content: previousModel.content.toObject(),
                },
            },
        });
    }

    async handleDelete(content) {
        const contentId = extractContentId(content);
        const model = await CommentModel.findOne({
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
            'contentId.communityId': contentId.communityId,
        });

        if (!model) {
            return;
        }

        await this.updatePostCommentsCount(model, -1);

        const removed = await model.remove();

        await this.registerForkChanges({
            type: 'remove',
            Model: CommentModel,
            documentId: removed._id,
            data: removed.toObject(),
        });
    }

    async updatePostCommentsCount(model, increment) {
        const contentId = model.parents.post;
        const previousModel = await PostModel.findOneAndUpdate(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            { $inc: { 'stats.commentsCount': increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: previousModel._id,
                data: { $inc: { 'stats.commentsCount': -increment } },
            });
        }
    }

    async updateUserCommentsCount(userId, increment) {
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            { $inc: { 'stats.commentsCount': increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: previousModel._id,
                data: { $inc: { 'stats.commentsCount': -increment } },
            });
        }
    }

    async applyParentById(model, contentId) {
        const post = await this._getParentPost(contentId);

        if (post) {
            model.parents.post = contentId;
            model.parents.comment = null;
            model.nestedLevel = 1;
            return;
        }

        const comment = await this._getParentComment(contentId);

        if (comment) {
            model.parents.post = comment.parents.post;
            model.parents.comment = contentId;
            model.nestedLevel = comment.nestedLevel + 1;
        }
    }

    async applyOrdering(model) {
        if (!model.parents.comment) {
            model.ordering.byTime = Date.now().toString();
            return;
        }

        const parentCommentId = model.parents.comment;
        const parentComment = await CommentModel.findOne(
            {
                'contentId.communityId': parentCommentId.communityId,
                'contentId.userId': parentCommentId.userId,
                'contentId.permlink': parentCommentId.permlink,
            },
            { 'ordering.byTime': true, nestedLevel: true },
            { lean: true }
        );

        if (!parentComment) {
            Logger.warn('Unknown parent comment for ordering:', parentCommentId);
            return;
        }

        let indexBase = parentComment.ordering.byTime;

        // Если уровень вложенности превышает максимум, то удаляем из индекса ключ родителя
        // и на его место ставим индес текущего комментария.
        if (parentComment.nestedLevel >= NESTED_COMMENTS_MAX_INDEX_DEPTH) {
            indexBase = indexBase
                .split('-')
                .slice(0, NESTED_COMMENTS_MAX_INDEX_DEPTH - 1)
                .join('-');
        }

        model.ordering.byTime = `${indexBase}-${Date.now()}`;
    }

    async _getParentPost(contentId) {
        return await PostModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            { contentId: true }
        );
    }

    async _getParentComment(contentId) {
        return await CommentModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            { contentId: true, parents: true, nestedLevel: true },
            { lean: true }
        );
    }
}

module.exports = Comment;
