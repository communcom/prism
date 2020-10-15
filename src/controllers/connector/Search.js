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
const UserModel = require('../../models/Profile');
const PostModel = require('../../models/Post');
const CommunityModel = require('../../models/Community');
const CommentModel = require('../../models/Comment');

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

    async _find({ queryString, amongIds, limit = 5, offset = 0, entities }, { authUserId }) {
        let indexes = [];
        if (entities.includes('all')) {
            indexes = ['_all'];
        } else {
            indexes.push(...entities.map(entity => `commun.${entity}`));
        }

        queryString = sanitizeQueryString(queryString);
        queryString = `${queryString}*~`;

        const found = await this._querySearch(indexes, queryString, amongIds, { limit, offset });

        const results = found.hits.hits;
        const resolvePromises = [];

        for (const item of results) {
            const [, entityType] = item._index.split('.');

            let promise;
            let type;

            switch (entityType) {
                case 'posts':
                    type = 'post';
                    promise = getPost(item._id, { userId: authUserId });
                    break;
                case 'comments':
                    type = 'comment';
                    promise = getComment(item._id, { userId: authUserId });
                    break;
                case 'communities':
                    type = 'community';
                    promise = getCommunity(item._id, { userId: authUserId });
                    break;
                case 'profiles':
                    type = 'profile';
                    promise = getProfile(item._id, { userId: authUserId });
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

    async quickSearch({ queryString, limit, entities }, { userId: authUserId }) {
        return await this._find({ queryString, limit, entities }, { authUserId });
    }

    async extendedSearch({ queryString, entities }, { userId: authUserId }) {
        const entitiesList = [...Object.entries(entities)];
        const result = {};

        if (entitiesList.length === 0) {
            throw {
                code: 500,
                message: 'No search entities is found',
            };
        }

        await Promise.all(
            entitiesList.map(([entityName, params]) =>
                this._find(
                    {
                        queryString,
                        limit: params.limit,
                        offset: params.offset,
                        entities: [entityName],
                    },
                    { authUserId }
                ).then(results => {
                    result[entityName] = results;
                })
            )
        );

        return result;
    }

    async entitySearch(
        { queryString, entity, limit, offset, userId, communityId },
        { userId: authUserId }
    ) {
        const amongIds = [];
        if (userId || communityId) {
            switch (entity) {
                case 'posts': {
                    const query = { $and: [] };
                    if (userId) {
                        query.$and.push({ 'contentId.userId': userId });
                    }
                    if (communityId) {
                        query.$and.push({ 'contentId.communityId': communityId });
                    }
                    const ids = await PostModel.find(query, { _id: 1 });
                    amongIds.push(...ids.map(({ _id }) => _id));
                    break;
                }
                case 'comments': {
                    const query = { $and: [] };
                    if (userId) {
                        query.$and.push({ $or: [{ 'contentId.userId': userId }] });
                    }
                    if (communityId) {
                        query.$and.push({ 'contentId.communityId': communityId });
                    }
                    const ids = await CommentModel.find(query, { _id: 1 });
                    amongIds.push(...ids.map(({ _id }) => _id));
                    break;
                }
                case 'profiles': {
                    // todo: profiles
                    break;
                }
                case 'communities': {
                    const { subscriptions } = await UserModel.findOne(
                        { userId },
                        { 'subscriptions.communityIds': 1 }
                    );
                    const ids = await CommunityModel.find({
                        communityId: subscriptions.communityIds,
                    });
                    amongIds.push(...ids.map(({ _id }) => _id));
                    break;
                }
            }
        }

        return this._find(
            { queryString, entities: [entity], amongIds, limit, offset },
            { authUserId }
        );
    }

    async _querySearch(indexes, queryString, amongIds, { limit = 10, offset = 0 }) {
        // Android и iOS сохраняли теги с #
        if (queryString.indexOf('#') !== -1) {
            queryString = `${queryString} | ${queryString.replace(/^#/, '')}`;
        } else {
            queryString = `${queryString} | #${queryString}`;
        }

        let queryBody = bodybuilder().query('query_string', { fields: [], query: queryString });

        if (amongIds && amongIds.length > 0) {
            queryBody = queryBody.query('ids', 'values', amongIds);
        }

        queryBody = queryBody
            .sort('_id', 'desc')
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
