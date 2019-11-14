const lodash = require('lodash');
const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const contentUtils = require('../../utils/content');

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
        const isPost = await contentUtils.isPost(content);

        let Model;
        if (isPost) {
            Model = PostModel;
        } else {
            Model = CommentModel;
        }

        const upVoteActions = {};
        const downVoteActions = {};

        if (up === 'add') {
            upVoteActions.inc = 1;
            upVoteActions.action = '$addToSet';
            upVoteActions.fork = '$pull';
        } else {
            upVoteActions.inc = -1;
            upVoteActions.action = '$pull';
            upVoteActions.fork = '$addToSet';
        }

        if (down === 'add') {
            downVoteActions.inc = 1;
            downVoteActions.action = '$addToSet';
            downVoteActions.fork = '$pull';
        } else {
            downVoteActions.inc = -1;
            downVoteActions.action = '$pull';
            downVoteActions.fork = '$addToSet';
        }

        const contentId = contentUtils.extractContentId(content);

        const { userId } = contentId.userId;

        const previousModel = await Model.findOneAndUpdate(
            { contentId },
            {
                [upVoteActions.action]: {
                    'votes.upVotes': userId,
                },
                [downVoteActions.action]: {
                    'votes.downVotes': userId,
                },
                $inc: {
                    'votes.upCount': upVoteActions.inc,
                    'votes.downCount': downVoteActions.inc,
                },
            }
        );

        if (!previousModel) {
            return;
        }

        this.registerForkChanges({
            type: 'update',
            Model,
            documentId: previousModel._id,
            data: {
                [upVoteActions.fork]: {
                    'votes.upVotes': userId,
                },
                [downVoteActions.fork]: {
                    'votes.downVotes': userId,
                },
                $inc: {
                    'votes.upCount': -upVoteActions.inc,
                    'votes.downCount': -downVoteActions.inc,
                },
            },
        }).catch(error => {
            console.error('Error during fork register', error);
            throw error;
        });

        // const vote = {
        //     userId: content.voter,
        //     weight: content.weight,
        // };
        //
        // await Promise.all([
        //     this._manageVotes({ model, vote, type: 'up', action: up }),
        //     this._manageVotes({ model, vote, type: 'down', action: down }),
        // ]);
    }

    async _getModel(content) {
        const contentId = contentUtils.extractContentId(content);

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

        this.registerForkChanges({
            type: 'update',
            Model,
            documentId: previousVotes._id,
            data: {
                [removeAction]: { [votesArrayPath]: removeVoteObject },
                $inc: { [votesCountPath]: -increment },
            },
        }).catch(error => {
            console.error('Error during fork register', error);
            throw error;
        });
    }
}

module.exports = Vote;
