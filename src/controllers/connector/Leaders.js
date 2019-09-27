const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Leaders extends BasicController {
    getTop() {
        // TODO: get a list of top leaders of a community
    }

    getProposals() {
        // TODO: get a list of proposals created by leaders
    }
}

module.exports = Leaders;
