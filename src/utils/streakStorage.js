const fs = require('fs');
const path = require('path');

class StreakStorage {
    constructor() {
        this.filePath = path.join(__dirname, '../../data/streaks.json');
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

    getKey(guildId, userId) {
        return guildId + '_' + userId;
    }

    getUserStreaks(guildId, userId) {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (!data.users[key]) {
            data.users[key] = {
                guildId,
                userId,
                dailyVisit: { current: 0, longest: 0, lastTriggered: null, graceUsed: false },
                streamWatcher: { current: 0, longest: 0, lastTriggered: null, graceUsed: false },
                birthdayWisher: { current: 0, longest: 0, lastTriggered: null, graceUsed: false },
                queueContributor: { current: 0, longest: 0, lastTriggered: null, graceUsed: false },
                frozen: false,
                createdAt: Date.now()
            };
            this.saveData(data);
        }

        return data.users[key];
    }

    incrementStreak(guildId, userId, streakType) {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (!data.users[key]) {
            this.getUserStreaks(guildId, userId);
            return this.incrementStreak(guildId, userId, streakType);
        }

        const streak = data.users[key][streakType];
        if (!streak) return null;

        // Check if frozen
        if (data.users[key].frozen) return streak;

        const today = new Date().toDateString();
        const lastDate = streak.lastTriggered ? new Date(streak.lastTriggered).toDateString() : null;

        // Already triggered today
        if (lastDate === today) {
            return streak;
        }

        streak.current++;
        if (streak.current > streak.longest) {
            streak.longest = streak.current;
        }
        streak.lastTriggered = Date.now();
        streak.graceUsed = false;

        this.saveData(data);
        return streak;
    }

    checkAndResetStreaks(guildId, userId) {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (!data.users[key]) return;
        if (data.users[key].frozen) return;

        const now = new Date();
        const today = now.toDateString();

        const checkStreak = (streak, maxDays = 1) => {
            if (!streak.lastTriggered) return;

            const lastDate = new Date(streak.lastTriggered);
            const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays > maxDays) {
                // Can use grace if not already used this month
                if (!streak.graceUsed && diffDays <= maxDays + 1) {
                    streak.graceUsed = true;
                } else {
                    streak.current = 0;
                    streak.graceUsed = false;
                }
            }
        };

        // Daily visit resets after 1 missed day
        checkStreak(data.users[key].dailyVisit, 1);
        // Stream watcher resets after missed stream (checked separately)
        // Birthday wisher resets after missed birthday
        checkStreak(data.users[key].birthdayWisher, 1);
        // Queue contributor resets after 7 days
        checkStreak(data.users[key].queueContributor, 7);

        this.saveData(data);
    }

    freezeStreaks(guildId, userId, frozen = true) {
        const data = this.getData();
        const key = this.getKey(guildId, userId);

        if (data.users[key]) {
            data.users[key].frozen = frozen;
            this.saveData(data);
            return true;
        }
        return false;
    }

    getLeaderboard(guildId, streakType = 'dailyVisit', limit = 10) {
        const data = this.getData();

        const leaderboard = Object.values(data.users)
            .filter(u => u.guildId === guildId && u[streakType])
            .map(u => ({
                userId: u.userId,
                current: u[streakType].current,
                longest: u[streakType].longest
            }))
            .sort((a, b) => b.current - a.current)
            .slice(0, limit);

        return leaderboard;
    }

    // Streak rewards thresholds
    getRewards(streak) {
        const rewards = [];
        if (streak >= 7) rewards.push('+1 swap/hr');
        if (streak >= 30) rewards.push('+1 track slot');
        if (streak >= 100) rewards.push('custom role color');
        if (streak >= 365) rewards.push('skip immunity (1 track)');
        return rewards;
    }
}

module.exports = StreakStorage;
