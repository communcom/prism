const core = require('cyberway-core-service');
const { Logger, metrics, BulkSaver } = core.utils;

const ProfileModel = require('../../models/Profile');
const LeaderModel = require('../../models/Leader');

class GenesisContent {
    constructor() {
        this._isEnd = false;

        this._profilesBulk = new BulkSaver(ProfileModel, 'profiles');
        this._leadersBulk = new BulkSaver(LeaderModel, 'leaders');
    }

    async handle(type, data) {
        if (this._isEnd) {
            throw new Error('Method finish has been called already');
        }

        metrics.inc('genesis_handle', { type });

        switch (type) {
            case 'account':
                this._handleAccount(data);
                return true;
            case 'witnessstate':
                await this._handleWitnessState(data);
                return true;
            default:
                // Do nothing
                return false;
        }
    }

    async finish() {
        this._isEnd = true;
    }

    async typeEnd(type) {
        switch (type) {
            case 'account':
                await this._profilesBulk.finish();
                break;
            case 'witnessstate':
                await this._leadersBulk.finish();
                break;
            default:
            // Do nothing
        }
    }

    getQueueLength() {
        return this._profilesBulk.getQueueLength() + this._leadersBulk.getQueueLength();
    }

    _handleAccount(data) {
        const { owner: userId, name, created, reputation, json_metadata } = data;

        let metadata = {};

        if (json_metadata && json_metadata !== "{created_at: 'GENESIS'}") {
            try {
                const { profile } = JSON.parse(json_metadata);

                if (profile) {
                    metadata = {
                        name: profile.name,
                        gender: profile.gender,
                        email: profile.email,
                        about: profile.about,
                        location: profile.location,
                        website: profile.website,
                        avatarUrl: profile.profile_image,
                        coverUrl: profile.cover_image,
                        contacts: profile.social,
                    };
                }
            } catch (err) {
                Logger.error('Profile with invalid json_metadata:', err);
            }
        }

        let registrationTime = null;

        if (created !== '1970-01-01T00:00:00.000') {
            registrationTime = new Date(created + 'Z');
        }

        this._profilesBulk.addEntry({
            userId,
            usernames: { gls: name },
            isGenesisUser: true,
            isGolosVestingOpened: true,
            registration: {
                time: registrationTime,
            },
            stats: {
                reputation,
            },
            personal: { gls: metadata },
        });

        metrics.inc('genesis_type_account_processed');
    }

    async _handleWitnessState({ name, total_weight: rating, url, votes, active }) {
        this._leadersBulk.addEntry({
            communityId: 'gls',
            userId: name,
            url,
            rating,
            votes,
            isActive: active,
        });

        await ProfileModel.updateOne(
            {
                userId: name,
            },
            {
                $push: {
                    leaderIn: 'gls',
                },
            }
        );
    }
}

module.exports = GenesisContent;
