const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');
const { processContent, extractContentId } = require('../../utils/content');
const { lookUpCommunity } = require('../../utils/community');

const ALLOWED_POST_TYPES = ['basic', 'article'];

class Post extends Abstract {
    async handleCreate(content, { blockNum, blockTime }) {
        const contentId = extractContentId(content);
        const communityCode = content.commun_code;

        if (!(await lookUpCommunity(communityCode))) {
            Logger.warn(`Post into unknown community: ${communityCode},`, contentId);
            return;
        }

        if (await this._isTrash(contentId)) {
            return;
        }

        let processedContent = null;

        try {
            processedContent = await processContent(this, content, ALLOWED_POST_TYPES);
        } catch (err) {
            Logger.warn(`Invalid post content, block num: ${blockNum}`, contentId, err);
        }

        const model = await PostModel.create({
            communityCode,
            contentId,
            content: processedContent,
            meta: {
                creationTime: blockTime,
            },
            payout: {
                meta: {
                    curatorsPercent: Number(content.curators_prcnt),
                },
            },
        });

        await this.registerForkChanges({ type: 'create', Model: PostModel, documentId: model._id });
        await this.updateUserPostsCount(contentId.userId, 1);
    }

    async handleUpdate(content, { blockNum }) {
        const contentId = extractContentId(content);

        let updatedContent = null;

        try {
            updatedContent = await processContent(this, content, ALLOWED_POST_TYPES);
        } catch (err) {
            Logger.warn(`Invalid post content, block num: ${blockNum}`, contentId, err);
        }

        const previousModel = await PostModel.findOneAndUpdate(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            {
                $set: {
                    content: updatedContent,
                },
            }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: previousModel._id,
                data: {
                    $set: {
                        content: previousModel.content.toObject(),
                    },
                },
            });
        }
    }

    async handleDelete(content) {
        const contentId = extractContentId(content);
        const previousModel = await PostModel.findOneAndRemove({
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        if (previousModel) {
            await this.registerForkChanges({
                type: 'remove',
                Model: PostModel,
                documentId: previousModel._id,
                data: previousModel.toObject(),
            });
            await this.updateUserPostsCount(contentId.userId, -1);
        }
    }

    async updateUserPostsCount(userId, increment) {
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            { $inc: { 'stats.postsCount': increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: previousModel._id,
                data: { $inc: { 'stats.postsCount': -increment } },
            });
        }
    }

    async handleRemoveRepost({ rebloger: userId, ...content }, { communityId }) {
        const contentId = extractContentId(content);
        const previousModel = await PostModel.findOneAndRemove({
            communityId,
            'repost.userId': userId,
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
        });

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'remove',
            Model: PostModel,
            documentId: previousModel._id,
            data: previousModel.toObject(),
        });
    }

    async _getUniqueUrl(baseUrl) {
        let url = baseUrl;
        let postfix = 0;

        while (true) {
            const post = await PostModel.findOne(
                {
                    url,
                },
                { _id: true }
            );

            if (post) {
                break;
            } else {
                postfix++;
                url = `${baseUrl}-${postfix}`;
            }
        }

        return url;
    }
}

module.exports = Post;
