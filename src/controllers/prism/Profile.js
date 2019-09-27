const lodash = require('lodash');
const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const ProfileModel = require('../../models/Profile');

class Profile extends Abstract {
    async handleUsername({ owner: userId, name: username, creator: app }) {
        if (app !== 'comn') {
            // TODO: remove in production
            Logger.warn('Non-commun scope username', username, 'in scope', app);
            return;
        }

        const previousModel = await ProfileModel.findOneAndUpdate(
            { userId },
            {
                $set: { username },
            }
        );

        if (!previousModel) {
            return;
        }

        const previousName = previousModel.username;
        let revertData;

        if (previousName) {
            revertData = {
                $set: {
                    username: previousName,
                },
            };
        } else {
            revertData = {
                $unset: {
                    username: true,
                },
            };
        }

        await this.registerForkChanges({
            type: 'update',
            Model: ProfileModel,
            documentId: previousModel._id,
            data: revertData,
        });
    }

    async handleCreate({ name: userId }, { blockTime }) {
        const modelsAlready = await ProfileModel.count({ userId });

        if (modelsAlready > 0) {
            Logger.warn(`Duplicate user creation - ${userId}`);
            return;
        }

        const model = await ProfileModel.create({
            userId,
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
                case 'profile_image':
                case 'user_image':
                    query['personal.avatarUrl'] = value;
                    break;

                case 'background_image':
                case 'cover_image':
                    query['personal.coverUrl'] = value;
                    break;

                case 'about':
                    query['personal.biography'] = value;
                    break;

                case 'vk':
                    query['personal.contacts.vkontakte'] = value;
                    break;

                case 'facebook':
                    query['personal.contacts.facebook'] = value;
                    break;

                case 'instagram':
                    query['personal.contacts.instagram'] = value;
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
