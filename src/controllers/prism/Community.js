const crypto = require('crypto');

const CommunityModel = require('../../models/Community');

// Менять соль нельзя, это приведет к расхождению в alias между призмами.
const SALT = 'AL1tsa3up0at';

class Community {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async handleCreate({ community_name: name, commun_code: communityId }) {
        const alias = `id${this._extractAlias(communityId)}`;

        const newObject = await CommunityModel.create({
            communityId,
            alias,
            name,
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunityModel,
            documentId: newObject._id,
        });
    }

    async handleAddInfo({
        commun_code: communityId,
        avatar_image: avatarUrl,
        cover_image: coverUrl,
        description,
        rules,
        language,
    }) {
        const oldObject = await CommunityModel.findOneAndUpdate(
            { communityId },
            {
                $set: {
                    language,
                    avatarUrl,
                    coverUrl,
                    description,
                    rules,
                },
            }
        );

        if (oldObject) {
            await this._forkService.registerChanges({
                type: 'update',
                Model: CommunityModel,
                documentId: oldObject._id,
                data: {
                    $set: {
                        language: oldObject.language,
                        avatarUrl: oldObject.avatarUrl,
                        coverUrl: oldObject.coverUrl,
                        description: oldObject.description,
                        rules: oldObject.rules,
                    },
                },
            });
        }
    }

    _extractAlias(code) {
        return crypto
            .createHash('sha1')
            .update(`${SALT}${code.toLowerCase()}`)
            .digest()
            .readUInt32LE(16);
    }
}

module.exports = Community;
