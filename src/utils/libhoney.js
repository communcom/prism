const { GLS_HONEYCOMB_KEY, GLS_HONEYCOMB_DATASET } = require('../data/env');
const Libhoney = require('libhoney');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

let hny;
if (GLS_HONEYCOMB_KEY && GLS_HONEYCOMB_DATASET) {
    hny = new Libhoney({
        writeKey: GLS_HONEYCOMB_KEY,
        dataset: GLS_HONEYCOMB_DATASET,
    });
} else {
    Logger.warn('Honeycomb is not enabled');
    hny = {
        newEvent: () => ({
            addField: () => {},
            send: () => {},
        }),
    };
}

module.exports = hny;
