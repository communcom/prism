const core = require('cyberway-core-service');
const { Logger } = core.utils;
const { NESTED_COMMENTS_MAX_INDEX_DEPTH } = require('../../data/constants');
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const ProfileModel = require('../../models/Profile');
const { processContent, extractContentId, extractParentContentId } = require('../../utils/content');
const { isCommunityExists } = require('../../utils/lookup');
const { calculateTracery } = require('../../utils/mosaic');

class Comment extends Abstract {
    async handleBan({ commun_code: communityId, message_id: messageId }) {
        const contentId = {
            communityId,
            userId: messageId.author,
            permlink: messageId.permlink,
        };

        const previousCommentModel = await CommentModel.findOneAndUpdate(
            { contentId },
            { $set: { status: 'banned', 'reports.status': 'closed' } }
        );

        const previousProfileModel = await ProfileModel.findOneAndUpdate(
            { userId: contentId.userId },
            { $inc: { 'stats.commentsCount': -1 } }
        );

        if (previousCommentModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: CommentModel,
                documentId: previousCommentModel._id,
                data: {
                    $set: {
                        status: previousCommentModel.status,
                        'reports.status': previousCommentModel.reports.status,
                    },
                },
            });

            const previousParentPostModel = await PostModel.findOneAndUpdate(
                { contentId: previousCommentModel.parents.post },
                { $inc: { 'stats.commentsCount': -1 } }
            );

            if (previousParentPostModel) {
                await this.registerForkChanges({
                    type: 'update',
                    Model: PostModel,
                    documentId: previousParentPostModel._id,
                    data: {
                        $inc: { 'stats.commentsCount': -1 },
                    },
                });
            }

            if (previousProfileModel) {
                await this.registerForkChanges({
                    type: 'update',
                    Model: ProfileModel,
                    documentId: previousProfileModel._id,
                    data: {
                        $inc: { 'stats.commentsCount': -1 },
                    },
                });
            }
        }
    }

    async handleCreate(content, { blockNum, blockTime, trxId }) {
        const contentId = extractContentId(content);
        const { communityId, userId, permlink } = contentId;

        if (!(await isCommunityExists(communityId))) {
            Logger.warn(`New comment into unknown community: ${communityId},`, contentId);
            return;
        }

        if (
            await this._isTrash({
                permlink: contentId.permlink,
                userId: contentId.userId,
                parentUserId: content.parent_id.author,
                parentPermlink: content.parent_id.permlink,
            })
        ) {
            return;
        }

        const tracery = calculateTracery(userId, permlink);

        const modelData = {
            contentId,
            parents: {},
            meta: {
                trxId,
                creationTime: blockTime,
                updateTime: blockTime,
            },
            payout: {
                meta: {
                    curatorsPercent: Number(content.curators_prcnt),
                },
            },
            ordering: {},
            mosaicState: {
                tracery,
            },
            votes: {
                upCount: 1,
                upVotes: [{ userId }],
            },
        };

        if (!(await this.applyParentById(modelData, content))) {
            // Если не найден родитель то пропускаем комментарий.
            return;
        }

        try {
            const { document } = await processContent(this, content, ['comment']);

            modelData.document = document;
        } catch (err) {
            modelData.document = null;
            Logger.warn(`Invalid comment content, block num: ${blockNum}`, contentId, err);
        }

        const model = await CommentModel.create(modelData);

        let selfCommentsCountIncrement = 0;
        if (model.parents.post) {
            if (model.parents.post.userId === model.contentId.userId) {
                selfCommentsCountIncrement = 1;
            }
        }

        const finishingPromises = [
            this.registerForkChanges({
                type: 'create',
                Model: CommentModel,
                documentId: model._id,
            }),
            this.updatePostCommentsCount(model, 1, selfCommentsCountIncrement),
            this.updateUserCommentsCount(model.contentId.userId, 1),
        ];

        if (model.parents.comment) {
            finishingPromises.push(this.updateChildCommentsCount(model.parents.comment, 1));
        }

        Promise.all(finishingPromises).catch(error => {
            Logger.error('Error during comment parsing:', error);
            throw error;
        });
    }

    async handleUpdate(content, { blockNum, blockTime }) {
        const contentId = extractContentId(content);
        const updateFields = {
            'meta.updateTime': blockTime,
        };

        try {
            const { document } = await processContent(this, content, ['comment']);

            updateFields.document = document;
        } catch (err) {
            updateFields.document = null;
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
                    document: previousModel.document.toObject(),
                    'meta.updateTime': previousModel.meta.updateTime,
                },
            },
        });
    }

    async handleDelete(content) {
        const contentId = extractContentId(content);

        const previousModel = await CommentModel.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            {
                $set: { isDeleted: true, document: null },
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
                    isDeleted: previousModel.isDeleted,
                    document: previousModel.document,
                },
            },
        });
    }

    async updatePostCommentsCount(model, increment, selfCommentsIncrement) {
        const contentId = model.parents.post;
        const previousModel = await PostModel.findOneAndUpdate(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
                'contentId.communityId': contentId.communityId,
            },
            {
                $inc: {
                    'stats.commentsCount': increment,
                    'stats.selfCommentsCount': selfCommentsIncrement,
                },
            }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: previousModel._id,
                data: {
                    $inc: {
                        'stats.commentsCount': -increment,
                        'stats.selfCommentsCount': -selfCommentsIncrement,
                    },
                },
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
