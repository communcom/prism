const ProfileModel = require('../../models/Profile');
const Abstract = require('./Abstract');

class Subscribe extends Abstract {
    async pin({ pinner, pinning }) {
        await this._manage(pinner, pinning, 'add');
    }

    async unpin({ pinner, pinning }) {
        await this._manage(pinner, pinning, 'remove');
    }

    async block({ blocker, blocking }) {
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId: blocker },
            { $addToSet: { 'blacklist.userIds': blocking } }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel,
            data: {
                $pull: {
                    'blacklist.userIds': blocking,
                },
            },
        });
    }

    async unblock({ blocker, blocking }) {
        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId: blocker },
            { $pull: { 'blacklist.userIds': blocking } }
        );

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel,
            data: {
                $addToSet: {
                    'blacklist.userIds': blocking,
                },
            },
        });
    }

    async _manage(pinner, pinning, action) {
        const [addAction, removeAction, increment] = this._getArrayEntityCommands(action);
        const applier = this._makeSubscriptionApplier({
            addAction,
            removeAction,
            increment,
            action,
        });

        await applier(pinner, pinning, 'subscriptions');
        await applier(pinning, pinner, 'subscribers');
    }

    _makeSubscriptionApplier({ addAction, removeAction, increment, action }) {
        return async (iniciator, target, type) => {
            const [arrayPath, countPath] = await this._getTargetFields(iniciator);
            const fullArrayPath = `${type}.${arrayPath}`;
            const fullCountPath = `${type}.${countPath}`;

            const profileObj = await ProfileModel.findOne({
                userId: iniciator,
            });

            const previousModel = await ProfileModel.findOneAndUpdate(
                {
                    userId: iniciator,
                },
                {
                    [addAction]: { [fullArrayPath]: target },
                    $set: {
                        [fullCountPath]: this._calculateCount(
                            action,
                            profileObj[type][arrayPath].length
                        ),
                    },
                }
            );

            if (!previousModel) {
                return;
            }

            await this.registerForkChanges({
                type: 'update',
                Model: ProfileModel,
                documentId: previousModel._id,
                data: {
                    [removeAction]: { [fullArrayPath]: target },
                    $inc: { [fullCountPath]: -increment },
                },
            });
        };
    }

    async _getTargetFields(target) {
        if (await this._isCommunity(target)) {
            return ['communityIds', 'communitiesCount'];
        } else {
            return ['userIds', 'usersCount'];
        }
    }

    async _isCommunity(id) {
        // TODO After blockchain implementation
        return false;
    }
}

module.exports = Subscribe;
