const lodash = require('lodash');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleUsername({ owner: userId, name: username, creator: app }, { blockTime }) {
        if (app !== 'c') {
            return;
        }

        const modelsAlready = await ProfileModel.count({ userId });

        if (modelsAlready > 0) {
            Logger.warn(`Duplicate user creation - ${userId}`);
            return;
        }

        const model = await ProfileModel.create({
            userId,
            username,
            registration: {
                time: blockTime,
            },
        });

        await this.registerForkChanges({
            type: 'create',
            Model: ProfileModel,
            documentId: model._id,
        });
    }

    async handleMeta({ account: userId, meta }) {
        const query = this._makePersonalUpdateQuery(meta);
        const previousModel = await ProfileModel.findOneAndUpdate(
            {
                userId,
            },
            {
                $set: query,
            }
        );

        if (!previousModel) {
            return;
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel,
            data: {
                $set: this._extractPersonalReversedFields(query, previousModel),
            },
        });
    }

    _makePersonalUpdateQuery(meta) {
        const data = this._extractUpdatedPersonalRawFields(meta);
        const query = {};

        for (const key of Object.keys(data)) {
            const value = data[key];

            switch (key) {
                case 'avatar_url':
                    query.avatarUrl = value;
                    break;

                case 'cover_url':
                    query.coverUrl = value;
                    break;

                case 'biography':
                    query['personal.biography'] = value;
                    break;

                case 'facebook':
                    query['personal.facebook'] = value;
                    break;

                case 'telegram':
                    query['personal.telegram'] = value;
                    break;

                case 'whatsapp':
                    query['personal.whatsApp'] = value;
                    break;

                case 'wechat':
                    query['personal.weChat'] = value;
                    break;

                case 'first_name':
                    query['personal.firstName'] = value;
                    break;

                case 'last_name':
                    query['personal.lastName'] = value;
                    break;

                case 'country':
                    query['personal.country'] = value;
                    break;

                case 'city':
                    query['personal.city'] = value;
                    break;

                case 'birth_date':
                    query['personal.birthDate'] = new Date(value + 'Z');
                    break;

                case 'instagram':
                    query['personal.instagram'] = value;
                    break;

                case 'linkedin':
                    query['personal.linkedin'] = value;
                    break;

                case 'twitter':
                    query['personal.twitter'] = value;
                    break;

                case 'github':
                    query['personal.gitHub'] = value;
                    break;

                case 'website_url':
                    query['personal.websiteUrl'] = value;
                    break;
            }
        }

        return query;
    }

    _extractUpdatedPersonalRawFields(meta) {
        const result = {};

        for (const key of Object.keys(meta)) {
            const value = meta[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (value === '') {
                result[key] = null;
            }

            result[key] = value;
        }

        return result;
    }

    _extractPersonalReversedFields(query, previousModel) {
        const result = {};

        for (const key of Object.keys(query)) {
            result[key] = lodash.get(previousModel, key) || null;
        }

        return result;
    }
}

module.exports = Profile;
