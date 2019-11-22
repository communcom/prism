const Abstract = require('./Abstract');
const PostModel = require('../../models/Post');
const CommentModel = require('../../models/Comment');
const contentUtils = require('../../utils/content');
const { addFieldIsIncludes } = require('../../utils/mongodb');

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
        const contentId = contentUtils.extractContentId(content);

        let Model;
        if (isPost) {
            Model = PostModel;
        } else {
            Model = CommentModel;
        }

        const { voter: userId } = content;

        const [previousModel] = await Model.aggregate([
            { $match: { contentId } },
            { $project: { votes: 1 } },
            addFieldIsIncludes({
                newField: 'votes.hasUpVote',
                arrayPath: '$votes.upVotes.userId',
                value: userId,
            }),
            addFieldIsIncludes({
                newField: 'votes.hasDownVote',
                arrayPath: '$votes.downVotes.userId',
                value: userId,
            }),
        ]);

        if (!previousModel) {
            return;
        }

        const { hasUpVote, hasDownVote } = previousModel.votes;

        const upVoteActions = {};
        const downVoteActions = {};

        if (up === 'add') {
            if (!hasUpVote) {
                upVoteActions.inc = 1;
                upVoteActions.action = '$addToSet';
                upVoteActions.fork = '$pull';
            }
        } else {
            if (hasUpVote) {
                upVoteActions.inc = -1;
                upVoteActions.action = '$pull';
                upVoteActions.fork = '$addToSet';
            }
        }

        if (down === 'add') {
            if (!hasDownVote) {
                downVoteActions.inc = 1;
                downVoteActions.action = '$addToSet';
                downVoteActions.fork = '$pull';
            }
        } else {
            if (hasDownVote) {
                downVoteActions.inc = -1;
                downVoteActions.action = '$pull';
                downVoteActions.fork = '$addToSet';
            }
        }

        const updateQuery = {};

        if (upVoteActions.action) {
            updateQuery[upVoteActions.action] = {
                'votes.upVotes': { userId },
            };
        }

        if (downVoteActions.action) {
            updateQuery[downVoteActions.action] = {
                'votes.downVotes': { userId },
            };
        }

        if (upVoteActions.inc) {
            updateQuery.$inc['votes.upCount'] = upVoteActions.inc;
        }

        if (downVoteActions.inc) {
            updateQuery.$inc['votes.downCount'] = downVoteActions.inc;
        }

        await Model.update({ contentId }, updateQuery);

        if (!previousModel) {
            return;
        }

        this.registerForkChanges({
            type: 'update',
            Model,
            documentId: previousModel._id,
            data: {
                $set: {
                    [upVoteActions.fork]: {
                        'votes.upVotes': { userId },
                    },
                    [downVoteActions.fork]: {
                        'votes.downVotes': { userId },
                    },
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
    }

    _hasVotes({ model, userId }) {
        return {
            hasUpVote: model.votes.upVotes.includes({ userId }),
            hasDownVote: model.votes.downVotes.includes({ userId }),
        };
    }
}

module.exports = Vote;
