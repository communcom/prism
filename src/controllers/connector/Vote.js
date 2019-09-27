const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Vote extends BasicController {
    getPostVotes() {
        // TODO: get a list of votes for the post
    }

    getCommentVotes() {
        // TODO: get a list of votes for the comment
    }
}

module.exports = Vote;
