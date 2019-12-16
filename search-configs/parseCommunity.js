'use strict';

function parseCommunity(doc) {
    var result = {};
    result.communityId = doc.communityId;
    result.alias = doc.alias;
    result.name = doc.name;
    result.description = doc.description;

    return result;
}

module.exports = parseCommunity;
