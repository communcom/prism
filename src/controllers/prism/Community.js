const core = require('cyberway-core-service');
const { Logger } = core.utils;
const CommunityModel = require('../../models/Community');

class Community {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async handleCreate({ community_name: communityName, token_name: tokenName }) {
        const newObject = await CommunityModel.create({
            communityName,
            tokenName,
            communityId: tokenName,
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunityModel,
            documentId: newObject._id,
        });
    }

    async handleAddInfo({
        community_name: communityName,
        token_name: tokenName,
        ticker,
        avatar,
        cover_img_link: coverImageLink,
        description,
        rules,
    }) {
        const communityId = tokenName;
        const oldObject = await CommunityModel.findOne({ communityId }, {}, { lean: true });

        await CommunityModel.updateOne(
            { communityId },
            {
                $set: {
                    tokenName,
                    ticker,
                    communityName,
                    avatar,
                    coverImageLink,
                    description,
                    rules,
                },
            }
        );

        await this._forkService.registerChanges({
            type: 'update',
            Model: CommunityModel,
            documentId: oldObject._id,
        });
    }
}

module.exports = Community;
