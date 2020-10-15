const { uniq } = require('lodash');
const urlValidator = require('valid-url');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

const { IMAGES_PROCESSING_STATUS } = require('../data/constants');
const PostModel = require('../models/Post');

const EMBED_TYPES = ['image', 'video', 'embed', 'website'];
const IFRAMELY_TYPES = ['video', 'embed', 'website'];

function extractContentId(content) {
    const { author, permlink } = content.message_id;

    return {
        communityId: content.commun_code,
        userId: author,
        permlink,
    };
}

function extractParentContentId(content) {
    const { author, permlink } = content.parent_id;

    if (!author) {
        return null;
    }

    return {
        communityId: content.commun_code,
        userId: author,
        permlink,
    };
}

async function isPost(content) {
    const id = content.parent_id;

    if (id) {
        return !id.author;
    }

    const contentId = extractContentId(content);
    const postCount = await PostModel.countDocuments({
        'contentId.userId': contentId.userId,
        'contentId.permlink': contentId.permlink,
    });

    return postCount > 0;
}

async function processContent(connector, data, allowedTypes) {
    const doc = JSON.parse(data.body);
    const tags = uniq(data.tags).map(tag => tag.replace(/^#/, '').toLowerCase());
    let metadata = {};

    try {
        metadata = JSON.parse(data.metadata);
    } catch {}

    delete doc.attributes.title;

    // Заголовок из структры БЧ имеет приоритет над заголовком из схемы поста.
    if (data.header) {
        doc.attributes.title = data.header;
    }

    const { type = 'basic' } = doc.attributes;

    if (!allowedTypes.includes(type)) {
        return {
            document: null,
            tags,
        };
    }

    switch (type) {
        case 'basic':
        case 'comment': {
            doc.content = doc.content.filter(
                ({ type }) => type === 'paragraph' || type === 'attachments'
            );

            let imagesProcessingStatus = IMAGES_PROCESSING_STATUS.OK;

            const attachments = doc.content.find(({ type }) => type === 'attachments');

            if (attachments) {
                attachments.content = await processEmbeds(connector, attachments.content);
                if (attachments.content.some(({ type }) => type === 'image')) {
                    imagesProcessingStatus = IMAGES_PROCESSING_STATUS.NEED_PROCESSING;
                }
            }

            return {
                document: {
                    type,
                    body: doc,
                    article: null,
                    metadata,
                    textLength: countSymbols(doc),
                    imagesProcessingStatus,
                },
                tags,
            };
        }

        case 'article': {
            doc.content = doc.content.filter(({ type }) => type !== 'attachments');

            doc.content = await processEmbeds(connector, doc.content);

            const imagesProcessingStatus = doc.content.some(({ type }) => type === 'image')
                ? IMAGES_PROCESSING_STATUS.NEED_PROCESSING
                : IMAGES_PROCESSING_STATUS.OK;

            return {
                document: {
                    type,
                    body: {
                        ...doc,
                        content: [],
                    },
                    article: doc,
                    metadata,
                    textLength: countSymbols(doc),
                    imagesProcessingStatus,
                },
                tags,
            };
        }

        default:
            return {
                document: null,
                tags,
            };
    }
}

async function processEmbeds(connector, originalItems) {
    let items = originalItems;
    let lastId = 0;

    items = items.filter(item => {
        if (EMBED_TYPES.includes(item.type)) {
            if (!urlValidator.isUri(item.content)) {
                Logger.warn('Invalid embed url:', item);
                return false;
            }
        }

        return true;
    });

    for (const item of items) {
        item._id = ++lastId;
    }

    const embeds = await getEmbedsInfo(
        connector,
        items.filter(({ type }) => IFRAMELY_TYPES.includes(type))
    );

    items = items.map(item => {
        if (!IFRAMELY_TYPES.includes(item.type)) {
            return item;
        }

        const embed = embeds.get(item._id);

        if (embed) {
            return {
                id: item.id,
                type: embed.type,
                content: item.content,
                attributes: embed.attributes,
            };
        } else {
            return {
                id: item.id,
                type: 'website',
                content: item.content,
                attributes: {},
            };
        }
    });

    for (const item of items) {
        delete item._id;
    }

    return items;
}

async function getEmbedsInfo(connector, items) {
    const results = new Map();

    await Promise.all(
        items.map(async attach => {
            try {
                const embedData = await connector.callService('embedsCache', 'getEmbed', {
                    type: 'oembed',
                    url: attach.content,
                });

                let type = embedData.type;

                if (type === 'link') {
                    type = 'website';
                }

                delete embedData.type;
                delete embedData.version;

                results.set(attach._id, {
                    type,
                    attributes: embedData,
                });
            } catch (err) {
                Logger.warn('getEmbed failed for', attach.content, err);
            }
        })
    );
    return results;
}

function countSymbols(document) {
    try {
        let symbolsCount = 0;

        for (const block of document.content) {
            if (block.type === 'paragraph') {
                for (const node of block.content) {
                    switch (node.type) {
                        case 'text':
                        case 'link':
                            symbolsCount += node.content.length;
                            break;

                        case 'tag':
                        case 'mention':
                            // +1 because of adding symbol @ before username, and # before tag
                            symbolsCount += node.content.length + 1;
                            break;

                        default:
                    }
                }
            }
        }

        return symbolsCount;
    } catch (err) {
        Logger.warn('countSymbols failed:', err);
        return 0;
    }
}

module.exports = {
    extractContentId,
    extractParentContentId,
    isPost,
    processContent,
    processEmbeds,
};
