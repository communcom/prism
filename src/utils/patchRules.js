const { isNil } = require('lodash');

function patchRules(rules, patch) {
    rules = [...rules];

    for (const { type, data } of patch.actions) {
        switch (type) {
            case 'add': {
                const newRule = {
                    id: data.id,
                    title: data.title,
                    text: data.text,
                };

                const insertIndex = findIndex(rules, data);

                if (insertIndex === -1) {
                    rules.push(newRule);
                } else {
                    rules.splice(insertIndex, 0, newRule);
                }

                break;
            }

            case 'update': {
                const rule = rules.find(rule => rule.id === data.id);

                if (rule) {
                    if (!isNil(data.title)) {
                        rule.title = data.title;
                    }

                    if (!isNil(data.text)) {
                        rule.text = data.text;
                    }
                }

                break;
            }

            case 'remove':
                rules = rules.filter(rule => rule.id !== data.id);

                break;

            case 'move': {
                const index = rules.findIndex(rule => rule.id === data.id);

                if (index === -1) {
                    break;
                }

                const updatedRules = [...rules];
                const rule = updatedRules[index];
                updatedRules.splice(index, 1);

                const toIndex = findIndex(updatedRules, data);

                if (toIndex === -1) {
                    break;
                }

                updatedRules.splice(toIndex, 0, rule);

                rules = updatedRules;

                break;
            }

            default:
            // Do nothing
        }
    }

    return rules;
}

function findIndex(list, { afterId, beforeId }) {
    let insertIndex = -1;

    if (afterId) {
        const index = list.findIndex(rule => rule.id === afterId);

        if (index !== -1) {
            return index + 1;
        }
    }

    if (insertIndex === -1 && beforeId) {
        const index = list.findIndex(rule => rule.id === beforeId);

        if (index !== -1) {
            return index;
        }
    }

    return insertIndex;
}

module.exports = {
    patchRules,
};
