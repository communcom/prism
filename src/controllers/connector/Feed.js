const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Feed extends BasicController {
    getFeed() {
        // TODO: get some feed
    }
}

module.exports = Feed;
