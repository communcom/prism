const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Post extends BasicController {
    getPost() {
        // TODO: get specific post
    }
}

module.exports = Post;
