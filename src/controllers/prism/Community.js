const core = require('cyberway-core-service');
const { Logger } = core.utils;
const CommunityModel = require('../../models/Community');

class Community {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async handleCreate({ community_name: communityName, commun_code: communityId }) {
        const newObject = await CommunityModel.create({
            communityName,
            communityId,
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunityModel,
            documentId: newObject._id,
        });
    }

    async handleAddInfo({
        commun_code: communityId,
        avatar_image: avatar,
        cover_img_link: coverImageLink,
        description,
        rules,
        language,
    }) {
        const oldObject = await CommunityModel.findOne({ communityId }, {}, { lean: true });

        await CommunityModel.updateOne(
            { communityId },
            {
                $set: {
                    language,
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
