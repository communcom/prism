const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Comment extends BasicController {
    getComment() {
        // TODO: get specific comment
    }

    getComments() {
        // TODO: get comments fot specific post
    }
}

module.exports = Comment;
