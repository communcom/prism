const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;
const { Logger } = core.utils;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const SearchSync = require('./services/SearchSync');
const Fork = require('./services/Fork');
const Hot = require('./services/Hot');
const ServiceMetaModel = require('./models/ServiceMeta');
const Post = require('./models/Post');

class Main extends BasicMain {
    constructor() {
        super(env);

        let prism;

        if (env.GLS_ENABLE_BLOCK_HANDLE) {
            const fork = new Fork();

            prism = new Prism();
            prism.setForkService(fork);

            this.addNested(fork, prism);
        }

        const connector = new Connector({ prism });

        if (env.GLS_ENABLE_BLOCK_HANDLE) {
            prism.setConnector(connector);
        }

        this.startMongoBeforeBoot(null, { poolSize: 100 });

        if (env.GLS_ENABLE_PUBLIC_API && env.GLS_SEARCH_ENABLED) {
            this.addNested(new SearchSync());
        }

        this.addNested(new Hot());

        this.addNested(connector);
    }

    async boot() {
        await this._setDbQueryMemoryLimit();
        await this._initMetadata();
    }

    async _setDbQueryMemoryLimit() {
        try {
            await Post.db.db.command({
                setParameter: 1,
                internalQueryExecMaxBlockingSortBytes: env.GLS_MAX_QUERY_MEMORY_LIMIT,
            });
        } catch (err) {
            Logger.warn('Can`t set MongoDB memory limit');
        }
    }

    async _initMetadata() {
        if ((await ServiceMetaModel.countDocuments()) === 0) {
            const model = new ServiceMetaModel();

            await model.save();
        }
    }
}

module.exports = Main;
