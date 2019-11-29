const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;
const env = require('./data/env');
const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const Fork = require('./services/Fork');
const Hot = require('./services/Hot');

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

        this.startMongoBeforeBoot(null, { poolSize: env.GLS_MONGO_POOL_SIZE });

        this.addNested(new Hot());

        this.addNested(connector);
    }
}

module.exports = Main;
