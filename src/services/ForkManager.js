const core = require('cyberway-core-service');
const { ForkManager } = core.services;
const { Logger } = core.utils;
const { reorderLeaders } = require('../utils/leaders');

function createCustomForkManager() {
    return new ForkManager({
        resolveModel: modelName => require(`../models/${modelName}`),
        customActions: {
            reorderLeaders: {
                prepareItem: ({ type, meta }) => ({
                    type,
                    meta,
                }),
                revertItem: () => {}, // Noop
            },
        },
        afterBlocksRevert: async blocks => {
            const communities = new Set();

            // Batch reorderLeaders actions
            for (const block of blocks) {
                for (const { type, meta } of block.stack) {
                    if (type === 'reorderLeaders') {
                        communities.add(meta.communityId);
                    }
                }
            }

            if (communities.size) {
                for (const communityId of communities.keys()) {
                    try {
                        await reorderLeaders(communityId);
                    } catch (err) {
                        Logger.error(`Community ${communityId} leaders reordering failed:`, err);
                    }
                }
            }
        },
    });
}

module.exports = {
    createCustomForkManager,
};
