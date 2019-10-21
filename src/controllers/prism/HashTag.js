const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const HashTagModel = require('../../models/HashTag');
const { extractContentId, isPost } = require('../../utils/content');

class HashTag extends Abstract {
    async handleCreate(content, { communityId }) {
        const model = await this._tryGetModel(content, { 'content.tags': true });

        if (!model) {
            return;
        }

        const newTags = await this._extractTags(content);

        model.content.tags = newTags;

        await model.save();
        await this.registerForkChanges({
            type: 'update',
            Model: HashTagModel,
            documentId: model._id,
            data: { $set: { 'content.tags': [] } },
        });

        await this._incrementTagsScore(newTags, communityId);
    }

    async handleUpdate(content, { communityId }) {
        const model = await this._tryGetModel(content, { 'content.tags': true });

        if (!model) {
            return;
        }

        const newTags = await this._extractTags(content);
        const recentTags = model.content.tags;

        model.content.tags = newTags;

        await model.save();
        await this.registerForkChanges({
            type: 'update',
            Model: HashTagModel,
            documentId: model._id,
            data: { $set: { 'content.tags': recentTags.toObject() } },
        });

        await this._decrementTagsScore(recentTags, communityId);
        await this._incrementTagsScore(newTags, communityId);
    }

    async handleDelete(content, { communityId }) {
        if (!(await isPost(content))) {
            return;
        }

        const model = await this._tryGetModel(content, { 'content.tags': true });

        if (!model) {
            return;
        }

        const recentTags = model.content.tags;

        await this._decrementTagsScore(recentTags, communityId);
    }

    _extractTagsFromBlockChain(content) {
        return content.tags;
    }

    async _tryGetModel(content, projection) {
        const contentId = extractContentId(content);
        const model = await PostModel.findOne(
            {
                'contentId.userId': contentId.userId,
                'contentId.permlink': contentId.permlink,
            },
            projection
        );

        if (!model) {
            Logger.warn('Unknown post', contentId);
        }

        return model;
    }

    async _incrementTagsScore(tags, communityId) {
        await this._changeTagsScore(tags, communityId, true);
    }

    async _decrementTagsScore(tags, communityId) {
        await this._changeTagsScore(tags, communityId, false);
    }

    async _changeTagsScore(tags, communityId, isIncrement) {
        for (const name of tags) {
            let countIncrement;

            if (isIncrement) {
                countIncrement = 1;
            } else {
                countIncrement = -1;
            }

            const previousModel = await HashTagModel.findOneAndUpdate(
                { communityId, name },
                { $inc: { count: countIncrement } },
                { upsert: true }
            );

            if (!previousModel) {
                continue;
            }

            await this.registerForkChanges({
                type: 'update',
                Model: HashTagModel,
                documentId: previousModel._id,
                data: {
                    $inc: { count: -countIncrement },
                },
            });
        }
    }
}

module.exports = HashTag;
