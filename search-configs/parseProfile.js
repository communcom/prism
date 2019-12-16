'use strict';

function parseProfile(doc) {
    var result = {};
    result.username = doc.username;

    return result;
}

module.exports = parseProfile;
