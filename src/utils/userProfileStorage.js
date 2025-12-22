const fs = require('fs');
const path = require('path');

class UserProfileStorage {
    constructor() {
        this.filePath = path.join(__dirname, '../../data/profiles.json');
        this.ensureDataFile();
    }

    ensureDataFile() {
        const dataDir = path.dirname(this.filePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({ users: {} }, null, 2));
        }
    }

    getData() {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (error) {
            return { users: {} };
        }
    }

    saveData(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    getProfile(guildId, userId) {
        const data = this.getData();
        const key = guildId + '_' + userId;
        return data.users[key] || null;
    }

    setProfile(guildId, userId, username, updates) {
        const data = this.getData();
        const key = guildId + '_' + userId;

        if (!data.users[key]) {
            data.users[key] = {
                guildId,
                userId,
                username,
                twitch: null,
                youtube: null,
                twitter: null,
                tiktok: null,
                other: null,
                trackLimit: 3,
                swapLimit: 1,
                customDurationCap: null,
                createdAt: Date.now()
            };
        }

        // Apply updates
        Object.assign(data.users[key], updates, { username, updatedAt: Date.now() });

        this.saveData(data);
        return data.users[key];
    }

    clearProfile(guildId, userId) {
        const data = this.getData();
        const key = guildId + '_' + userId;

        if (data.users[key]) {
            data.users[key].twitch = null;
            data.users[key].youtube = null;
            data.users[key].twitter = null;
            data.users[key].tiktok = null;
            data.users[key].other = null;
            data.users[key].updatedAt = Date.now();
            this.saveData(data);
            return true;
        }
        return false;
    }

    // For birthday shoutouts - get all socials
    getSocials(guildId, userId) {
        const profile = this.getProfile(guildId, userId);
        if (!profile) return null;

        const socials = [];
        if (profile.twitch) socials.push({ platform: 'Twitch', url: profile.twitch });
        if (profile.youtube) socials.push({ platform: 'YouTube', url: profile.youtube });
        if (profile.twitter) socials.push({ platform: 'Twitter/X', url: profile.twitter });
        if (profile.tiktok) socials.push({ platform: 'TikTok', url: profile.tiktok });
        if (profile.other) socials.push({ platform: 'Link', url: profile.other });

        return socials.length > 0 ? socials : null;
    }
}

module.exports = UserProfileStorage;
