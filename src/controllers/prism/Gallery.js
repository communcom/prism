const core = require('cyberway-core-service');
const { Logger } = core.utils;
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');

const MODELS = {
    post: PostModel,
    comment: CommentModel,
    unknown: 'unknown',
};

class Gallery extends Abstract {
    async handleMosaicState(state) {
        const { tracery } = state;
        const modelType = await this._getModelType(tracery);

        if (modelType === MODELS.unknown) {
            Logger.warn('Unknown tracery', tracery);
            return;
        }

        const previousModel = await MODELS[modelType].findOneAndUpdate(
            {
                'mosaicState.tracery': tracery,
            },
            {
                $set: {
                    mosaicState: {
                        tracery,
                        collectionEnd: state.collection_end_date,
                        gemCount: state.gem_count,
                        shares: state.shares,
                        damnShares: state.damn_shares,
                        reward: state.reward,
                        banned: state.banned,
                    },
                },
            }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: MODELS[modelType],
            documentId: previousModel._id,
            data: {
                $set: {
                    mosaicState: previousModel.mosaicState.toObject(),
                },
            },
        });
    }

    async _getModelType(tracery) {
        const postModel = await PostModel.findOne({
            'mosaicState.tracery': tracery,
        });

        if (postModel) {
            return 'post';
        }

        const commentModel = await CommentModel.findOne({
            'mosaicState.tracery': tracery,
        });

        if (commentModel) {
            return 'comment';
        }

        return 'unknown';
    }
}

module.exports = Gallery;
