const core = require('cyberway-core-service');
const { Service } = core.services;
const { Logger } = core.utils;
const ForkModel = require('../models/Fork');
const { reorderLeaders } = require('../utils/leaders');

class Fork extends Service {
    constructor() {
        super();

        this._running = false;
    }

    async wrapBlock(block, callback) {
        if (this._running) {
            throw new Error('Parallel block processing tried to start');
        }

        this._running = true;

        try {
            await this._initBlock(block);
            await callback(block);
            await this._finalizeBlock(block);
        } finally {
            this._running = false;
        }
    }

    async _initBlock({ blockNum, blockTime, sequence }) {
        await ForkModel.create({
            blockNum,
            blockTime,
            blockSequence: sequence,
            finalized: false,
        });
    }

    async _finalizeBlock({ blockNum }) {
        await ForkModel.updateOne(
            { blockNum },
            {
                $set: {
                    finalized: true,
                },
            }
        );
    }

    async registerChanges({ type, Model, documentId, data, meta }) {
        let revertItem;

        if (type === 'reorderLeaders') {
            revertItem = {
                type,
                meta,
            };
        } else {
            revertItem = {
                type,
                className: Model.modelName,
                documentId,
                data: data ? this._packData(data) : {},
            };
        }

        await ForkModel.findOneAndUpdate(
            {},
            { $push: { stack: revertItem } },
            { sort: { blockNum: -1 } }
        );
    }

    async revert(subscriber, baseBlockNum) {
        Logger.info('Revert on fork...');

        const documents = await ForkModel.find(
            {
                blockNum: {
                    $gte: baseBlockNum,
                },
            },
            {
                _id: true,
                blockNum: true,
                blockSequence: true,
                stack: true,
            },
            { sort: { blockNum: -1 }, lean: true }
        );

        const newBase = documents.pop();

        if (!newBase || newBase.blockNum !== baseBlockNum) {
            Logger.error('Critical Error! Not found base block in the fork data!');
            process.exit(1);
        }

        await this._revertBlocks(documents);

        await ForkModel.deleteMany({
            blockNum: {
                $gt: baseBlockNum,
            },
        });

        Logger.info('Revert on fork done!');
    }

    async _revertBlocks(blocks) {
        const reorderLeadersInCommunities = new Set();

        for (const block of blocks) {
            if (block.stack.length) {
                Logger.info(`Reverting block num: ${block.blockNum}`);
                await this._revertStack(block.stack, reorderLeadersInCommunities);
            }

            await ForkModel.deleteOne({ _id: block._id });
        }

        if (reorderLeadersInCommunities.size) {
            for (const communityId of reorderLeadersInCommunities.keys()) {
                try {
                    await reorderLeaders(communityId);
                } catch (err) {
                    Logger.error(`Community ${communityId} leaders reordering failed:`, err);
                }
            }
        }
    }

    async registerIrreversibleBlock({ blockNum }) {
        try {
            // Удаляем все записи до неоткатного блока и блока до него,
            // Запись о неоткатном блоке сохраняем, чтобы можно было до него откатиться.
            await ForkModel.deleteMany({
                blockNum: {
                    $lt: blockNum - 1,
                },
            });
        } catch (err) {
            Logger.warn("Can't clear outdated fork data:", err);
        }
    }

    async revertUnfinalizedBlocks(subscriber) {
        Logger.info('Revert unfinalized blocks...');

        const items = await ForkModel.find(
            {},
            {
                _id: true,
                blockNum: true,
                blockSequence: true,
                finalized: true,
                stack: true,
            },
            {
                sort: {
                    blockNum: -1,
                },
                limit: 10,
                lean: true,
            }
        );

        let lastFinalized = null;
        const unfinalized = [];

        for (const item of items) {
            if (item.finalized) {
                lastFinalized = item;
                break;
            }

            unfinalized.push(item);
        }

        if (!lastFinalized) {
            Logger.error('Fatal Error: Finalized block is not found');
            process.exit(1);
            return;
        }

        if (!unfinalized.length) {
            return;
        }

        await this._revertBlocks(unfinalized);

        await subscriber.setLastBlockMetaData({
            lastBlockNum: lastFinalized.blockNum,
            lastBlockSequence: lastFinalized.blockSequence,
        });
    }

    async _revertStack(stack, reorderLeadersInCommunities) {
        for (let i = stack.length - 1; i >= 0; i--) {
            const stackItem = stack[i];

            const { type, className, documentId, meta } = stackItem;

            if (type === 'reorderLeaders') {
                reorderLeadersInCommunities.add(meta.communityId);
                continue;
            }

            const data = this._unpackData(stackItem.data || {});
            const Model = require(`../models/${className}`);

            switch (type) {
                case 'create':
                    await Model.deleteOne({ _id: documentId });
                    break;

                case 'update':
                    await Model.updateOne({ _id: documentId }, data);
                    break;

                case 'remove':
                    await Model.create({ _id: documentId, ...data });
                    break;
            }
        }
    }

    _packData(data) {
        try {
            return this._packDataIteration(data, 0);
        } catch (err) {
            if (err === 'Too many recursion') {
                throw new Error(err);
            }

            throw err;
        }
    }

    _packDataIteration(data, iteration) {
        if (iteration > 20) {
            throw 'Too many recursion';
        }

        if (data && typeof data.toObject === 'function') {
            data = data.toObject();
        }

        if (data) {
            const specialKeys = [];

            for (const key of Object.keys(data)) {
                if (key.indexOf('$') === 0) {
                    specialKeys.push(key);
                }

                if (data[key] && typeof data[key] === 'object') {
                    this._packDataIteration(data[key], iteration + 1);
                }
            }

            for (const key of specialKeys) {
                data[`@${key}`] = data[key];

                delete data[key];
            }
        }

        return data;
    }

    _unpackData(data) {
        const specialKeys = [];

        for (const key of Object.keys(data)) {
            if (key.startsWith('@$')) {
                specialKeys.push(key);
            }

            if (data[key] && typeof data[key] === 'object') {
                this._unpackData(data[key]);
            }
        }

        for (const key of specialKeys) {
            data[key.substr(1)] = data[key];

            delete data[key];
        }

        return data;
    }
}

module.exports = Fork;
