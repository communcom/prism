const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');

class Profile extends BasicController {
    getProfile() {
        // TODO: get specific profile
    }

    suggestNames() {
        // TODO: suggest names based on input
    }
}

module.exports = Profile;
