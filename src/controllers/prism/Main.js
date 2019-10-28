const core = require('cyberway-core-service');
const { Logger, metrics } = core.utils;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Report = require('./Report');
const Vote = require('./Vote');
const Subscribe = require('./Subscribe');
const HashTag = require('./HashTag');
const Leader = require('./Leader');
const Community = require('./Community');
const CommunitySettings = require('./CommunitySettings');
const CommunityPoints = require('./CommunityPoints');
const Gallery = require('./Gallery');
const { isPost } = require('../../utils/content');

const ACTION_PROCESSING_WARNING_LIMIT = 1000;

const ALLOWED_CONTRACTS = [
    'cyber',
    'cyber.domain',
    'cyber.token',
    'cyber.msig',
    'comn.list',
    'comn.gallery',
    'comn.social',
    'comn.ctrl',
    'comn.point',
];
class Main {
    constructor({ connector, forkService }) {
        this._post = new Post({ connector, forkService });
        this._comment = new Comment({ connector, forkService });
        this._profile = new Profile({ connector, forkService });
        this._vote = new Vote({ connector, forkService });
        this._report = new Report({ connector, forkService });
        this._subscribe = new Subscribe({ connector, forkService });
        // this._hashTag = new HashTag({ connector, forkService });
        this._leader = new Leader({ connector, forkService });
        this._communitySettings = new CommunitySettings({ connector, forkService });
        this._communityPoints = new CommunityPoints({ connector, forkService });
        this._community = new Community({ connector, forkService });
        this._gallery = new Gallery({ connector, forkService });
    }

    async disperse({ transactions, blockNum, blockTime }) {
        const end = metrics.startTimer('block_dispersing_time');

        for (const transaction of transactions) {
            let previous;

            if (!transaction || !transaction.actions) {
                return;
            }

            for (const action of transaction.actions) {
                const start = Date.now();
                await this._disperseAction(action, previous, { blockNum, blockTime });
                const delta = Date.now() - start;

                if (delta > ACTION_PROCESSING_WARNING_LIMIT) {
                    Logger.warn(
                        `Slow transaction action processing (>${ACTION_PROCESSING_WARNING_LIMIT}ms),`,
                        `blockNum: ${blockNum}, trxId: ${transaction.id},`,
                        `action: ${action.code}->${action.action}`
                    );
                }
                previous = action;
            }
        }

        end();
    }

