const CommunityPointModel = require('../../models/CommunityPoint');

class CommunityPoints {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async createPoint({ issuer, maximum_supply: supply }) {
        const communityId = supply.split(' ')[1];

        if (!communityId) {
            return;
        }

        const newObject = await CommunityPointModel.create({
            issuer,
            communityId,
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunityPointModel,
            documentId: newObject._id,
        });
    }
}

module.exports = CommunityPoints;
