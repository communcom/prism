const core = require('cyberway-core-service');
const { Logger, metrics } = core.utils;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Report = require('./Report');
const Vote = require('./Vote');
const Subscribe = require('./Subscribe');
const Leader = require('./Leader');
const LeaderProposals = require('./LeaderProposals');
const Community = require('./Community');
const CommunityPoints = require('./CommunityPoints');
const { isPost } = require('../../utils/content');
const env = require('../../data/env');

const Libhoney = require('libhoney');
const hny = new Libhoney({
    writeKey: env.GLS_HONEYCOMB_KEY,
    dataset: env.GLS_HONEYCOMB_DATASET,
    responseCallback: responses =>
        responses.forEach(response => {
            if (response.error) {
                console.error('Libhoney error:', response.error);
            }
        }),
});

const ALLOWED_CONTRACTS = [
    'cyber',
    'cyber.domain',
    'cyber.token',
    'cyber.msig',
    'c.list',
    'c.gallery',
    'c.social',
    'c.ctrl',
    'c.point',
];
class Main {
    constructor({ connector, forkService }) {
        this._post = new Post({ connector, forkService });
        this._comment = new Comment({ connector, forkService });
        this._profile = new Profile({ connector, forkService });
        this._vote = new Vote({ connector, forkService });
        this._report = new Report({ connector, forkService });
        this._subscribe = new Subscribe({ connector, forkService });
        this._leader = new Leader({ connector, forkService });
        this._leaderProposals = new LeaderProposals({ connector, forkService });
        this._communityPoints = new CommunityPoints({ connector, forkService });
        this._community = new Community({ connector, forkService });

        this.actions = [];

        this._newUsernameActions = [];
        this._pointActions = [];

        this._communityCreateActions = [];
        this._socialActions = [];

        this._postCreateActions = [];
        this._communityActions = [];
        this._ctrlActions = [];

        this._commentCreateActions = [];

        this._galleryActions = [];
    }

    async disperse({ transactions, blockNum, blockTime }) {
        const newBlockEvent = hny.newEvent().addField('blockNum', blockNum);
        newBlockEvent.send();

        const startTime = Date.now();
        const blockHandleHoneyEvent = hny.newEvent();

        blockHandleHoneyEvent.metadata = { blockNum, blockTime };
        blockHandleHoneyEvent.addField('startTime', startTime);

        for (let { actions } of transactions) {
            actions = actions.filter(action => {
                if (
                    ALLOWED_CONTRACTS.includes(action.code) &&
                    ALLOWED_CONTRACTS.includes(action.receiver)
                ) {
                    return action;
                }
            });
            this.actions.push(...actions);
        }

        for (const action of this.actions) {
            await this._disperseAction(action, { blockNum, blockTime });
        }

        const flow = {
            usernamesPoints: [...this._newUsernameActions, ...this._pointActions],
            communityAndSocial: [...this._communityCreateActions, ...this._socialActions],
            postsCommunitiesCtrl: [
                ...this._postCreateActions,
                ...this._communityActions,
                ...this._ctrlActions,
            ],
            comments: [...this._commentCreateActions],
            gallery: [...this._galleryActions],
        };

        for (const stageKey of Object.keys(flow)) {
            const start = Date.now();
            await Promise.all(flow[stageKey].map(wrappedAction => wrappedAction()));

            const delta = Date.now() - start;
            const newBlockEvent = hny.newEvent();
            newBlockEvent.addField('stageKey', stageKey);
            newBlockEvent.addField('stageDelta', delta);
            newBlockEvent.send();
        }

        this._newUsernameActions = [];
        this._pointActions = [];

        this._communityCreateActions = [];
        this._socialActions = [];

        this._postCreateActions = [];
        this._communityActions = [];
        this._ctrlActions = [];

        this._commentCreateActions = [];

        this._galleryActions = [];

        this.actions = [];

        const endTime = Date.now();
        blockHandleHoneyEvent.addField('endTime', endTime);
        blockHandleHoneyEvent.addField('deltaTime', endTime - startTime);
        blockHandleHoneyEvent.send();
    }

