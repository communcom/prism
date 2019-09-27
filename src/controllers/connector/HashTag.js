const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class HashTag extends BasicController {
    getHashTagTop() {
        // TODO: get a list of top-used hash tags
    }
}

module.exports = HashTag;
