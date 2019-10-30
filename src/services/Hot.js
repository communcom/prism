const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const env = require('../data/env');
const PostModel = require('../models/Post');

class HotCache extends BasicService {
    constructor(...args) {
        super(...args);
        this.previousPeriodPostValues = new Map();
        this.actualPosts = new Set();
    }

    async start() {
        await this.startLoop(0, env.GLS_HOT_REBUILD_INTERVAL_MINUTES * 60 * 1000);
    }

    async stop() {
        this.stopLoop();
    }

    async iteration() {
        this.actualPosts = new Set();

        const now = Date.now();
        const scope = 1000 * 60 * 60 * env.GLS_HOT_SCOPE_HOURS;
        const startDate = now - scope;

        const relevantPosts = await this._prepareRelevantPosts({ startDate });

        let commentsSystemTotalCount = 0;
        let downVotesSystemTotalCount = 0;
        let upVotesSystemTotalCount = 0;

        for (const post of relevantPosts) {
            this.actualPosts.add(post._id);

            const commentsCount = post.stats.commentsCount;
            const upVotesCount = post.votes.upCount;
            const downVotesCount = post.votes.downCount;

            const prevPeriodData = this.previousPeriodPostValues.get(post._id.toString());

            if (prevPeriodData) {
                post.upVotesPostPeriodCount = upVotesCount - prevPeriodData.upVotesPostPeriodCount;
                post.downVotesPostPeriodCount =
                    downVotesCount - prevPeriodData.downVotesPostPeriodCount;
                post.commentsPostPeriodCount =
                    commentsCount - prevPeriodData.commentsPostPeriodCount;
            } else {
                post.upVotesPostPeriodCount = upVotesCount;
                post.downVotesPostPeriodCount = downVotesCount;
                post.commentsPostPeriodCount = commentsCount;
            }

            this.previousPeriodPostValues.set(post._id.toString(), post);

            commentsSystemTotalCount += commentsCount;
            upVotesSystemTotalCount += upVotesCount;
            downVotesSystemTotalCount += downVotesCount;
        }

        const promises = [];
        for (const post of relevantPosts) {
            const hot = this.calcHot({
                upVotesPostPeriodCount: post.upVotesPostPeriodCount,
                downVotesPostPeriodCount: post.downVotesPostPeriodCount,
                upVotesPostTotalCount: post.votes.upCount,
                downVotesPostTotalCount: post.votes.downCount,
                commentsPostPeriodCount: post.commentsPostPeriodCount,
                commentsPostTotalCount: post.stats.commentsCount,
                upVotesSystemTotalCount,
                downVotesSystemTotalCount,
                commentsSystemTotalCount,
            });

            promises.push(
                PostModel.update(
                    { _id: post._id },
                    {
                        $set: {
                            hot,
                        },
                    }
                )
            );
        }

        await Promise.all(promises);
        this.clearNonActualPosts();
    }

    async _prepareRelevantPosts({ startDate }) {
        const match = { 'meta.creationTime': { $gte: new Date(startDate) } };
        const projection = {
            _id: true,
            'stats.commentsCount': true,
            'votes.upCount': true,
            'votes.downCount': true,
        };

        const aggregation = [{ $match: match }, { $project: projection }];

        return await PostModel.aggregate(aggregation);
    }

    calcHot({
        upVotesPostPeriodCount,
        downVotesPostPeriodCount,
        upVotesPostTotalCount,
        downVotesPostTotalCount,
        commentsPostPeriodCount,
        commentsPostTotalCount,
        upVotesSystemTotalCount,
        downVotesSystemTotalCount,
        commentsSystemTotalCount,
    }) {
        // making sure that this is not 0
        commentsSystemTotalCount = commentsSystemTotalCount || 1;

        const votesSystemTotalCount = upVotesSystemTotalCount + downVotesSystemTotalCount;
        const commentsWeightMultiplier = votesSystemTotalCount / commentsSystemTotalCount;

        const positiveVotesPostPeriodWeight = upVotesPostPeriodCount - downVotesPostPeriodCount;
        const commentsPostPeriodWeight = commentsPostPeriodCount * commentsWeightMultiplier;
        const postPeriodWeight = positiveVotesPostPeriodWeight + commentsPostPeriodWeight;

        const positiveVotesTotalWeight = upVotesPostTotalCount - downVotesPostTotalCount;
        const commentsPostTotalWeight = commentsPostTotalCount * commentsWeightMultiplier;
        const postTotalWeight = positiveVotesTotalWeight + commentsPostTotalWeight;

        return new postPeriodWeight() / (Math.log10(Math.abs(postTotalWeight)) || 1);
    }

    clearNonActualPosts() {
        for (const postId of this.previousPeriodPostValues.keys()) {
            if (!this.actualPosts.has(postId)) {
                this.previousPeriodPostValues.delete(postId);
            }
        }
    }
}

module.exports = HotCache;
