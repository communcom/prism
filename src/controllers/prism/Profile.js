const lodash = require('lodash');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleUsername({ owner: userId, name: username, creator: app }, { blockTime }) {
        if (app !== 'comn') {
            // TODO: remove in production
            Logger.warn('Non-commun scope username', username, 'in scope', app);
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
                    query['personal.avatarUrl'] = value;
                    break;

                case 'cover_url':
                    query['personal.coverUrl'] = value;
                    break;

                case 'biography':
                    query['personal.biography'] = value;
                    break;

                case 'facebook':
                    query['personal.contacts.facebook'] = value;
                    break;

                case 'telegram':
                    query['personal.contacts.telegram'] = value;
                    break;

                case 'whatsapp':
                    query['personal.contacts.whatsApp'] = value;
                    break;

                case 'wechat':
                    query['personal.contacts.weChat'] = value;
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
