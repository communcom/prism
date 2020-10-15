const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const PostModel = require('../../models/Post');

class Tags extends BasicController {
    async getTrendingTags({ limit, offset }) {
        const dayAgo = new Date(new Date().setDate(new Date().getDate() - 1));

        const aggregation = [
            {
                $match: {
                    'meta.creationTime': { $gte: dayAgo },
                    status: 'clean',
                    tags: { $ne: 'nsfw' },
                },
            },
            { $project: { _id: false, tags: true } },
            { $unwind: { path: '$tags' } },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $project: { _id: 0, name: '$_id', count: 1 } },
            { $sort: { count: -1 } },
            { $skip: offset },
            { $limit: limit },
        ];

        const items = await PostModel.aggregate(aggregation);

        return { items };
    }
}

module.exports = Tags;