    async _disperseAction(action, { blockNum, blockTime }) {
        const pathName = [action.code, action.action].join('->');
        const communityId = this._extractCommunityId(action);
        const actionArgs = action.args;
        const events = action.events;

        const meta = {
            communityId,
            blockNum,
            blockTime,
            events,
        };

        switch (pathName) {
            case 'c.list->create':
                this._communityCreateActions.push(() => {
                    return this._community.handleCreate(actionArgs);
                });
                break;

            case 'c.list->setinfo':
                this._communityActions.push(() => {
                    return this._community.handleAddInfo(actionArgs);
                });
                break;

            case 'c.list->follow':
                this._communityActions.push(() => {
                    return this._community.handleFollowUnfollow(actionArgs, 'follow');
                });
                break;

            case 'c.list->unfollow':
                this._communityActions.push(() => {
                    return this._community.handleFollowUnfollow(actionArgs, 'unfollow');
                });
                break;

            case 'c.list->hide':
                // add community into user's blacklist
                this._communityActions.push(() => {
                    return this._community.handleHideUnhide(actionArgs, 'hide');
                });
                break;

            case 'c.list->unhide':
                // remove community from user's blacklist
                this._communityActions.push(() => {
                    return this._community.handleHideUnhide(actionArgs, 'hide');
                });
                break;

            case 'c.list->setappparams':
                // community settings
                // leaders of commun can change them
                this._communityActions.push(() => {
                    return this._community.handleSettings(actionArgs);
                });
                break;

            case 'c.list->setsysparams':
                // community settings
                // can be changed by commun.com
                this._communityActions.push(() => {
                    return this._community.handleSettings(actionArgs);
                });

                break;

            case 'c.list->setparams':
                // community settings
                // leaders can change these
                this._communityActions.push(() => {
                    return this._community.handleSettings(actionArgs);
                });

                break;

            case 'c.list->ban':
                // ban user in community
                this._communityActions.push(() => {
                    return this._community.handleBanUnban(actionArgs, 'ban');
                });
                break;

            case 'c.list->unban':
                // unban user in community
                this._communityActions.push(() => {
                    return this._community.handleBanUnban(actionArgs, 'unban');
                });
                break;

            case `cyber.domain->newusername`:
                this._newUsernameActions.push(() => {
                    return this._profile.handleUsername(actionArgs, meta);
                });
                break;

            // В данный момент не обрабатывается
            // case `${communityId}.publish->paymssgrwrd`:
            //     await this._post.handlePayout(actionArgs, meta);
            //     break;

            case 'c.gallery->create':
                if (actionArgs.parent_id && actionArgs.parent_id.permlink) {
                    this._commentCreateActions.push(() => {
                        return this._comment.handleCreate(actionArgs, meta);
                    });
                } else {
                    this._postCreateActions.push(() => {
                        return this._post.handleCreate(actionArgs, meta);
                    });
                    // Временно не обрабатываем
                    // await this._hashTag.handleCreate(actionArgs, meta);
                }
                break;

            case 'c.gallery->update':
                if (await isPost(actionArgs)) {
                    this._galleryActions.push(() => {
                        return this._post.handleUpdate(actionArgs, meta);
                    });
                    // Временно не обрабатываем
                    // await this._hashTag.handleUpdate(actionArgs, meta);
                } else {
                    this._galleryActions.push(() => {
                        return this._comment.handleUpdate(actionArgs, meta);
                    });
                }
                break;

            case 'c.gallery->remove':
                // Warning - do not change ordering
                // await this._hashTag.handleDelete(actionArgs, meta);
                this._galleryActions.push(() => {
                    return this._post.handleDelete(actionArgs, meta);
                });
                this._galleryActions.push(() => {
                    return this._comment.handleDelete(actionArgs, meta);
                });
                break;

            case 'c.gallery->report':
                this._galleryActions.push(() => {
                    return this._report.handleReport(actionArgs);
                });
                break;

            case 'c.gallery->upvote':
                this._galleryActions.push(() => {
                    return this._vote.handleUpVote(actionArgs, meta);
                });
                break;

            case 'c.gallery->downvote':
                this._galleryActions.push(() => {
                    return this._vote.handleDownVote(actionArgs, meta);
                });
                break;

            case 'c.gallery->unvote':
                this._galleryActions.push(() => {
                    return this._vote.handleUnVote(actionArgs, meta);
                });
                break;

            case 'c.gallery->ban':
                // message payout ban
                this._galleryActions.push(() => {
                    return this._report.handleBan(actionArgs);
                });
                this._galleryActions.push(() => {
                    return this._comment.handleBan(actionArgs);
                });
                this._galleryActions.push(() => {
                    return this._post.handleBan(actionArgs);
                });
                break;

            case 'c.gallery->mosaicchop':
                // when post is closed
                // todo: handle this
                break;
            case 'c.gallery->gemstate':
                // when vote state changed; info about users' rewards
                // todo: handle this
                break;

            case 'c.gallery->gemchop':
                // when vote erased
                // todo: handle this
                break;

            case 'c.gallery->lock':
                // locking post
                // todo: handle this
                break;

            case 'c.gallery->unlock':
                // unlocking post
                // todo: handle this
                break;

            case 'c.social->updatemeta':
                this._socialActions.push(() => {
                    return this._profile.handleMeta(actionArgs, meta);
                });
                break;

            case 'c.social->pin':
                this._socialActions.push(() => {
                    return this._subscribe.pin(actionArgs, meta);
                });
                break;

            case 'c.social->unpin':
                this._socialActions.push(() => {
                    return this._subscribe.unpin(actionArgs);
                });
                break;

            case 'c.social->block':
                this._socialActions.push(() => {
                    return this._subscribe.block(actionArgs);
                });
                break;

            case 'c.social->unblock':
                this._socialActions.push(() => {
                    return this._subscribe.unblock(actionArgs);
                });
                break;

            case 'c.point->create':
                this._pointActions.push(() => {
                    return this._communityPoints.createPoint(actionArgs, meta);
                });
                break;

            // case `${communityId}.publish->erasereblog`:
            //     await this._post.handleRemoveRepost(actionArgs, meta);
            //     break;

            default:
            // unknown action, do nothing
        }

        switch (action.code) {
            // case 'c.point':
            //     this._pointActions.push(
            //         ()=>{this._processPoint, action.action(actionArgs, meta)}
            //     );
            //     break;

            case 'c.ctrl':
                this._ctrlActions.push(() => {
                    return this._leader.processAction(action.action, actionArgs, meta);
                });
                this._ctrlActions.push(() => {
                    return this._leaderProposals.processAction(action.action, actionArgs, meta);
                });
                break;
        }
    }

    _extractCommunityId(action) {
        const calledCodeName = action.code;

        return calledCodeName.split('.')[0];
    }
}

module.exports = Main;
