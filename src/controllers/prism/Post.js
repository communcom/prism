const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const ProfileModel = require('../../models/Profile');
const CommunityModel = require('../../models/Community');
const { processContent, extractContentId } = require('../../utils/content');
const { isCommunityExists } = require('../../utils/lookup');
const { calculateTracery } = require('../../utils/mosaic');

const ALLOWED_POST_TYPES = ['basic', 'article'];

class Post extends Abstract {
    async handleBan({ commun_code: communityId, message_id: messageId }) {
        const contentId = {
            communityId,
            userId: messageId.author,
            permlink: messageId.permlink,
        };

        const previousPostModel = await PostModel.findOneAndUpdate(
            { contentId },
            { $set: { status: 'banned', 'reports.status': 'closed' } }
        );

        if (previousPostModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: PostModel,
                documentId: previousPostModel._id,
                data: {
                    $set: {
                        status: previousPostModel.status,
                        'reports.status': previousPostModel.reports.status,
                    },
                },
            });

            const previousCommunityModel = await CommunityModel.findOneAndUpdate(
                { communityId: contentId.communityId },
                { $inc: { postsCount: -1 } }
            );

            const previousUserModel = await ProfileModel.findOneAndUpdate(
                { userId: contentId.userId },
                { $inc: { 'stats.postsCount': -1 } }
            );

            if (previousCommunityModel) {
                await this.registerForkChanges({
                    type: 'update',
                    Model: CommunityModel,
                    documentId: previousCommunityModel._id,
                    data: {
                        $inc: { postsCount: 1 },
                    },
                });
            }

            if (previousUserModel) {
                await this.registerForkChanges({
                    type: 'update',
                    Model: ProfileModel,
                    documentId: previousUserModel._id,
                    data: {
                        $inc: { 'stats.postsCount': 1 },
                    },
                });
            }
        }
    }

    async handleCreate(content, meta) {
        const contentId = extractContentId(content);
        const { communityId, userId, permlink } = contentId;

        const postCommunity = await CommunityModel.findOne(
            { communityId },
            { language: 1 },
            { lean: true }
        );

        if (!postCommunity) {
            Logger.warn(`New post into unknown community: ${communityId},`, contentId);
            return;
        }

        if (await this._isTrash(contentId)) {
            return;
        }

        const { document, tags } = await this._processPost(contentId, content, meta);

        const tracery = calculateTracery(userId, permlink);

        const model = await PostModel.create({
            communityId,
            contentId,
            document,
            tags,
            meta: {
                trxId: meta.trxId,
                creationTime: meta.blockTime,
                updateTime: meta.blockTime,
            },
            payout: {
                meta: {
                    // todo: take this from community settings
                    curatorsPercent: Number(content.curators_prcnt),
                },
            },
            mosaicState: {
                tracery,
            },
            votes: {
                upCount: 1,
                upVotes: [{ userId }],
            },
            language: postCommunity.language,
        });

        await this.registerForkChanges({ type: 'create', Model: PostModel, documentId: model._id });
        await this.updateUserPostsCount(contentId.userId, 1);
        await this.updateCommunityPostsCount(contentId.communityId, 1);
    }

    async handleUpdate(content, meta) {
        const contentId = extractContentId(content);

        const { document, tags } = await this._processPost(contentId, content, meta);

        const previousModel = await PostModel.findOneAndUpdate(
            {
                'contentId.communityId': contentId.communityId,
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            {
                $set: {
                    document,
                    tags,
                    'meta.updateTime': meta.blockTime,
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
                        document: previousModel.document.toObject(),
                        tags: previousModel.tags.toObject(),
                        'meta.updateTime': previousModel.meta.updateTime,
                    },
                },
            });
        }
    }

    async _processPost(contentId, content, meta) {
        const { communityId } = contentId;
        let document = null;
        let tags = [];

        try {
            ({ document, tags } = await processContent(this, content, ALLOWED_POST_TYPES));
        } catch (err) {
            Logger.warn(`Invalid post content, block num: ${meta.blockNum}`, contentId, err);
        }

        if (communityId === 'NSFW' || communityId === 'PORN') {
            if (!tags.includes('nsfw')) {
                tags.unshift('nsfw');
            }
        }

        return {
            document,
            tags,
        };
    }

    async handleDelete(content) {
        const contentId = extractContentId(content);
        const previousModel = await PostModel.findOneAndRemove({
            'contentId.communityId': contentId.communityId,
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
            await this.updateCommunityPostsCount(contentId.communityId, -1);
        }
    }

    async updateCommunityPostsCount(communityId, increment) {
        const previousModel = await CommunityModel.findOneAndUpdate(
            { communityId },
            { $inc: { postsCount: increment } }
        );

        if (previousModel) {
            await this.registerForkChanges({
                type: 'update',
                Model: CommunityModel,
                documentId: previousModel._id,
                data: { $inc: { postsCount: -increment } },
            });
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

    async handleRemoveRepost({ rebloger: userId, ...content }) {
        const contentId = extractContentId(content);
        const previousModel = await PostModel.findOneAndRemove({
            'repost.userId': userId,
            'contentId.communityId': contentId.communityId,
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
}

module.exports = Post;
