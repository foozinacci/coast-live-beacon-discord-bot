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

    // === DAILY USAGE TRACKING ===

    // Get today's date string (for daily reset comparison)
    _getToday() {
        return new Date().toISOString().split('T')[0]; // "2024-12-30"
    }

    // Ensure daily tracking fields exist and reset if new day
    _ensureDailyTracking(profile) {
        const today = this._getToday();

        // Reset if new day or fields don't exist
        if (profile.lastActiveDate !== today) {
            profile.lastActiveDate = today;
            profile.gamesPlayedToday = 0;
            profile.songsRequestedToday = 0;
        }

        // Ensure fields exist
        if (typeof profile.gamesPlayedToday !== 'number') profile.gamesPlayedToday = 0;
        if (typeof profile.songsRequestedToday !== 'number') profile.songsRequestedToday = 0;

        return profile;
    }

    // Check if user can play a Beacon game (returns { allowed, remaining, used, max })
    canPlayBeacon(guildId, userId, isBirthday = false) {
        const profile = this.getProfile(guildId, userId) || {};
        this._ensureDailyTracking(profile);

        const max = isBirthday ? 7 : 5; // 5 base, +2 for birthday
        const used = profile.gamesPlayedToday || 0;
        const remaining = Math.max(0, max - used);

        return {
            allowed: used < max,
            remaining,
            used,
            max
        };
    }

    // Record a Beacon game play
    recordBeaconGame(guildId, userId, username) {
        const data = this.getData();
        const key = guildId + '_' + userId;

        if (!data.users[key]) {
            data.users[key] = {
                guildId,
                userId,
                username,
                createdAt: Date.now()
            };
        }

        this._ensureDailyTracking(data.users[key]);
        data.users[key].gamesPlayedToday = (data.users[key].gamesPlayedToday || 0) + 1;
        data.users[key].totalBeaconGames = (data.users[key].totalBeaconGames || 0) + 1;
        data.users[key].updatedAt = Date.now();

        this.saveData(data);
        return data.users[key];
    }

    // Check if user can request a song (returns { allowed, remaining, used, max })
    canRequestSong(guildId, userId, isBirthday = false) {
        const profile = this.getProfile(guildId, userId) || {};
        this._ensureDailyTracking(profile);

        const max = isBirthday ? 7 : 5; // 5 base, +2 for birthday
        const used = profile.songsRequestedToday || 0;
        const remaining = Math.max(0, max - used);

        return {
            allowed: used < max,
            remaining,
            used,
            max
        };
    }

    // Record a song request
    recordSongRequest(guildId, userId, username) {
        const data = this.getData();
        const key = guildId + '_' + userId;

        if (!data.users[key]) {
            data.users[key] = {
                guildId,
                userId,
                username,
                createdAt: Date.now()
            };
        }

        this._ensureDailyTracking(data.users[key]);
        data.users[key].songsRequestedToday = (data.users[key].songsRequestedToday || 0) + 1;
        data.users[key].totalSongRequests = (data.users[key].totalSongRequests || 0) + 1;
        data.users[key].updatedAt = Date.now();

        this.saveData(data);
        return data.users[key];
    }

    // Get user's daily status summary
    getDailyStatus(guildId, userId, isBirthday = false) {
        const games = this.canPlayBeacon(guildId, userId, isBirthday);
        const songs = this.canRequestSong(guildId, userId, isBirthday);

        return {
            games,
            songs,
            isBirthday
        };
    }
}

module.exports = UserProfileStorage;
