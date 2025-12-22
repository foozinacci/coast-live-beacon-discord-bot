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
}

module.exports = AnnouncementStorage;
