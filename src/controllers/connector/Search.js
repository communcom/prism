const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const env = require('../../data/env');
const escapeElastic = require('elasticsearch-sanitize');
const elasticsearch = require('elasticsearch');
const bodybuilder = require('bodybuilder');
const { Logger } = core.utils;
const { getPost } = require('../../utils/getPost');
const { getComment } = require('../../utils/getComment');
const { getCommunity } = require('../../utils/getCommunity');
const { getProfile } = require('../../utils/getProfile');

function sanitizeQueryString(qs) {
    return escapeElastic(qs);
}

class Search extends BasicController {
    constructor(...args) {
        super(...args);

        this._esclient = new elasticsearch.Client({
            host: env.GLS_SEARCH_CONNECTION_STRING,
        });
    }

    async _find({ queryString, limit = 5, offset = 0, entities }, { userId }) {
        let indexes = [];
        if (entities.includes('all')) {
            indexes = ['_all'];
        } else {
            indexes.push(...entities.map(entity => `commun.${entity}`));
        }

        queryString = sanitizeQueryString(queryString);
        queryString = `${queryString}*~`;

        const found = await this._querySearch(indexes, queryString, { limit, offset });

        const results = found.hits.hits;
        const resolvePromises = [];

        for (const item of results) {
            const [, entityType] = item._index.split('.');

            let promise;
            let type;

            switch (entityType) {
                case 'posts':
                    type = 'post';
                    promise = getPost(item._id, { userId });
                    break;
                case 'comments':
                    type = 'comment';
                    promise = getComment(item._id, { userId });
                    break;
                case 'communities':
                    type = 'community';
                    promise = getCommunity(item._id, { userId });
                    break;
                case 'profiles':
                    type = 'profile';
                    promise = getProfile(item._id, { userId });
                    break;
                default:
                    Logger.warn(`Entity type ${entityType} is not supported`);
            }

            if (promise) {
                resolvePromises.push(
                    promise.then(data => {
                        data.type = type;
                        return data;
                    })
                );
            }
        }

        const items = await Promise.all(resolvePromises);

        return {
            items,
            total: found.hits.total.value,
        };
    }

    async quickSearch({ queryString, limit, entities }, { userId }) {
        return await this._find({ queryString, limit, entities }, { userId });
    }

    async extendedSearch({ queryString, entities }, { userId }) {
        const result = {};
        for (const entity of Object.keys(entities)) {
            const { limit, offset } = entities[entity];

            result[entity] = await this._find(
                { queryString, limit, offset, entities: [entity] },
                { userId }
            );
        }

        return result;
    }

    async entitySearch({ queryString, entity, limit, offset }, { userId }) {
        return this._find({ queryString, entities: [entity], limit, offset }, { userId });
    }

    async _querySearch(indexes, queryString, { limit = 10, offset = 0 }) {
        const queryBody = bodybuilder()
            .query('query_string', { fields: [], query: queryString })
            .size(limit)
            .from(offset)
            .build();

        try {
            return await this._esclient.search({
                index: indexes,
                body: queryBody,
            });
        } catch (error) {
            Logger.error(error);
            throw error;
        }
    }
}

module.exports = Search;
