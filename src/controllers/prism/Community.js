const crypto = require('crypto');

const CommunityModel = require('../../models/Community');

// Менять соль нельзя, это приведет к расхождению в communityId между призмами.
const SALT = 'AL1tsa3up0at';

class Community {
    constructor({ forkService }) {
        this._forkService = forkService;
    }

    async handleCreate({ community_name: name, commun_code: code }) {
        const communityId = `id${this._extractCommunityId(code)}`;

        const newObject = await CommunityModel.create({
            communityId,
            code,
            name,
            // В начале accountName является тем же что и communityId,
            // но в будущем можно задать accountName красивым именем
            accountName: communityId,
        });

        await this._forkService.registerChanges({
            type: 'create',
            Model: CommunityModel,
            documentId: newObject._id,
        });
    }

    async handleAddInfo({
        commun_code: code,
        avatar_image: avatarUrl,
        cover_image: coverImageLink,
        description,
        rules,
        language,
    }) {
        const oldObject = await CommunityModel.findOne({ code }, {}, { lean: true });

        await CommunityModel.updateOne(
            { code },
            {
                $set: {
                    language,
                    avatarUrl,
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

    _extractCommunityId(code) {
        return crypto
            .createHash('sha1')
            .update(`${SALT}${code.toLowerCase()}`)
            .digest()
            .readUInt32LE(16);
    }
}

module.exports = Community;
