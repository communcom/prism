const sleep = require('then-sleep');
const fetch = require('node-fetch');
const { get } = require('lodash');
const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const { Logger } = core.utils;

const { IMAGES_PROCESSING_STATUS } = require('../data/constants');
const env = require('../data/env');
const PostModel = require('../models/Post');
const CommentModel = require('../models/Comment');

const TICK_LIMIT = 20;

class ImagesMetaUpdater extends BasicService {
    constructor(...args) {
        super(...args);

        if (!env.GLS_IMAGE_HOSTER) {
            throw new Error('ImagesMetaUpdater: env GLS_IMAGE_HOSTER not specified');
        }

        this._processing = false;
        this._stop = false;
    }

    async start() {
        // Every 1 minute check anyway
        this._intervalId = setInterval(() => {
            if (!this._processing) {
                this._tick();
            }
        }, 60 * 1000);
    }

    async stop() {
        clearInterval(this._intervalId);
        this._stop = true;
    }

    updateAsync() {
        this._asyncUpdateRequested = true;

        if (!this._processing) {
            this._tick();
        }
    }

    async _tick() {
        if (this._processing || this._stop) {
            return;
        }

        this._asyncUpdateRequested = false;
        this._processing = true;
        let haveUnprocessed = true;

        try {
            haveUnprocessed = await this._process();
        } catch (err) {
            Logger.error('ImagesMetaUpdater: tick failed:', err);
            await sleep(1000);
        }

        this._processing = false;

        if (this._asyncUpdateRequested || haveUnprocessed) {
            await sleep(50);
            this._tick();
        }
    }

    async _process() {
        const [hasMorePosts, hasMoreComments] = await Promise.all([
            this._processCollection('post'),
            this._processCollection('comment'),
        ]);

        return hasMorePosts || hasMoreComments;
    }

    async _processCollection(type) {
        const Model = type === 'post' ? PostModel : CommentModel;

        const posts = await Model.find(
            { 'document.imagesProcessingStatus': IMAGES_PROCESSING_STATUS.NEED_PROCESSING },
            {
                contentId: true,
                'document.body': true,
                'document.article': true,
                updatedAt: true,
            },
            { lean: true, limit: TICK_LIMIT + 1 }
        );

        const processingResults = await Promise.all(
            posts.map(entry => this._processItem(Model, entry))
        );

        return posts.length > TICK_LIMIT || processingResults.some(result => !result);
    }

    async _processItem(Model, entry) {
        const coverUrl = get(entry, ['document', 'article', 'attributes', 'coverUrl']);

        if (coverUrl) {
            const info = await this._getInfo(coverUrl);

            for (const { attributes } of [entry.document.article, entry.document.body]) {
                attributes.coverMimeType = info.mimeType;
                attributes.coverWidth = info.width;
                attributes.coverHeight = info.height;
                attributes.coverSize = info.size;
            }
        }

        const doc = entry.document.article || entry.document.body;
        let hasError = false;

        for (const node of doc.content) {
            switch (node.type) {
                case 'image':
                    try {
                        await this._processImageNode(node);
                    } catch (err) {
                        hasError = true;
                        Logger.warn('Image hosting request failed:', err);
                    }
                    break;
                case 'attachments':
                    for (const attach of node.content) {
                        if (attach.type === 'image') {
                            try {
                                await this._processImageNode(attach);
                            } catch (err) {
                                hasError = true;
                                Logger.warn('Image hosting request failed:', err);
                            }
                        }
                    }
                    break;
                default:
                // Do nothing
            }
        }

        const updateResult = await Model.updateOne(
            {
                'contentId.communityId': entry.contentId.communityId,
                'contentId.userId': entry.contentId.userId,
                'contentId.permlink': entry.contentId.permlink,
                // Refresh only if entry does'n modified singe fetching
                updatedAt: entry.updatedAt,
            },
            {
                $set: {
                    'document.body': entry.document.body,
                    'document.article': entry.document.article,
                    'document.imagesProcessingStatus': hasError
                        ? IMAGES_PROCESSING_STATUS.PROCESSING_ERROR
                        : IMAGES_PROCESSING_STATUS.OK,
                },
            }
        );

        return updateResult.nModified > 0;
    }

    async _processImageNode(node) {
        const info = await this._getInfo(node.content);

        node.attributes = node.attributes || {};

        Object.assign(node.attributes, info);
    }

    async _getInfo(url) {
        const res = await fetch(`${env.GLS_IMAGE_HOSTER}/info/proxy/${url}`);

        if (!res.ok) {
            Logger.warn(`ImagesMetaUpdater: request failed: ${res.status}: ${res.statusText}`);
            throw new Error('Image hoster request failed');
        }

        const info = await res.json();

        if (!info.width) {
            Logger.error('Invalid image hoster response:', info);
            throw new Error('Invalid image hoster response');
        }

        return info;
    }
}

module.exports = ImagesMetaUpdater;
