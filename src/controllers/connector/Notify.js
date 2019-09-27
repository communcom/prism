const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Notify extends BasicController {
    getMeta() {
        // TODO: after MVP; get requested metadata
    }
}

module.exports = Notify;
