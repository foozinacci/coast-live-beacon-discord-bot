/**
 * AccountLinker - Links Discord and Twitch accounts for unified profiles
 * Stores linked accounts and player stats
 */
const fs = require('fs');
const path = require('path');

class AccountLinker {
    constructor(client) {
        this.client = client;
        this.dataPath = path.join(__dirname, '../data/linked_accounts.json');
        this.pendingLinks = new Map(); // discordId -> { timestamp, attempts }
        this.accounts = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.dataPath)) {
                return JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
            }
        } catch (err) {
            console.error('[AccountLinker] Failed to load:', err);
        }
        return {};
    }

    save() {
        try {
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dataPath, JSON.stringify(this.accounts, null, 2));
        } catch (err) {
            console.error('[AccountLinker] Failed to save:', err);
        }
    }

    /**
     * Get or create a unified profile
     */
    getProfile(discordId = null, twitchUsername = null) {
        // Try to find by Discord ID first
        if (discordId && this.accounts[discordId]) {
            return this.accounts[discordId];
        }

        // Try to find by Twitch username
        if (twitchUsername) {
            const twitchLower = twitchUsername.toLowerCase();
            for (const [id, profile] of Object.entries(this.accounts)) {
                if (profile.twitchUsername?.toLowerCase() === twitchLower) {
                    return profile;
                }
            }
        }

        // Create new profile
        const profile = {
            discordId: discordId || null,
            twitchUsername: twitchUsername || null,
            preferredClass: null, // User's favorite class for priority assignment
            createdAt: Date.now(),
            stats: {
                // Core stats
                totalGames: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                damageDealt: 0,
                respawns: 0,

                // Class tracking (games + wins per class for best/worst)
                classStats: {
                    assault: { games: 0, wins: 0, kills: 0 },
                    support: { games: 0, wins: 0, kills: 0 },
                    recon: { games: 0, wins: 0, kills: 0 },
                    controller: { games: 0, wins: 0, kills: 0 },
                    skirmisher: { games: 0, wins: 0, kills: 0 }
                },

                // Nemesis tracking: { odiscordId or twitchUsername: killCount }
                killedBy: {},

                // Who you kill most
                victims: {}
            }
        };

        if (discordId) {
            this.accounts[discordId] = profile;
            this.save();
        }

        return profile;
    }

    /**
     * Link a Twitch account to a Discord account
     */
    linkTwitch(discordId, twitchUsername) {
        const profile = this.getProfile(discordId);

        // Check if Twitch is already linked to another Discord
        const twitchLower = twitchUsername.toLowerCase();
        for (const [id, p] of Object.entries(this.accounts)) {
            if (id !== discordId && p.twitchUsername?.toLowerCase() === twitchLower) {
                return { success: false, error: 'That Twitch account is already linked to another Discord user.' };
            }
        }

        profile.twitchUsername = twitchUsername;
        profile.linkedAt = Date.now();
        this.accounts[discordId] = profile;
        this.save();

        return { success: true, message: `Linked Twitch: ${twitchUsername}` };
    }

    /**
     * Set preferred class for priority assignment
     */
    setPreferredClass(discordId, classKey) {
        const validClasses = ['support', 'recon', 'controller', 'assault', 'skirmisher'];
        const normalized = classKey?.toLowerCase();

        if (!validClasses.includes(normalized)) {
            return { success: false, error: `Invalid class. Choose: ${validClasses.join(', ')}` };
        }

        const profile = this.getProfile(discordId);
        profile.preferredClass = normalized;
        this.accounts[discordId] = profile;
        this.save();

        return { success: true, classKey: normalized };
    }

    /**
     * Get user's preferred class
     */
    getPreferredClass(discordId) {
        const profile = this.accounts[discordId];
        return profile?.preferredClass || null;
    }

    /**
     * Unlink Twitch from Discord
     */
    unlinkTwitch(discordId) {
        const profile = this.accounts[discordId];
        if (!profile) {
            return { success: false, error: 'No profile found.' };
        }

        const oldTwitch = profile.twitchUsername;
        profile.twitchUsername = null;
        this.save();

        return { success: true, message: `Unlinked Twitch: ${oldTwitch}` };
    }

    /**
     * Update stats after a game
     */
    updateStats(discordId, twitchUsername, gameStats) {
        const profile = this.getProfile(discordId, twitchUsername);

        // Ensure stats structure exists (for old profiles)
        if (!profile.stats.classStats) {
            profile.stats.classStats = {
                assault: { games: 0, wins: 0, kills: 0 },
                support: { games: 0, wins: 0, kills: 0 },
                recon: { games: 0, wins: 0, kills: 0 },
                controller: { games: 0, wins: 0, kills: 0 },
                skirmisher: { games: 0, wins: 0, kills: 0 }
            };
        }
        if (!profile.stats.killedBy) profile.stats.killedBy = {};
        if (!profile.stats.victims) profile.stats.victims = {};

        // Core stats
        profile.stats.totalGames++;
        if (gameStats.won) {
            profile.stats.wins++;
        } else {
            profile.stats.losses++;
        }
        profile.stats.kills += gameStats.kills || 0;
        profile.stats.deaths += gameStats.deaths || 0;
        profile.stats.damageDealt += gameStats.damage || 0;
        profile.stats.respawns += gameStats.respawns || 0;

        // Class stats
        if (gameStats.classKey && profile.stats.classStats[gameStats.classKey]) {
            profile.stats.classStats[gameStats.classKey].games++;
            if (gameStats.won) {
                profile.stats.classStats[gameStats.classKey].wins++;
            }
            profile.stats.classStats[gameStats.classKey].kills += gameStats.kills || 0;
        }

        // Nemesis tracking - who killed this player
        if (gameStats.killedBy) {
            const nemesisKey = gameStats.killedBy; // discordId or twitchUsername
            profile.stats.killedBy[nemesisKey] = (profile.stats.killedBy[nemesisKey] || 0) + 1;
        }

        // Victim tracking - who this player killed
        if (gameStats.victims) {
            for (const victim of gameStats.victims) {
                profile.stats.victims[victim] = (profile.stats.victims[victim] || 0) + 1;
            }
        }

        profile.lastGame = Date.now();

        // Save if we have a Discord ID
        if (discordId) {
            this.accounts[discordId] = profile;
            this.save();
        }

        return profile;
    }

    /**
     * Calculate derived stats (KDR, best/worst class, nemesis)
     */
    getComputedStats(discordId) {
        const profile = this.accounts[discordId];
        if (!profile) return null;

        const stats = profile.stats;

        // KDR
        const kdr = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);

        // Win rate
        const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : '0.0';

        // Best class (highest win rate with min 3 games)
        let bestClass = null;
        let bestWinRate = -1;
        let worstClass = null;
        let worstWinRate = 101;

        if (stats.classStats) {
            for (const [className, cStats] of Object.entries(stats.classStats)) {
                if (cStats.games >= 3) {
                    const classWinRate = (cStats.wins / cStats.games) * 100;
                    if (classWinRate > bestWinRate) {
                        bestWinRate = classWinRate;
                        bestClass = className;
                    }
                    if (classWinRate < worstWinRate) {
                        worstWinRate = classWinRate;
                        worstClass = className;
                    }
                }
            }
        }

        // Nemesis (who kills them most)
        let nemesis = null;
        let nemesisKills = 0;
        if (stats.killedBy) {
            for (const [killer, count] of Object.entries(stats.killedBy)) {
                if (count > nemesisKills) {
                    nemesisKills = count;
                    nemesis = killer;
                }
            }
        }

        // Favorite victim
        let favoriteVictim = null;
        let victimKills = 0;
        if (stats.victims) {
            for (const [victim, count] of Object.entries(stats.victims)) {
                if (count > victimKills) {
                    victimKills = count;
                    favoriteVictim = victim;
                }
            }
        }

        return {
            ...stats,
            kdr,
            winRate: `${winRate}%`,
            bestClass: bestClass ? { name: bestClass, winRate: `${bestWinRate.toFixed(1)}%` } : null,
            worstClass: worstClass ? { name: worstClass, winRate: `${worstWinRate.toFixed(1)}%` } : null,
            nemesis: nemesis ? { name: nemesis, deaths: nemesisKills } : null,
            favoriteVictim: favoriteVictim ? { name: favoriteVictim, kills: victimKills } : null
        };
    }

    /**
     * Get aggregate community stats for a specific class
     */
    getClassCommunityStats(classKey) {
        const normalized = classKey?.toLowerCase();
        const validClasses = ['support', 'recon', 'controller', 'assault', 'skirmisher'];
        if (!validClasses.includes(normalized)) return null;

        let totalGames = 0;
        let totalWins = 0;
        let totalKills = 0;
        let totalPlayers = 0;
        const playerStats = []; // For top players

        // Aggregate across all accounts
        for (const [discordId, profile] of Object.entries(this.accounts)) {
            const classStats = profile.stats?.classStats?.[normalized];
            if (classStats && classStats.games > 0) {
                totalGames += classStats.games;
                totalWins += classStats.wins;
                totalKills += classStats.kills;
                totalPlayers++;

                // Track for leaderboard
                const winRate = classStats.games >= 3
                    ? (classStats.wins / classStats.games * 100)
                    : null;

                playerStats.push({
                    discordId,
                    games: classStats.games,
                    wins: classStats.wins,
                    kills: classStats.kills,
                    winRate
                });
            }
        }

        // Calculate aggregates
        const overallWinRate = totalGames > 0
            ? ((totalWins / totalGames) * 100).toFixed(1)
            : '0.0';
        const avgKillsPerGame = totalGames > 0
            ? (totalKills / totalGames).toFixed(1)
            : '0.0';

        // Top players by win rate (min 3 games)
        const topPlayers = playerStats
            .filter(p => p.winRate !== null && p.games >= 3)
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 3);

        // Most experienced (most games)
        const mostExperienced = playerStats
            .sort((a, b) => b.games - a.games)
            .slice(0, 3);

        // Calculate pick rate (for globalstats)
        let globalTotalGames = 0;
        for (const profile of Object.values(this.accounts)) {
            globalTotalGames += profile.stats?.totalGames || 0;
        }
        const pickRate = globalTotalGames > 0
            ? ((totalGames / globalTotalGames) * 100).toFixed(1)
            : '0.0';

        return {
            classKey: normalized,
            totalGames,
            totalWins,
            totalKills,
            totalPlayers,
            winRate: `${overallWinRate}%`,
            avgKillsPerGame,
            pickRate: `${pickRate}%`,
            topPlayers,
            mostExperienced
        };
    }

    /**
     * Prompt a Discord user to link their Twitch (called when they first join a game)
     */
    async promptLink(discordUser) {
        // Don't spam - check if we recently asked
        const pending = this.pendingLinks.get(discordUser.id);
        if (pending && Date.now() - pending.timestamp < 24 * 60 * 60 * 1000) {
            return; // Already asked in last 24 hours
        }

        // Check if already linked
        const profile = this.accounts[discordUser.id];
        if (profile?.twitchUsername) {
            return; // Already linked
        }

        try {
            const dm = await discordUser.createDM();
            await dm.send({
                content: `🎮 **WILDCARD - Link Your Accounts!**\n\n` +
                    `Want to use the same profile on both Discord and Twitch?\n` +
                    `Reply with your Twitch username to link them!\n\n` +
                    `Example: \`gsq_zeus\`\n\n` +
                    `*This lets you keep your stats whether you join via Discord or Twitch chat!*`
            });

            this.pendingLinks.set(discordUser.id, { timestamp: Date.now(), attempts: 0 });
        } catch (err) {
            // User has DMs disabled
            console.log(`[AccountLinker] Could not DM ${discordUser.username} - DMs disabled`);
        }
    }

    /**
     * Handle DM reply (called from message handler)
     */
    handleDMReply(message) {
        const pending = this.pendingLinks.get(message.author.id);
        if (!pending) return false;

        // User is replying to link prompt
        const twitchUsername = message.content.trim().replace('@', '');

        // Basic validation
        if (twitchUsername.length < 2 || twitchUsername.length > 25 || /\s/.test(twitchUsername)) {
            message.reply('❌ That doesn\'t look like a valid Twitch username. Try again!');
            return true;
        }

        const result = this.linkTwitch(message.author.id, twitchUsername);

        if (result.success) {
            message.reply(`✅ **Accounts linked!**\n\nDiscord: ${message.author.username}\nTwitch: ${twitchUsername}\n\n*Your stats will now sync across both platforms!*`);
            this.pendingLinks.delete(message.author.id);
        } else {
            message.reply(`❌ ${result.error}`);
        }

        return true;
    }

    /**
     * Get player's linked account info
     */
    getLinkedInfo(discordId) {
        const profile = this.accounts[discordId];
        if (!profile) return null;

        return {
            discordId: profile.discordId,
            twitchUsername: profile.twitchUsername,
            linked: !!profile.twitchUsername,
            stats: profile.stats
        };
    }

    /**
     * Find Discord ID by Twitch username
     */
    findDiscordByTwitch(twitchUsername) {
        const twitchLower = twitchUsername.toLowerCase();
        for (const [discordId, profile] of Object.entries(this.accounts)) {
            if (profile.twitchUsername?.toLowerCase() === twitchLower) {
                return discordId;
            }
        }
        return null;
    }
}

module.exports = AccountLinker;
