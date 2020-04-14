const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const ProfileModel = require('../../models/Profile');
const TrashModel = require('../../models/TrashPost');

class Abstract extends BasicController {
    constructor({ forkService, ...args } = {}) {
        super(args);

        this._forkService = forkService;
    }

    async _isTrash({ userId, permlink, parentUserId, parentPermlink }) {
        if (
            !(await ProfileModel.findOne({ userId })) ||
            (await TrashModel.findOne({
                userId: parentUserId,
                permlink: parentPermlink,
            }))
        ) {
            await TrashModel.create({ userId, permlink });
            return true;
        }
        return false;
    }

    async registerForkChanges(changes) {
        if (this._forkService) {
            await this._forkService.registerChanges(changes);
        }
    }

    _getArrayEntityCommands(action) {
        switch (action) {
            case 'add':
                return ['$addToSet', '$pull', 1];
            case 'remove':
                return ['$pull', '$addToSet', -1];
        }
    }

    _calculateCount(action, current) {
        switch (action) {
            case 'add':
                return current + 1;
            case 'remove':
                return current === 0 ? 0 : current - 1;
        }
    }
}

module.exports = Abstract;