    async _disperseAction(action, previous = { args: {} }, { blockNum, blockTime }) {
        if (
            !ALLOWED_CONTRACTS.includes(action.code) ||
            !ALLOWED_CONTRACTS.includes(action.receiver)
        ) {
            return;
        }

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
            case 'comn.list->create':
                await this._community.handleCreate(actionArgs);
                break;

            case 'comn.list->setinfo':
                await this._community.handleAddInfo(actionArgs);
                break;

            case 'comn.list->follow':
                await this._community.handleFollowUnfollow(actionArgs, 'follow');
                break;

            case 'comn.list->unfollow':
                await this._community.handleFollowUnfollow(actionArgs, 'unfollow');
                break;

            case 'comn.list->hide':
                // add community into user's blacklist
                await this._community.handleHideUnhide(actionArgs, 'hide');
                break;

            case 'comn.list->unhide':
                // remove community from user's blacklist
                await this._community.handleHideUnhide(actionArgs, 'hide');
                break;

            case 'comn.list->setappparams':
                // community settings
                // leaders of commun can change them
                await this._community.handleSettings(actionArgs);
                break;

            case 'comn.list->setsysparams':
                // community settings
                // can be changed by commun.com
                await this._community.handleSettings(actionArgs);

                break;

            case 'comn.list->setparams':
                // community settings
                // leaders can change these
                await this._community.handleSettings(actionArgs);

                break;

            case 'comn.list->ban':
                // ban user in community
                await this._community.handleBanUnban(actionArgs, 'ban');
                break;

            case 'comn.list->unban':
                // unban user in community
                await this._community.handleBanUnban(actionArgs, 'unban');
                break;

            case `cyber.domain->newusername`:
                await this._profile.handleUsername(actionArgs, meta);
                break;

            // В данный момент не обрабатывается
            // case `${communityId}.publish->paymssgrwrd`:
            //     await this._post.handlePayout(actionArgs, meta);
            //     break;

            case 'comn.gallery->create':
                if (actionArgs.parent_id && actionArgs.parent_id.permlink) {
                    await this._comment.handleCreate(actionArgs, meta);
                } else {
                    await this._post.handleCreate(actionArgs, meta);
                    // Временно не обрабатываем
                    // await this._hashTag.handleCreate(actionArgs, meta);
                }
                break;

            case 'comn.gallery->update':
                if (await isPost(actionArgs)) {
                    await this._post.handleUpdate(actionArgs, meta);
                    // Временно не обрабатываем
                    // await this._hashTag.handleUpdate(actionArgs, meta);
                } else {
                    await this._comment.handleUpdate(actionArgs, meta);
                }
                break;

            case 'comn.gallery->remove':
                // Warning - do not change ordering
                // await this._hashTag.handleDelete(actionArgs, meta);
                await this._post.handleDelete(actionArgs, meta);
                await this._comment.handleDelete(actionArgs, meta);
                break;

            case 'comn.gallery->report':
                await this._report.handleReport(actionArgs);
                break;

            case `${communityId}.social->updatemeta`:
                await this._profile.handleMeta(actionArgs, meta);
                break;

            case 'comn.gallery->upvote':
                await this._vote.handleUpVote(actionArgs, meta);
                break;

            case 'comn.gallery->downvote':
                await this._vote.handleDownVote(actionArgs, meta);
                break;

            case 'comn.gallery->unvote':
                await this._vote.handleUnVote(actionArgs, meta);
                break;

            case 'comn.gallery->ban':
                // message payout ban
                await this._report.handleBan(actionArgs);
                await this._comment.handleBan(actionArgs);
                await this._post.handleBan(actionArgs);
                break;

            case 'comn.gallery->mosaicerase':
                // when post is closed
                // todo: handle this
                break;
            case 'comn.gallery->gemstate':
                // when vote state changed; info about users' rewards
                // todo: handle this
                break;

            case 'comn.gallery->chopevent':
                // when vote erased
                // todo: handle this
                break;

            case 'comn.gallery->lock':
                // locking post
                // todo: handle this
                break;

            case 'comn.gallery->unlock':
                // unlocking post
                // todo: handle this
                break;

            case 'comn.social->pin':
                await this._subscribe.pin(actionArgs, meta);
                break;

            case 'comn.social->unpin':
                await this._subscribe.unpin(actionArgs, meta);
                break;

            case 'comn.social->block':
                await this._subscribe.block(actionArgs);
                break;

            case 'comn.social->unblock':
                await this._subscribe.unblock(actionArgs);
                break;

            // case `${communityId}.publish->erasereblog`:
            //     await this._post.handleRemoveRepost(actionArgs, meta);
            //     break;

            // case 'cyber.msig->propose':
            //     await this._leader.handleNewProposal(actionArgs, meta);
            //     break;
            //
            // case 'cyber.msig->approve':
            //     await this._leader.handleProposalApprove(actionArgs);
            //     break;
            //
            // case 'cyber.msig->exec':
            //     await this._leader.handleProposalExec(actionArgs, meta);
            //     break;

            case `${communityId}.charge->setrestorer`:
                try {
                    await this._communitySettings.handleSetParams(
                        communityId,
                        'charge',
                        'setrestorer',
                        [[null, actionArgs.params]]
                    );
                } catch (err) {
                    Logger.error("Community Settings 'charge::setrestorer' processing failed", err);
                }
                break;

            case `${communityId}.publish->setrules`:
                try {
                    await this._communitySettings.handleSetParams(
                        communityId,
                        'publish',
                        'setrules',
                        [[null, actionArgs.params]]
                    );
                } catch (err) {
                    Logger.error("Community Settings 'publish::setrules' processing failed", err);
                }
                break;

            default:
            // unknown action, do nothing
        }

        switch (action.code) {
            case 'comn.point':
                await this._processPoint(action.action, actionArgs, meta);
                break;

            case 'comn.ctrl':
                await this._leader.processAction(action.action, actionArgs, meta);
                break;
        }

        if (action.action === 'setparams') {
            const [communityId, contractName] = action.code.split('.');

            if (contractName) {
                await this._communitySettings.handleSetParams(
                    communityId,
                    contractName,
                    'setparams',
                    actionArgs.params
                );
            }
        }

        for (const event of events) {
            const path = [event.code, event.event].join('->');
            const eventArgs = event.args;

            switch (path) {
                case 'comn.gallery->mosaicstate':
                    // info about all rewards for post in sum
                    await this._gallery.handleMosaicState(eventArgs);
                    break;
            }
        }
    }

    async _processPoint(action, params, meta) {
        switch (action) {
            case 'create':
                await this._communityPoints.createPoint(params);
                break;
        }
    }

    _extractCommunityId(action) {
        const calledCodeName = action.code;

        return calledCodeName.split('.')[0];
    }
}

module.exports = Main;
