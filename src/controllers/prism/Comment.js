const core = require('cyberway-core-service');
const { Logger } = core.utils;
const { NESTED_COMMENTS_MAX_INDEX_DEPTH } = require('../../data/constants');
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');
const { processContent, extractContentId, extractParentContentId } = require('../../utils/content');
const { isCommunityExists } = require('../../utils/lookup');

class Comment extends Abstract {
    async handleCreate(content, { blockNum, blockTime }) {
        const contentId = extractContentId(content);
        const { communityId } = contentId;

        if (!(await isCommunityExists(communityId))) {
            Logger.warn(`New comment into unknown community: ${communityId},`, contentId);
            return;
        }

        if (await this._isTrash(contentId)) {
            return;
        }

        const modelData = {
            contentId,
            parents: {},
            meta: {
                creationTime: blockTime,
            },
            payout: {
                meta: {
                    curatorsPercent: Number(content.curators_prcnt),
                },
            },
            ordering: {},
        };

        if (!(await this.applyParentById(modelData, content))) {
            // Если не найден родитель то пропускаем комментарий.
            return;
        }

        try {
            modelData.content = await processContent(this, content, ['comment']);
        } catch (err) {
            modelData.content = null;
            Logger.warn(`Invalid comment content, block num: ${blockNum}`, contentId, err);
        }

        const model = new CommentModel(modelData);

        await model.save();
        await this.registerForkChanges({
            type: 'create',
            Model: CommentModel,
            documentId: model._id,
        });
        await this.updatePostCommentsCount(model, 1);
        await this.updateUserCommentsCount(model.contentId.userId, 1);
        if (model.parents.comment) {
            await this.updateChildCommentsCount(model.parents.comment, 1);
        }
    }

    async handleUpdate(content, { blockNum }) {
        const contentId = extractContentId(content);
        const updateFields = {};

        try {
            updateFields.content = await processContent(this, content, ['comment']);
        } catch (err) {
            updateFields.content = null;
            Logger.warn(`Invalid comment content, block num: ${blockNum}`, contentId, err);
        }

        const previousModel = await CommentModel.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            {
                $set: updateFields,
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
        await this.updateUserCommentsCount(model.contentId.userId, -1);

        if (model.parents.comment) {
            await this.updateChildCommentsCount(model.parents.comment, -1);
        }

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

    async updateChildCommentsCount(contentId, increment) {
        const previousModel = await CommentModel.findOneAndUpdate(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            { $inc: { childCommentsCount: increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: CommentModel,
                documentId: previousModel._id,
                data: { $inc: { childCommentsCount: -increment } },
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

    async applyParentById(model, content) {
        const contentId = extractParentContentId(content);

        const post = await this._getPost(contentId);

        if (post) {
            model.parents.post = contentId;
            model.parents.comment = null;
            model.nestedLevel = 1;
            model.ordering.byTime = Date.now().toString();
            return true;
        }

        let comment = await this._getComment(contentId);

        if (comment) {
            while (comment.parents.comment) {
                comment = await this._getComment(comment.parents.comment);
            }

            model.parents.post = comment.parents.post;
            model.parents.comment = comment.contentId;
            // 2 is a fixed nesting depth
            model.nestedLevel = 2;
            this._applyOrdering(model, comment);
            return true;
        }

        Logger.warn(`Comment's parent is not found:`, contentId);
        return false;
    }

    _applyOrdering(model, parentComment) {
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

    async _getPost(contentId) {
        return await PostModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            { contentId: true }
        );
    }

    async _getComment(contentId) {
        return await CommentModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            { contentId: true, parents: true, nestedLevel: true, 'ordering.byTime': true },
            { lean: true }
        );
    }
}

module.exports = Comment;
