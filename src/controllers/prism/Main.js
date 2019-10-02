const core = require('cyberway-core-service');
const { Logger, metrics } = core.utils;
const Post = require('./Post');
const Comment = require('./Comment');
const Profile = require('./Profile');
const Vote = require('./Vote');
const Subscribe = require('./Subscribe');
const HashTag = require('./HashTag');
const Leader = require('./Leader');
const Community = require('./Community');
const CommunitySettings = require('./CommunitySettings');
const { isPost } = require('../../utils/content');

const ACTION_PROCESSING_WARNING_LIMIT = 1000;

// TODO Change after MVP
const communityRegistry = [
    'cyber',
    'cyber.domain',
    'cyber.token',
    'cyber.msig',
    'comn.list',
    'comn.gallery',
    'comn.social',
];
class Main {
    constructor({ connector, forkService }) {
        this._post = new Post({ connector, forkService });
        this._comment = new Comment({ connector, forkService });
        this._profile = new Profile({ connector, forkService });
        this._vote = new Vote({ connector, forkService });
        this._subscribe = new Subscribe({ connector, forkService });
        // this._hashTag = new HashTag({ connector, forkService });
        this._leader = new Leader({ connector, forkService });
        this._communitySettings = new CommunitySettings({ connector, forkService });
        this._community = new Community({ connector, forkService });
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
        if (!action) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        if (!communityRegistry.includes(action.receiver)) {
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

            case 'comn.list->addinfo':
                await this._community.handleAddInfo(actionArgs);
                break;

            case `cyber.domain->newusername`:
                await this._profile.handleUsername(actionArgs, meta);
                break;

            // В данный момент не обрабатывается
            // case `${communityId}.publish->paymssgrwrd`:
            //     await this._post.handlePayout(actionArgs, meta);
            //     break;

            case 'comn.gallery->createmssg':
                if (actionArgs.parent_id && actionArgs.parent_id.permlink) {
                    await this._comment.handleCreate(actionArgs, meta);
                } else {
                    await this._post.handleCreate(actionArgs, meta);
                    // Временно не обрабатываем
                    // await this._hashTag.handleCreate(actionArgs, meta);
                }
                break;

            case 'comn.gallery->updatemssg':
                if (await isPost(actionArgs)) {
                    await this._post.handleUpdate(actionArgs, meta);
                    // Временно не обрабатываем
                    // await this._hashTag.handleUpdate(actionArgs, meta);
                } else {
                    await this._comment.handleUpdate(actionArgs, meta);
                }
                break;

            case 'comn.gallery->deletemssg':
                // Warning - do not change ordering
                // await this._hashTag.handleDelete(actionArgs, meta);
                await this._post.handleDelete(actionArgs, meta);
                await this._comment.handleDelete(actionArgs, meta);
                break;

            case `${communityId}.social->updatemeta`:
                await this._profile.handleMeta(actionArgs, meta);
                break;

            case `${communityId}.publish->upvote`:
                await this._vote.handleUpVote(actionArgs, meta);
                break;

            case `${communityId}.publish->downvote`:
                await this._vote.handleDownVote(actionArgs, meta);
                break;

            case `${communityId}.publish->unvote`:
                await this._vote.handleUnVote(actionArgs, meta);
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

            case `${communityId}.ctrl->regwitness`:
                await this._leader.register(actionArgs, meta);
                break;

            case `${communityId}.ctrl->unregwitness`:
                await this._leader.unregister(actionArgs, meta);
                break;

            case `${communityId}.ctrl->startwitness`:
                await this._leader.activate(actionArgs, meta);
                break;

            case `${communityId}.ctrl->stopwitness`:
                await this._leader.deactivate(actionArgs, meta);
                break;

            case `${communityId}.ctrl->votewitness`:
                await this._leader.vote(actionArgs, meta);
                break;

            case `${communityId}.ctrl->unvotewitn`:
                await this._leader.unvote(actionArgs, meta);
                break;

            case `${communityId}.publish->erasereblog`:
                await this._post.handleRemoveRepost(actionArgs, meta);
                break;

            case 'cyber.msig->propose':
                await this._leader.handleNewProposal(actionArgs, meta);
                break;

            case 'cyber.msig->approve':
                await this._leader.handleProposalApprove(actionArgs);
                break;

            case 'cyber.msig->exec':
                await this._leader.handleProposalExec(actionArgs, meta);
                break;

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
    }

    _extractCommunityId(action) {
        const calledCodeName = action.code;

        return calledCodeName.split('.')[0];
    }
}

module.exports = Main;
