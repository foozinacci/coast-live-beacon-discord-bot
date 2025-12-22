const fs = require('fs');
const path = require('path');

class XPStorage {
    constructor() {
        this.filePath = path.join(__dirname, '../../data/xp.json');
        this.ensureDataFile();

        // XP thresholds per level
        this.levelThresholds = {
            1: 0, 2: 100, 3: 250, 4: 450, 5: 500,
            6: 750, 7: 1000, 8: 1250, 10: 1500,
            15: 3000, 20: 5000, 25: 8000, 30: 12000,
            40: 20000, 50: 30000
        };

        // XP rewards per action
        this.xpRewards = {
            message: 1,        // max 10/hr
            trackAdded: 5,
            trackPlayed: 10,
            streamWatched: 25, // 15+ min
            birthdayWished: 5,
            adPosted: 3,
            weekStreak: 50     // bonus
        };
    }

    ensureDataFile() {
        const dataDir = path.dirname(this.filePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({ users: {}, config: {} }, null, 2));
        }
    }

    getData() {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (error) {
            return { users: {}, config: {} };
        }
    }

    saveData(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    getKey(guildId, userId) {
        return guildId + '_' + userId;
    }

    getUserXP(guildId, userId) {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (!data.users[key]) {
            data.users[key] = {
                guildId,
                userId,
                totalXP: 0,
                level: 1,
                messagesThisHour: 0,
                lastMessageHour: null,
                lastActiveAt: null,
                createdAt: Date.now()
            };
            this.saveData(data);
        }

        return data.users[key];
    }

    addXP(guildId, userId, amount, action = 'manual') {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (!data.users[key]) {
            this.getUserXP(guildId, userId);
            return this.addXP(guildId, userId, amount, action);
        }

        const user = data.users[key];
        const currentHour = new Date().getHours();

        // Rate limiting for messages
        if (action === 'message') {
            if (user.lastMessageHour === currentHour) {
                if (user.messagesThisHour >= 10) {
                    return { added: 0, levelUp: false, user };
                }
                user.messagesThisHour++;
            } else {
                user.lastMessageHour = currentHour;
                user.messagesThisHour = 1;
            }
        }

        const oldLevel = user.level;
        user.totalXP += amount;
        user.lastActiveAt = Date.now();

        // Calculate new level
        user.level = this.calculateLevel(user.totalXP);

        this.saveData(data);

        return {
            added: amount,
            totalXP: user.totalXP,
            level: user.level,
            levelUp: user.level > oldLevel,
            user
        };
    }

    calculateLevel(xp) {
        let level = 1;
        const sortedLevels = Object.entries(this.levelThresholds)
            .map(([l, x]) => [parseInt(l), x])
            .sort((a, b) => b[1] - a[1]);

        for (const [lvl, threshold] of sortedLevels) {
            if (xp >= threshold) {
                level = lvl;
                break;
            }
        }
        return level;
    }

    getXPForNextLevel(currentLevel) {
        const levels = Object.keys(this.levelThresholds).map(Number).sort((a, b) => a - b);
        const idx = levels.indexOf(currentLevel);
        if (idx === -1 || idx === levels.length - 1) {
            return this.levelThresholds[levels[levels.length - 1]] * 2;
        }
        return this.levelThresholds[levels[idx + 1]];
    }

    getLeaderboard(guildId, limit = 10) {
        const data = this.getData();

        const leaderboard = Object.values(data.users)
            .filter(u => u.guildId === guildId)
            .sort((a, b) => b.totalXP - a.totalXP)
            .slice(0, limit);

        return leaderboard;
    }

    resetXP(guildId, userId) {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (data.users[key]) {
            data.users[key].totalXP = 0;
            data.users[key].level = 1;
            this.saveData(data);
            return true;
        }
        return false;
    }

    grantXP(guildId, userId, amount) {
        return this.addXP(guildId, userId, amount, 'manual');
    }

    // Level unlocks per spec
    getLevelUnlocks(level) {
        const unlocks = [];
        if (level >= 5) unlocks.push('+1 ad slot');
        if (level >= 10) unlocks.push('+1 track slot');
        if (level >= 15) unlocks.push('custom now playing');
        if (level >= 20) unlocks.push('2 swaps/hr');
        if (level >= 25) unlocks.push('skip immunity (1 track)');
        if (level >= 30) unlocks.push('+1 track slot');
        if (level >= 50) unlocks.push('🌟 badge on tracks');
        return unlocks;
    }
}

module.exports = XPStorage;
