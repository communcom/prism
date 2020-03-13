const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const { createCustomForkManager } = require('./services/ForkManager');
const Hot = require('./services/Hot');
const ImagesMetaUpdater = require('./services/ImagesMetaUpdater');

class Main extends BasicMain {
    constructor() {
        super(env);

        let prism;
        let imagesMeta;

        if (env.GLS_ENABLE_BLOCK_HANDLE) {
            const fork = createCustomForkManager();

            imagesMeta = new ImagesMetaUpdater();
            prism = new Prism({ imagesMeta });
            prism.setForkService(fork);

            this.addNested(fork, imagesMeta, prism);
        }

        const connector = new Connector({ prism });

        if (env.GLS_ENABLE_BLOCK_HANDLE) {
            prism.setConnector(connector);
            this.addNested(new Hot());
        }

        this.startMongoBeforeBoot(null, { poolSize: env.GLS_MONGO_POOL_SIZE });

        this.addNested(connector);
    }
}

module.exports = Main;
