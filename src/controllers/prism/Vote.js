const lodash = require('lodash');
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const { extractContentId } = require('../../utils/content');

class Vote extends Abstract {
    async handleUpVote(content) {
        await this._handle(content, { up: 'add', down: 'remove' });
    }

    async handleDownVote(content) {
        await this._handle(content, { up: 'remove', down: 'add' });
    }

    async handleUnVote(content) {
        await this._handle(content, { up: 'remove', down: 'remove' });
    }

    async _handle(content, { up, down }) {
        const model = await this._getModel(content);

        if (!model) {
            return;
        }

        const vote = {
            userId: content.voter,
            weight: content.weight,
        };

        await this._manageVotes({ model, vote, type: 'up', action: up });
        await this._manageVotes({ model, vote, type: 'down', action: down });
    }

    async _getModel(content) {
        const contentId = extractContentId(content);

        const query = {
            'contentId.userId': contentId.userId,
            'contentId.permlink': contentId.permlink,
            'contentId.communityId': contentId.communityId,
        };

        const post = await PostModel.findOne(query, { _id: true });

        if (post) {
            return post;
        }

        const comment = await CommentModel.findOne(query, { _id: true });

        if (comment) {
            return comment;
        }

        return null;
    }

    async _manageVotes({ model, vote, type, action }) {
        const [addAction, removeAction, increment] = this._getArrayEntityCommands(action);
        const Model = model.constructor;
        const votesArrayPath = `votes.${type}Votes`;
        const votesCountPath = `votes.${type}Count`;
        let updateVoteObject = vote;

        if (addAction === '$pull') {
            updateVoteObject = { userId: vote.userId };
        }

        const previousModel = await Model.findOneAndUpdate(
            { _id: model._id },
            { [addAction]: { [votesArrayPath]: updateVoteObject } }
        );

        if (!previousModel) {
            return;
        }

        const previousVotes = lodash.get(previousModel, votesArrayPath);
        const inPreviousVotes = previousVotes.some(recentVote => recentVote.userId === vote.userId);

        if (
            (addAction === '$addToSet' && inPreviousVotes) ||
            (addAction === '$pull' && !inPreviousVotes)
        ) {
            return;
        }

        await Model.updateOne({ _id: model._id }, { $inc: { [votesCountPath]: increment } });

        let removeVoteObject = vote;

        if (removeAction === '$pull') {
            removeVoteObject = { userId: vote.userId };
        }

        await this.registerForkChanges({
            type: 'update',
            Model,
            documentId: previousVotes._id,
            data: {
                [removeAction]: { [votesArrayPath]: removeVoteObject },
                $inc: { [votesCountPath]: -increment },
            },
        });
    }
}

module.exports = Vote;
