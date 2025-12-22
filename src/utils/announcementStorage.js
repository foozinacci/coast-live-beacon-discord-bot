const fs = require('fs');
const path = require('path');

class AnnouncementStorage {
    constructor() {
        this.filePath = path.join(__dirname, '../../data/announcements.json');
        this.ensureDataFile();
    }

    ensureDataFile() {
        const dataDir = path.dirname(this.filePath);

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({
                guilds: {},
                promotionalAds: [
                    {
                        name: 'COAST Website',
                        url: 'https://coast.gg',
                        description: 'Check out the COAST community hub!'
                    }
                ]
            }, null, 2));
        }
    }

    getData() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading announcements file:', error);
            return { guilds: {}, promotionalAds: [] };
        }
    }

    saveData(data) {
        try {
            fs.writeFileSync(
                this.filePath,
                JSON.stringify(data, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Error saving announcements file:', error);
            throw error;
        }
    }

    getGuildConfig(guildId) {
        const data = this.getData();
        if (!data.guilds) data.guilds = {};

        if (!data.guilds[guildId]) {
            data.guilds[guildId] = {
                announcementsChannelId: null,
                birthdays: {},
                customAds: []
            };
            this.saveData(data);
        }
        return data.guilds[guildId];
    }

    // Announcements Channel
    setAnnouncementsChannel(guildId, channelId) {
        const data = this.getData();
        if (!data.guilds) data.guilds = {};
        const config = this.getGuildConfig(guildId);
        config.announcementsChannelId = channelId;
        data.guilds[guildId] = config;
        this.saveData(data);
    }

    getAnnouncementsChannel(guildId) {
        const config = this.getGuildConfig(guildId);
        return config.announcementsChannelId;
    }

    // Birthday Management
    addBirthday(guildId, userId, username, birthDate, discordJoinDate) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        config.birthdays[userId] = {
            username,
            birthDate, // Store as ISO string YYYY-MM-DD
            discordJoinDate, // When they joined THIS server
            addedAt: Date.now()
        };

        data.guilds[guildId] = config;
        this.saveData(data);
        return true;
    }

    removeBirthday(guildId, userId) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        if (!config.birthdays[userId]) {
            return false;
        }

        delete config.birthdays[userId];
        data.guilds[guildId] = config;
        this.saveData(data);
        return true;
    }

    getBirthday(guildId, userId) {
        const config = this.getGuildConfig(guildId);
        return config.birthdays[userId] || null;
    }

    getAllBirthdays(guildId) {
        const config = this.getGuildConfig(guildId);
        return config.birthdays || {};
    }

    getBirthdaysForDate(guildId, month, day) {
        const birthdays = this.getAllBirthdays(guildId);
        const matches = [];

        for (const [userId, data] of Object.entries(birthdays)) {
            const [year, m, d] = data.birthDate.split('-').map(Number);
            if (m === month && d === day) {
                matches.push({ userId, ...data, birthYear: year });
            }
        }

        return matches;
    }

    getUpcomingBirthdays(guildId, days = 30) {
        const birthdays = this.getAllBirthdays(guildId);
        const today = new Date();
        const upcoming = [];

        for (const [userId, data] of Object.entries(birthdays)) {
            const [birthYear, month, day] = data.birthDate.split('-').map(Number);

            // Create date for this year's birthday
            let nextBirthday = new Date(today.getFullYear(), month - 1, day);

            // If birthday has passed this year, look at next year
            if (nextBirthday < today) {
                nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
            }

            const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

            if (daysUntil <= days) {
                upcoming.push({
                    userId,
                    username: data.username,
                    birthDate: data.birthDate,
                    daysUntil,
                    turningAge: nextBirthday.getFullYear() - birthYear
                });
            }
        }

        // Sort by days until birthday
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
        return upcoming;
    }

    // Promotional Ads
    getPromotionalAds() {
        const data = this.getData();
        return data.promotionalAds || [];
    }

    setPromotionalAds(ads) {
        const data = this.getData();
        data.promotionalAds = ads;
        this.saveData(data);
    }

    addPromotionalAd(name, url, description) {
        const data = this.getData();
        if (!data.promotionalAds) data.promotionalAds = [];

        data.promotionalAds.push({ name, url, description });
        this.saveData(data);
    }

    removePromotionalAd(index) {
        const data = this.getData();
        if (!data.promotionalAds || index >= data.promotionalAds.length) {
            return false;
        }

        data.promotionalAds.splice(index, 1);
        this.saveData(data);
        return true;
    }

    // Get guild-specific custom ads
    getGuildAds(guildId) {
        const config = this.getGuildConfig(guildId);
        return config.customAds || [];
    }

    addGuildAd(guildId, name, url, description) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        if (!config.customAds) config.customAds = [];
        config.customAds.push({ name, url, description });

        data.guilds[guildId] = config;
        this.saveData(data);
    }

    // Get all guilds with announcements configured
    getAllConfiguredGuilds() {
        const data = this.getData();
        const configured = [];

        for (const [guildId, config] of Object.entries(data.guilds || {})) {
            if (config.announcementsChannelId) {
                configured.push({ guildId, ...config });
            }
        }

        return configured;
    }

    // ================== USER AD SYSTEM ==================

    /**
     * Add a user's scheduled ad (max 2 per user)
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} username 
     * @param {string} name - Ad name
     * @param {string} url - Ad URL
     * @param {string} description - Ad description
     * @param {string} scheduledTime - HH:MM format
     */
    addUserAd(guildId, userId, username, name, url, description, scheduledTime) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        if (!config.userAds) config.userAds = {};
        if (!config.userAds[userId]) config.userAds[userId] = [];

        // Check limit
        if (config.userAds[userId].length >= 2) {
            return { success: false, error: 'You already have 2 ads. Remove one first with `!myads remove 1` or `!myads remove 2`' };
        }

        // Validate time format
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
            return { success: false, error: 'Invalid time format. Use HH:MM (24-hour), e.g., 14:30' };
        }

        config.userAds[userId].push({
            username,
            name,
            url,
            description,
            scheduledTime,
            createdAt: Date.now(),
            lastPosted: null
        });

        data.guilds[guildId] = config;
        this.saveData(data);
        return { success: true, count: config.userAds[userId].length };
    }

    /**
     * Remove a user's ad by index (1 or 2)
     */
    removeUserAd(guildId, userId, index) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        if (!config.userAds || !config.userAds[userId]) {
            return { success: false, error: 'User has no ads' };
        }

        const ads = config.userAds[userId];
        const arrayIndex = index - 1; // Convert to 0-indexed

        if (arrayIndex < 0 || arrayIndex >= ads.length) {
            return { success: false, error: `Invalid index. User has ${ads.length} ad(s).` };
        }

        const removed = ads.splice(arrayIndex, 1)[0];
        data.guilds[guildId] = config;
        this.saveData(data);
        return { success: true, removed };
    }

    /**
     * Remove ALL ads for a specific user (mod action)
     */
    removeAllUserAds(guildId, userId) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        if (!config.userAds || !config.userAds[userId]) {
            return { success: false, error: 'User has no ads' };
        }

        const count = config.userAds[userId].length;
        delete config.userAds[userId];
        data.guilds[guildId] = config;
        this.saveData(data);
        return { success: true, count };
    }

    /**
     * Get a user's ads
     */
    getUserAds(guildId, userId) {
        const config = this.getGuildConfig(guildId);
        if (!config.userAds) return [];
        return config.userAds[userId] || [];
    }

    /**
     * Get all user ads for a guild
     */
    getAllUserAds(guildId) {
        const config = this.getGuildConfig(guildId);
        return config.userAds || {};
    }

    /**
     * Get all ads scheduled for a specific time (HH:MM)
     */
    getAdsForTime(guildId, time) {
        const config = this.getGuildConfig(guildId);
        if (!config.userAds) return [];

        const matches = [];
        const today = new Date().toDateString();

        for (const [userId, ads] of Object.entries(config.userAds)) {
            for (let i = 0; i < ads.length; i++) {
                const ad = ads[i];
                if (ad.scheduledTime === time) {
                    // Check if already posted today
                    const lastPosted = ad.lastPosted ? new Date(ad.lastPosted).toDateString() : null;
                    if (lastPosted !== today) {
                        matches.push({ userId, index: i, ...ad });
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Mark an ad as posted
     */
    markAdPosted(guildId, userId, index) {
        const data = this.getData();
        const config = this.getGuildConfig(guildId);

        if (config.userAds && config.userAds[userId] && config.userAds[userId][index]) {
            config.userAds[userId][index].lastPosted = Date.now();
            data.guilds[guildId] = config;
            this.saveData(data);
        }
    }
}

module.exports = AnnouncementStorage;
