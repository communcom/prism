'use strict';

var PREFIXES = {
    tag: '#',
    mention: '@',
};

function getText(document) {
    var textParts = [];

    if (document.attributes.title) {
        textParts.push(document.attributes.title);
    }

    for (var i = 0; i < document.content.length; i++) {
        var node = document.content[i];

        if (node.type === 'paragraph') {
            for (var j = 0; j < node.content.length; j++) {
                var type = node.content[j].type;
                var content = node.content[j].content;
                textParts.push(''.concat(PREFIXES[type] || '').concat(content));
            }
        }
    }

    return textParts
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

function getTags(document) {
    var tags = [];
    for (var i = 0; i < document.content.length; i++) {
        var node = document.content[i];

        if (node.type === 'paragraph') {
            for (var j = 0; j < node.content.length; j++) {
                var type = node.content[j].type;
                if (type === 'tag') {
                    var content = node.content[j].content;
                    tags.push('#' + content);
                }
            }
        }
    }
    return tags;
}

function parseDoc(doc) {
    if (doc.document) {
        if (doc.document.article) {
            doc.document = getText(doc.document.article);
        } else {
            var document = getText(doc.document.body);
            var tags = getTags(doc.document.body);

            doc.document = document;
            doc.tags = tags;
        }
    }
}

function parsePost(doc) {
    parseDoc(doc);
    var result = {};
    result.communityId = doc.contentId.communityId;
    result.permlink = doc.contentId.permlink;
    result.document = doc.document;
    result.tags = doc.tags;

    return result;
}

module.exports = parsePost;
