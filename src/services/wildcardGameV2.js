/**
 * WILDCARD GAME ENGINE V2
 * A mini battle royale game for Twitch-Discord integration
 * Pentagon-balanced class system with team-up bonuses
 */

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const XPStorage = require('../utils/xpStorage');

// Game states
const GameState = {
    IDLE: 'idle',
    LOBBY: 'lobby',
    IN_PROGRESS: 'in_progress',
    PERK_SELECTION: 'perk_selection',
    FINISHED: 'finished'
};

// =============================================================================
// BALANCED CLASS DEFINITIONS (Synced with Arena3D Simulation)
// =============================================================================
const CLASSES = {
    support: {
        name: 'Support',
        emoji: '⚪',
        color: '#ffffff',
        hp: 4500,
        dmg: [120, 150],
        accuracy: 0.93,
        evasion: 0.05,
        execute: 0.00,
        momentum: 10,
        hitbox: 1.00,
        range: 0.30,
        fireRate: 2.4,
        projectileSpeed: 500,
        weight: 1.2,
        role: 'Backline',
        description: 'Team sustain specialist with Second Chance respawn',
        perk1: 'Second Chance - Respawn once at 50% HP',
        perk2: 'False Positive - Deploy a decoy that attracts fire',
        teamBonus: '+5% Damage Resist for team',
        counters: 'Controller, Recon',
        counteredBy: 'Skirmisher, Assault'
    },
    recon: {
        name: 'Recon',
        emoji: '🔵',
        color: '#3498db',
        hp: 4000,
        dmg: [180, 250],
        accuracy: 0.91,
        evasion: 0.04,
        execute: 0.16,
        momentum: 5,
        hitbox: 1.02,
        range: 1.00,
        fireRate: 5.0,
        projectileSpeed: 800,
        weight: 0.8,
        role: 'Flank',
        description: 'Long-range sniper with high burst damage',
        perk1: 'Disrupt - Stun low-execute targets',
        perk2: 'Precision - +4% evasion when attacking',
        teamBonus: '+5% Accuracy for team',
        counters: 'Controller, Skirmisher',
        counteredBy: 'Support, Assault'
    },
    controller: {
        name: 'Controller',
        emoji: '🟣',
        color: '#9b59b6',
        hp: 5500,
        dmg: [100, 130],
        accuracy: 0.80,
        evasion: 0.00,
        execute: 0.05,
        momentum: 0,
        hitbox: 1.05,
        range: 0.50,
        fireRate: 3.0,
        projectileSpeed: 450,
        weight: 1.5,
        role: 'Anchor',
        damageReduction: 0.15,
        parryChance: 0.75,
        parryReflect: 0.50,
        description: 'Tanky anchor with parry shield and damage reflect',
        perk1: 'Parry Shield - 75% chance to block, reflect 50% damage',
        perk2: 'Suppress - Enemies suffer momentum penalty',
        teamBonus: '+5% Cooldown Reduction for team',
        counters: 'Assault, Skirmisher',
        counteredBy: 'Support, Recon'
    },
    assault: {
        name: 'Assault',
        emoji: '🔴',
        color: '#e74c3c',
        hp: 5000,
        dmg: [140, 180],
        accuracy: 0.95,
        evasion: 0.08,
        execute: 0.22,
        momentum: 30,
        hitbox: 1.08,
        range: 0.50,
        fireRate: 1.6,
        projectileSpeed: 550,
        weight: 1.0,
        role: 'Frontline',
        description: 'Aggressive bruiser with high execute chance',
        perk1: 'Rampage - +30% damage scaling with momentum',
        perk2: 'Execution - 22% instant-kill on low HP targets',
        teamBonus: '+5% Damage for team',
        counters: 'Support, Recon',
        counteredBy: 'Controller, Skirmisher'
    },
    skirmisher: {
        name: 'Skirmisher',
        emoji: '🟢',
        color: '#2ecc71',
        hp: 4200,
        dmg: [90, 120],
        accuracy: 0.87,
        evasion: 0.08,
        execute: 0.05,
        momentum: 40,
        hitbox: 1.03,
        range: 0.35,
        fireRate: 1.0,
        projectileSpeed: 600,
        weight: 0.7,
        role: 'Roam',
        secondLifeHp: 0.30,
        description: 'Speed demon with rapid attacks and mobility',
        perk1: 'Bleed - Attacks reduce enemy healing by 50%',
        perk2: 'Blooming Flower - 30% HP respawn on elimination',
        teamBonus: '+10 Momentum for team',
        counters: 'Support, Assault',
        counteredBy: 'Controller, Recon'
    }
};

const CLASS_KEYS = Object.keys(CLASSES);

// Pentagon relationships (who each class counters)
const PENTAGON = {
    support: ['controller', 'recon'],      // Support beats Controller, Recon
    controller: ['assault', 'skirmisher'], // Controller beats Assault, Skirmisher
    assault: ['support', 'recon'],         // Assault beats Support, Recon
    recon: ['controller', 'skirmisher'],   // Recon beats Controller, Skirmisher
    skirmisher: ['support', 'assault']     // Skirmisher beats Support, Assault
};

// =============================================================================
// TEAM NAMES (Based on class composition - MTG color wheel inspired)
// Key format: sorted classes joined by '-'
// =============================================================================
const TEAM_NAMES = {
    'controller-recon-support': 'SPECTRALS',      // W/U/B
    'assault-recon-support': 'FLASHPOINT',        // W/U/R
    'recon-skirmisher-support': 'BLOOMTIDE',      // W/U/G
    'assault-controller-support': 'CINDERVOW',    // W/B/R
    'controller-skirmisher-support': 'HOLLOWROOT', // W/B/G
    'assault-skirmisher-support': 'BLAZEWILD',    // W/R/G
    'assault-controller-recon': 'VENOMFLARE',     // U/B/R
    'controller-recon-skirmisher': 'MURKVINE',    // U/B/G
    'assault-recon-skirmisher': 'STORMBRIAR',     // U/R/G
    'assault-controller-skirmisher': 'BLIGHTMAW'  // B/R/G
};

// =============================================================================
// PERK DEFINITIONS (Category A: Game Changers, Category B: Rewards)
// =============================================================================
const PERKS_CATEGORY_A = {
    secondLife: {
        name: 'Second Life',
        emoji: '💫',
        description: 'Respawn once at 25% HP if eliminated this round',
        effect: { secondLife: true, respawnHp: 0.25 }
    },
    accuracyBoost: {
        name: 'Accuracy+',
        emoji: '🎯',
        description: '+5% accuracy for this round',
        effect: { accuracyBonus: 0.05 }
    },
    evasionBoost: {
        name: 'Evasion+',
        emoji: '💨',
        description: '+5% evasion for this round',
        effect: { evasionBonus: 0.05 }
    },
    damageBoost: {
        name: 'Damage+',
        emoji: '⚔️',
        description: '+5% damage for this round',
        effect: { damageBonus: 0.05 }
    },
    healthBoost: {
        name: 'Health+',
        emoji: '❤️',
        description: '+5% max HP for this round',
        effect: { healthBonus: 0.05 }
    }
};

const PERKS_CATEGORY_B = {
    contract: {
        name: 'CONTRACT',
        emoji: '📜',
        description: 'XP reward based on matched condition (not just winning)',
        effect: { contractReward: true }
    },
    momentum: {
        name: 'MOMENTUM',
        emoji: '📈',
        description: '+10% XP per round survived',
        effect: { xpPerRound: 0.10 }
    },
    allIn: {
        name: 'ALL IN',
        emoji: '🎲',
        description: 'Bet all your XP - double if you win, lose to winners if not',
        effect: { allIn: true }
    },
    teamXpBonus: {
        name: 'TEAM XP',
        emoji: '👥',
        description: 'Whole team receives +5% XP bonus',
        effect: { teamXpBonus: 0.05 }
    },
    xpPirate: {
        name: 'XP PIRATE',
        emoji: '☠️',
        description: 'Convert damage dealt into XP',
        effect: { damageToXp: true }
    }
};

const BASE_DAMAGE = 35;
const TEAM_UP_BONUS = 0.07; // 7% per ally/enemy

// =============================================================================
// WILDCARD GAME CLASS
// =============================================================================
class WildcardGame {
    constructor(discordClient) {
        this.client = discordClient;
        this.games = new Map(); // guildId -> gameState
        this.xpStorage = new XPStorage();

        // Global player tracking - prevents joining multiple games across servers
        this.activePlayers = new Map(); // discordId/twitchUsername -> guildId

        // Daily game cap tracking: { odiscordId: { date: 'YYYY-MM-DD', count: N } }
        this.dailyPlays = new Map();
        this.DAILY_CAP = 3; // Max games per day (configurable)
    }

    /**
     * Get today's date string for tracking
     */
    getTodayKey() {
        return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    }

    /**
     * Check if player has reached daily cap
     */
    getDailyPlays(playerId) {
        const today = this.getTodayKey();
        const data = this.dailyPlays.get(playerId);

        if (!data || data.date !== today) {
            return 0;
        }
        return data.count;
    }

    /**
     * Increment daily play count
     */
    incrementDailyPlays(playerId) {
        const today = this.getTodayKey();
        const data = this.dailyPlays.get(playerId);

        if (!data || data.date !== today) {
            this.dailyPlays.set(playerId, { date: today, count: 1 });
        } else {
            data.count++;
        }
    }

    /**
     * Check if today is player's birthday (uses bot's birthday service)
     */
    async isBirthday(guildId, userId) {
        try {
            const BirthdayStorage = require('../utils/birthdayStorage');
            const storage = new BirthdayStorage();
            const birthdays = storage.getToday(guildId);
            return birthdays.some(b => b.userId === userId);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if a player is already in a game anywhere
     */
    isPlayerInActiveGame(playerId) {
        return this.activePlayers.has(playerId);
    }

    /**
     * Get which guild a player is currently playing in
     */
    getPlayerActiveGuild(playerId) {
        return this.activePlayers.get(playerId);
    }

    /**
     * Register a player as active in a game
     */
    registerActivePlayer(playerId, guildId) {
        this.activePlayers.set(playerId, guildId);
    }

    /**
     * Remove a player from active tracking
     */
    unregisterActivePlayer(playerId) {
        this.activePlayers.delete(playerId);
    }

    /**
     * Clear all active players for a guild (game ended)
     */
    clearActivePlayersForGuild(guildId) {
        for (const [playerId, guild] of this.activePlayers) {
            if (guild === guildId) {
                this.activePlayers.delete(playerId);
            }
        }
    }

    // Get or create game state for a guild
    getGame(guildId) {
        if (!this.games.has(guildId)) {
            this.games.set(guildId, {
                state: GameState.IDLE,
                players: new Map(), // oddzielne stany
                teams: [],
                round: 0,
                maxPlayers: 15,
                minPlayers: 6,
                teamSize: 3,
                readyPlayers: new Set(),
                roundResults: [],
                startTime: null,
                discordChannelId: null,
                // Perk system
                perkSelectionActive: false,
                perkChoices: new Map(),
                perkTimer: null,
                currentPerkOptions: { a: null, b: null },
                usedPerksA: new Set(), // Perks used this match (no repeats)
                usedPerksB: new Set(),
                // Lobby timer
                lobbyTimer: null,
                lobbyTimeRemaining: 60000,
                lobbyCountdownActive: false,
                // Match tracking
                matchKills: new Map(), // playerId -> { kills, damage, deaths }
                secondChanceUsed: new Set() // Players who used Support respawn
            });
        }
        return this.games.get(guildId);
    }

    // =============================================================================
    // CLASS ASSIGNMENT LOGIC
    // =============================================================================

    /**
     * Get a normalized key for team composition (sorted for comparison)
     */
    getCompositionKey(classes) {
        return [...classes].sort().join('-');
    }

    /**
     * Get the thematic team name based on class composition
     */
    getTeamName(classes) {
        const key = this.getCompositionKey(classes);
        return TEAM_NAMES[key] || `Team ${key}`;
    }

    /**
     * Generate random compositions with strict constraints:
     * 1. No duplicate classes on same team
     * 2. Max 3 of any class across entire lobby  
     * 3. No duplicate team compositions (unique combos required)
     */
    generateRandomCompositions(numTeams) {
        const allClasses = CLASS_KEYS; // ['support', 'recon', 'controller', 'assault', 'skirmisher']
        const globalClassCount = {};
        allClasses.forEach(c => globalClassCount[c] = 0);

        const usedCompositions = new Set(); // Track used team combos
        const compositions = [];

        const MAX_ATTEMPTS = 100; // Prevent infinite loops

        for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
            let teamComp = null;
            let attempts = 0;

            while (!teamComp && attempts < MAX_ATTEMPTS) {
                attempts++;
                const candidate = this.generateSingleTeamComp(allClasses, globalClassCount);

                if (!candidate) continue;

                const compKey = this.getCompositionKey(candidate);

                // Check if this exact composition is already used
                if (usedCompositions.has(compKey)) {
                    continue; // Try again - duplicate team combo
                }

                // Valid composition found
                teamComp = candidate;
                usedCompositions.add(compKey);

                // Update global counts
                for (const cls of teamComp) {
                    globalClassCount[cls]++;
                }
            }

            if (!teamComp) {
                // Fallback if we can't find unique - use any valid team
                console.warn(`[Wildcard] Could not generate unique team ${teamIndex + 1}, using fallback`);
                teamComp = this.generateFallbackTeam(allClasses, globalClassCount);
                for (const cls of teamComp) {
                    globalClassCount[cls]++;
                }
            }

            compositions.push(teamComp);
        }

        return compositions;
    }

    /**
     * Generate a single valid team composition
     * Rules: 3 unique classes, each class max 3 globally
     */
    generateSingleTeamComp(allClasses, globalClassCount) {
        const team = [];
        const usedOnTeam = new Set();

        for (let slot = 0; slot < 3; slot++) {
            // Get available classes (not on team yet, not at global max)
            const available = allClasses.filter(c =>
                !usedOnTeam.has(c) && globalClassCount[c] < 3
            );

            if (available.length === 0) {
                return null; // Can't complete this team
            }

            // Random selection
            const classKey = available[Math.floor(Math.random() * available.length)];
            team.push(classKey);
            usedOnTeam.add(classKey);
        }

        return team;
    }

    /**
     * Fallback team generation (less strict)
     */
    generateFallbackTeam(allClasses, globalClassCount) {
        const team = [];
        const usedOnTeam = new Set();

        for (let slot = 0; slot < 3; slot++) {
            let available = allClasses.filter(c => !usedOnTeam.has(c));

            if (available.length === 0) {
                available = allClasses; // Last resort
            }

            const classKey = available[Math.floor(Math.random() * available.length)];
            team.push(classKey);
            usedOnTeam.add(classKey);
        }

        return team;
    }

    // =============================================================================
    // TEAM-UP BONUS CALCULATION
    // =============================================================================

    calculateTeamUpBonus(playerClass, allyClasses, enemyClasses, anchoredAllies, anchoredEnemies) {
        const allies = PENTAGON[playerClass] || [];
        const enemies = Object.entries(PENTAGON)
            .filter(([_, counters]) => counters.includes(playerClass))
            .map(([cls]) => cls);

        // Anchored component (50%) - based on initial team comp
        let anchoredAllyCount = anchoredAllies.filter(c => allies.includes(c)).length;
        let anchoredEnemyCount = anchoredEnemies.filter(c => enemies.includes(c)).length;

        // Live component (50%) - based on current alive state
        let liveAllyCount = allyClasses.filter(c => allies.includes(c)).length;
        let liveEnemyCount = enemyClasses.filter(c => enemies.includes(c)).length;

        const anchoredBonus = (anchoredAllyCount - anchoredEnemyCount) * TEAM_UP_BONUS * 0.5;
        const liveBonus = (liveAllyCount - liveEnemyCount) * TEAM_UP_BONUS * 0.5;

        return {
            damageBonus: 1 + Math.max(0, anchoredBonus + liveBonus),
            defenseBonus: 1 + Math.max(0, -(anchoredBonus + liveBonus))
        };
    }

    // =============================================================================
    // COMBAT ENGINE (Pentagon-Balanced)
    // =============================================================================

    calculateHitChance(attacker, defender) {
        const attackerClass = CLASSES[attacker.classKey];
        const defenderClass = CLASSES[defender.classKey];

        let accuracy = attackerClass.accuracy;
        let evasion = defenderClass.evasion;
        let hitbox = defenderClass.hitbox;

        // Apply perk bonuses
        if (attacker.roundPerk?.effect?.accuracyBonus) {
            accuracy += attacker.roundPerk.effect.accuracyBonus;
        }
        if (defender.roundPerk?.effect?.evasionBonus) {
            evasion += defender.roundPerk.effect.evasionBonus;
        }

        // Recon precision bonus
        if (attacker.classKey === 'recon') {
            evasion += 0.04; // Harder to hit back
        }

        // Base hit chance
        let hitChance = accuracy * hitbox * (1 - evasion);

        return Math.max(0.05, Math.min(0.95, hitChance));
    }

    calculateDamage(attacker, defender, livingPlayers, maxPlayers) {
        const attackerClass = CLASSES[attacker.classKey];
        const defenderClass = CLASSES[defender.classKey];

        let damage = BASE_DAMAGE;

        // Health scaling (more players = less damage)
        const scaleFactor = 0.15;
        const healthScale = 1.00 + scaleFactor * (livingPlayers - 1) / (maxPlayers - 1);

        // Momentum bonus (Assault)
        if (attacker.classKey === 'assault') {
            const momentumBonus = (attackerClass.momentum / 100) * 0.30;
            damage *= (1 + momentumBonus);
        }

        // Controller momentum penalty to enemies
        if (defender.classKey === 'controller') {
            const momentumPenalty = (attackerClass.momentum / 100) * 0.15;
            damage *= (1 - momentumPenalty);
        }

        // Skirmisher counter bonus vs high accuracy
        if (attacker.classKey === 'skirmisher' && defenderClass.accuracy >= 0.95) {
            damage *= 1.30;
        }

        // Apply perk bonuses
        if (attacker.roundPerk?.effect?.damageBonus) {
            damage *= (1 + attacker.roundPerk.effect.damageBonus);
        }

        // Apply team-up bonuses (simplified for now)
        damage *= healthScale;

        return Math.round(damage);
    }

    checkExecute(attacker, defender) {
        const attackerClass = CLASSES[attacker.classKey];
        const defenderClass = CLASSES[defender.classKey];

        const executeChance = attackerClass.execute;
        const hpPercent = defender.hp / defender.maxHp;

        // Execute only works on low HP targets (below 30%)
        if (hpPercent > 0.30) return false;

        // Modified chance based on target HP
        const modifiedChance = executeChance * (1 - hpPercent);

        return Math.random() < modifiedChance;
    }

    // =============================================================================
    // PERK SYSTEM
    // =============================================================================

    getRandomPerkPair(game) {
        // Get unused perks
        const availableA = Object.keys(PERKS_CATEGORY_A).filter(k => !game.usedPerksA.has(k));
        const availableB = Object.keys(PERKS_CATEGORY_B).filter(k => !game.usedPerksB.has(k));

        if (availableA.length === 0 || availableB.length === 0) {
            // Reset pools if exhausted
            game.usedPerksA.clear();
            game.usedPerksB.clear();
            return this.getRandomPerkPair(game);
        }

        const perkA = availableA[Math.floor(Math.random() * availableA.length)];
        const perkB = availableB[Math.floor(Math.random() * availableB.length)];

        return { a: perkA, b: perkB };
    }

    // =============================================================================
    // BROADCAST METHODS
    // =============================================================================

    async broadcastToDiscord(guildId, embed) {
        const game = this.getGame(guildId);
        if (!game.discordChannelId || !this.client) return;

        try {
            const channel = await this.client.channels.fetch(game.discordChannelId);
            if (channel) {
                await channel.send({ embeds: [embed] });
            }
        } catch (e) {
            console.error('Failed to broadcast to Discord:', e.message);
        }
    }

    async broadcastText(guildId, text) {
        const game = this.getGame(guildId);
        if (!game.discordChannelId || !this.client) return;

        try {
            const channel = await this.client.channels.fetch(game.discordChannelId);
            if (channel) {
                await channel.send(text);
            }
        } catch (e) {
            console.error('Failed to broadcast text:', e.message);
        }
    }

    broadcastToTwitch(guildId, message) {
        if (!this.client.twitchChat) return;

        const twitchChat = this.client.twitchChat;
        const linkedChannels = twitchChat.linkedChannels;

        for (const [channel, linkedGuildId] of linkedChannels) {
            if (linkedGuildId === guildId) {
                twitchChat.say(guildId, channel, message);
                return;
            }
        }
    }

    // =============================================================================
    // GAME FLOW METHODS
    // =============================================================================

    setDiscordChannel(guildId, channelId) {
        const game = this.getGame(guildId);
        game.discordChannelId = channelId;
    }

    async join(guildId, userId, username, platform = 'discord') {
        const game = this.getGame(guildId);

        // Check if player is in a game anywhere (global check)
        if (this.isPlayerInActiveGame(userId)) {
            const activeGuild = this.getPlayerActiveGuild(userId);
            if (activeGuild !== guildId) {
                return { success: false, error: "You're already in a game in another server! Finish that game first." };
            }
        }

        if (game.players.has(userId)) {
            return { success: false, error: "You're already in the game!" };
        }

        if (game.state !== GameState.IDLE && game.state !== GameState.LOBBY) {
            return { success: false, error: 'Game already in progress. Wait for next round!' };
        }

        if (game.players.size >= game.maxPlayers) {
            return { success: false, error: 'Game is full!' };
        }

        // Daily cap check (birthday bypass)
        const dailyPlays = this.getDailyPlays(userId);
        const hasBirthday = await this.isBirthday(guildId, userId);

        if (dailyPlays >= this.DAILY_CAP && !hasBirthday) {
            return { success: false, error: `You've reached your daily limit of ${this.DAILY_CAP} games! Come back tomorrow. 🎮` };
        }

        // Register player as active globally and increment daily count
        this.registerActivePlayer(userId, guildId);
        this.incrementDailyPlays(userId);

        // Add player (class assigned at game start)
        game.players.set(userId, {
            userId,
            username,
            platform,
            team: null,
            classKey: null,
            hp: 100,
            maxHp: 100,
            alive: true,
            perks: [],
            roundPerk: null,
            kills: 0,
            damage: 0,
            roundsSurvived: 0,
            allInBet: 0
        });

        if (game.state === GameState.IDLE) {
            game.state = GameState.LOBBY;
            game.startTime = Date.now();
        }

        // Timer logic for 9+ players
        let timerMessage = '';
        const COUNTDOWN_TIMERS = { 9: 60000, 10: 60000, 11: 30000, 12: 15000, 13: 8000, 14: 4000, 15: 2000 };

        if (game.players.size >= 9) {
            const playerCount = game.players.size;
            if (playerCount >= game.maxPlayers) {
                timerMessage = ' 🚀 LOBBY FULL! Starting in 2s!';
                this.cancelLobbyTimer(guildId);
                setTimeout(() => this.autoStartGame(guildId), 2000);
            } else {
                game.lobbyTimeRemaining = COUNTDOWN_TIMERS[playerCount] || 60000;
                game.lobbyCountdownActive = true;
                this.restartLobbyCountdown(guildId);
                timerMessage = ` ⏱️ ${Math.ceil(game.lobbyTimeRemaining / 1000)}s countdown!`;
            }
        }

        const needed = Math.max(0, 9 - game.players.size);
        const neededText = needed > 0 ? ` Need ${needed} more! "!lbjoin" to join!` : '';

        return {
            success: true,
            playerCount: game.players.size,
            needed,
            message: `${username} joined! (${game.players.size}/${game.maxPlayers})${timerMessage}${neededText}`
        };
    }

    restartLobbyCountdown(guildId) {
        const game = this.getGame(guildId);
        if (game.lobbyTimer) clearTimeout(game.lobbyTimer);
        game.lobbyTimer = setTimeout(() => this.autoStartGame(guildId), game.lobbyTimeRemaining);
    }

    cancelLobbyTimer(guildId) {
        const game = this.getGame(guildId);
        if (game.lobbyTimer) {
            clearTimeout(game.lobbyTimer);
            game.lobbyTimer = null;
        }
        game.lobbyCountdownActive = false;
    }

    /**
     * Fill lobby with bots to complete teams then start
     * Team targets: 9 (3 teams), 12 (4 teams), 15 (5 teams)
     */
    startFill(guildId) {
        const game = this.getGame(guildId);

        if (game.state !== GameState.IDLE && game.state !== GameState.LOBBY) {
            return { success: false, error: 'Game already in progress!' };
        }

        const currentPlayers = game.players.size;

        // Determine target player count (fills to complete teams)
        let targetCount;
        if (currentPlayers <= 9) {
            targetCount = 9;  // 3 teams
        } else if (currentPlayers <= 12) {
            targetCount = 12; // 4 teams
        } else {
            targetCount = 15; // 5 teams
        }

        const botsNeeded = targetCount - currentPlayers;
        const botsAdded = [];

        // Add bots
        for (let i = 1; i <= botsNeeded; i++) {
            const botId = `bot_${Date.now()}_${i}`;
            const botName = `Bot #${i}`;

            // Determine team (interleaved assignment)
            const numTeams = Math.ceil(targetCount / 3);
            const currentIndex = currentPlayers + i - 1;
            let team;
            if (currentIndex < 9) {
                team = (currentIndex % 3) + 1;
            } else if (currentIndex < 12) {
                team = 4;
            } else {
                team = 5;
            }

            game.players.set(botId, {
                userId: botId,
                username: botName,
                platform: 'bot',
                team: null,
                classKey: null,
                hp: 100,
                maxHp: 100,
                alive: true,
                perks: [],
                damage: 0,
                kills: 0,
                roundsSurvived: 0,
                isBot: true
            });

            botsAdded.push(botName);
        }

        // Update state to lobby if needed
        if (game.state === GameState.IDLE) {
            game.state = GameState.LOBBY;
        }

        // Start the game
        const result = this.startGame(guildId);

        return {
            success: true,
            botsAdded: botsAdded.length,
            botNames: botsAdded,
            totalPlayers: game.players.size,
            ...result
        };
    }

    autoStartGame(guildId) {
        const game = this.getGame(guildId);
        if (game.state !== GameState.LOBBY) return;
        if (game.players.size < 3) return; // Minimum 3 players (1 team)

        console.log(`🎮 Auto-starting Wildcard for guild ${guildId}`);
        this.startGame(guildId);
    }

    startGame(guildId) {
        const game = this.getGame(guildId);

        if (game.players.size < 3) {
            return { success: false, error: 'Need at least 3 players!' };
        }

        // Determine number of teams (seat order: 123123123 444 555)
        const playerCount = game.players.size;
        let numTeams;
        if (playerCount <= 9) numTeams = Math.min(3, Math.ceil(playerCount / 3));
        else if (playerCount <= 12) numTeams = 4;
        else numTeams = 5;

        // Generate random class compositions with constraints
        const compositions = this.generateRandomCompositions(numTeams);

        // Create teams with thematic names
        game.teams = [];
        for (let i = 0; i < numTeams; i++) {
            game.teams.push({
                id: i + 1,
                name: this.getTeamName(compositions[i]), // Thematic name based on composition
                players: [],
                alive: true,
                anchoredClasses: compositions[i] // Store initial composition
            });
        }

        // Assign players to teams in seat order: 123123123 444 555
        const playerArray = Array.from(game.players.values());

        // Get preferred classes from accountLinker
        const getPreferred = (userId) => {
            try {
                return this.client?.accountLinker?.getPreferredClass(userId) || null;
            } catch (e) {
                return null;
            }
        };

        // Helper to assign player to team with preference support
        const assignPlayerToTeam = (player, teamIndex, availableClasses) => {
            const preferredClass = getPreferred(player.userId);
            let assignedClass = null;

            // Try to assign preferred class if available
            if (preferredClass && availableClasses.includes(preferredClass)) {
                assignedClass = preferredClass;
                availableClasses.splice(availableClasses.indexOf(preferredClass), 1);
            } else {
                // Take first available
                assignedClass = availableClasses.shift() || 'support';
            }

            player.team = teamIndex + 1;
            player.classKey = assignedClass;
            player.hp = CLASSES[player.classKey].hp;
            player.maxHp = CLASSES[player.classKey].hp;
            player.gotPreferred = assignedClass === preferredClass;

            game.teams[teamIndex].players.push(player.userId);
            game.players.set(player.userId, player);
        };

        // Track remaining classes per team
        const teamAvailableClasses = compositions.map(comp => [...comp]); // Clone
        let playerIndex = 0;

        // First 9 players: interleaved 123123123
        for (let slot = 0; slot < 9 && playerIndex < playerArray.length; slot++) {
            const teamIndex = slot % Math.min(3, numTeams);
            const player = playerArray[playerIndex];

            assignPlayerToTeam(player, teamIndex, teamAvailableClasses[teamIndex]);
            playerIndex++;
        }

        // Remaining players: sequential 444 555
        for (let teamIndex = 3; teamIndex < numTeams && playerIndex < playerArray.length; teamIndex++) {
            for (let slot = 0; slot < 3 && playerIndex < playerArray.length; slot++) {
                const player = playerArray[playerIndex];

                assignPlayerToTeam(player, teamIndex, teamAvailableClasses[teamIndex]);
                playerIndex++;
            }
        }

        game.state = GameState.IN_PROGRESS;
        game.round = 0;
        game.usedPerksA.clear();
        game.usedPerksB.clear();

        // Generate spectator code if API is available
        let spectatorCode = null;
        if (this.client?.wildcardAPI) {
            spectatorCode = this.client.wildcardAPI.registerGame(guildId);
            game.spectatorCode = spectatorCode;
        }

        // Start first perk selection
        setTimeout(() => this.startPerkSelection(guildId), 2000);

        return {
            success: true,
            spectatorCode,
            teams: game.teams.map(t => ({
                id: t.id,
                players: t.players.map(id => {
                    const p = game.players.get(id);
                    const cls = CLASSES[p.classKey];
                    return `${p.username} ${cls.emoji}${cls.name}`;
                })
            })),
            message: 'Game started! Perk selection in 2 seconds...'
        };
    }

    // =============================================================================
    // PERK SELECTION
    // =============================================================================

    async startPerkSelection(guildId) {
        const game = this.getGame(guildId);
        if (game.state !== GameState.IN_PROGRESS) return;

        game.round++;
        game.perkSelectionActive = true;
        game.perkChoices.clear();

        // Get random unused perk pair
        const perkPair = this.getRandomPerkPair(game);
        game.currentPerkOptions = perkPair;

        // Mark as used
        game.usedPerksA.add(perkPair.a);
        game.usedPerksB.add(perkPair.b);

        const perkA = PERKS_CATEGORY_A[perkPair.a];
        const perkB = PERKS_CATEGORY_B[perkPair.b];

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🃏 ROUND ${game.round} - PICK YOUR PERK!`)
            .setDescription('**You have 30 seconds to choose!**')
            .addFields(
                { name: `!lbperk1 - ${perkA.emoji} ${perkA.name}`, value: perkA.description, inline: true },
                { name: `!lbperk2 - ${perkB.emoji} ${perkB.name}`, value: perkB.description, inline: true }
            )
            .setFooter({ text: '⚠️ No response = -10 HP penalty!' })
            .setTimestamp();

        await this.broadcastToDiscord(guildId, embed);
        this.broadcastToTwitch(guildId, `⚡ R${game.round}: !lbperk1 (${perkA.name}) or !lbperk2 (${perkB.name}) | 30s!`);

        game.perkTimer = setTimeout(() => this.endPerkSelection(guildId), 30000);
    }

    async endPerkSelection(guildId) {
        const game = this.getGame(guildId);
        if (!game.perkSelectionActive) return;

        game.perkSelectionActive = false;
        if (game.perkTimer) {
            clearTimeout(game.perkTimer);
            game.perkTimer = null;
        }

        const penalized = [];
        const perkResults = [];

        for (const [userId, player] of game.players) {
            if (!player.alive) continue;

            if (!game.perkChoices.has(userId)) {
                player.hp = Math.max(1, player.hp - 10);
                penalized.push(player.username);
            } else {
                const choice = game.perkChoices.get(userId);
                if (choice === 1) {
                    const perkKey = game.currentPerkOptions.a;
                    player.roundPerk = PERKS_CATEGORY_A[perkKey];
                    perkResults.push(`${player.username}: ${player.roundPerk.emoji} ${player.roundPerk.name}`);
                } else {
                    const perkKey = game.currentPerkOptions.b;
                    player.roundPerk = PERKS_CATEGORY_B[perkKey];
                    perkResults.push(`${player.username}: ${player.roundPerk.emoji} ${player.roundPerk.name}`);
                }
            }
        }

        // Broadcast results
        let resultText = '';
        if (perkResults.length > 0) resultText = '**Perks:**\n' + perkResults.join('\n');
        if (penalized.length > 0) resultText += '\n\n**⚠️ -10 HP:** ' + penalized.join(', ');

        if (resultText) {
            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`📋 Round ${game.round} - Perks Selected`)
                .setDescription(resultText)
                .setTimestamp();
            await this.broadcastToDiscord(guildId, embed);
        }

        await this.runCombatRound(guildId);
    }

    pickPerk(guildId, userId, choice) {
        const game = this.getGame(guildId);

        if (!game.perkSelectionActive) {
            return { success: false, error: 'No perk selection active!' };
        }

        if (!game.players.has(userId)) {
            return { success: false, error: "You're not in this game!" };
        }

        const player = game.players.get(userId);
        if (!player.alive) {
            return { success: false, error: "You've been eliminated!" };
        }

        if (game.perkChoices.has(userId)) {
            return { success: false, error: 'You already picked!' };
        }

        const choiceNum = parseInt(choice);
        if (choiceNum !== 1 && choiceNum !== 2) {
            return { success: false, error: 'Choose 1 or 2!' };
        }

        game.perkChoices.set(userId, choiceNum);

        // Check if all picked
        const alivePlayers = [...game.players.values()].filter(p => p.alive);
        const allPicked = alivePlayers.every(p => game.perkChoices.has(p.userId));

        if (allPicked && game.perkTimer) {
            clearTimeout(game.perkTimer);
            setTimeout(() => this.endPerkSelection(guildId), 500);
        }

        return { success: true, message: `Perk ${choice} locked in! ✓` };
    }

    // =============================================================================
    // COMBAT ROUND
    // =============================================================================

    async runCombatRound(guildId) {
        const game = this.getGame(guildId);
        const result = this.simulateRound(guildId);

        if (result.finished) {
            // Game over - send detailed winner report
            await this.sendWinnerReport(guildId, result.winner);
            this.awardXP(guildId, result.winner);
            this.reset(guildId);
        } else {
            const embed = new EmbedBuilder()
                .setColor('#FF6B00')
                .setTitle(`⚔️ ROUND ${game.round} RESULTS`)
                .setDescription(result.events.join('\n') || 'No eliminations!')
                .setTimestamp();

            await this.broadcastToDiscord(guildId, embed);

            // Clear round perks
            for (const player of game.players.values()) {
                if (player.alive) player.roundsSurvived++;
                player.roundPerk = null;
            }

            setTimeout(() => this.startPerkSelection(guildId), 2000);
        }
    }

    simulateRound(guildId) {
        const game = this.getGame(guildId);
        const events = [];
        const aliveTeams = game.teams.filter(t => t.alive);

        if (aliveTeams.length <= 1) {
            return { events, finished: true, winner: aliveTeams[0] };
        }

        // Get all alive players
        const alivePlayers = [...game.players.values()].filter(p => p.alive);
        const maxPlayers = game.players.size;

        // Each alive player attacks a random enemy
        for (const attacker of alivePlayers) {
            if (!attacker.alive) continue;

            // Find enemy targets
            const enemies = alivePlayers.filter(p =>
                p.alive && p.team !== attacker.team
            );

            if (enemies.length === 0) continue;

            const defender = enemies[Math.floor(Math.random() * enemies.length)];

            // Calculate hit
            const hitChance = this.calculateHitChance(attacker, defender);
            if (Math.random() > hitChance) continue; // Miss

            // Calculate damage
            const damage = this.calculateDamage(attacker, defender, alivePlayers.length, maxPlayers);

            // Apply damage
            defender.hp -= damage;
            attacker.damage += damage;

            // Check execute
            if (defender.hp > 0 && this.checkExecute(attacker, defender)) {
                defender.hp = 0;
                events.push(`🎯 ${attacker.username} EXECUTED ${defender.username}!`);
            }

            // Check elimination
            if (defender.hp <= 0) {
                // Check for Second Chance (Support perk or class)
                const hasSecondChance = defender.roundPerk?.effect?.secondLife ||
                    (defender.classKey === 'support' && !game.secondChanceUsed.has(defender.userId));

                if (hasSecondChance && defender.classKey === 'support') {
                    game.secondChanceUsed.add(defender.userId);
                    defender.hp = Math.round(defender.maxHp * 0.50);
                    defender.alive = true;
                    defender.respawns = (defender.respawns || 0) + 1;
                    events.push(`💫 ${defender.username} used SECOND CHANCE! (50% HP)`);
                } else if (hasSecondChance) {
                    defender.hp = Math.round(defender.maxHp * 0.25);
                    defender.alive = true;
                    defender.respawns = (defender.respawns || 0) + 1;
                    events.push(`💫 ${defender.username} respawned at 25% HP!`);
                } else {
                    defender.alive = false;
                    defender.killedBy = attacker.username;
                    defender.killedByClass = attacker.classKey;
                    defender.deaths = (defender.deaths || 0) + 1;
                    attacker.kills++;

                    // Track victim for nemesis system
                    if (!attacker.victims) attacker.victims = [];
                    attacker.victims.push(defender.userId);

                    events.push(`💀 ${defender.username} eliminated by ${attacker.username}!`);
                }
            }
        }

        // Update team status and track eliminations
        const remainingTeamCount = game.teams.filter(t => t.alive).length;

        for (const team of game.teams) {
            const aliveInTeam = team.players.filter(pid => {
                const p = game.players.get(pid);
                return p && p.alive;
            });

            const wasAlive = team.alive;
            team.alive = aliveInTeam.length > 0;

            // Team just got eliminated - generate report
            if (wasAlive && !team.alive) {
                team.placement = remainingTeamCount + 1; // They placed based on remaining teams
                events.push(`☠️ **${team.name}** ELIMINATED! (${this.getPlacementText(team.placement)})`);

                // Schedule detailed report (async)
                this.sendEliminationReport(guildId, team);
            }
        }

        // Check winner
        const remaining = game.teams.filter(t => t.alive);
        if (remaining.length === 1) {
            return { events, finished: true, winner: remaining[0] };
        }

        return { events, finished: false };
    }

    // =============================================================================
    // ELIMINATION REPORTS
    // =============================================================================

    getPlacementText(placement) {
        const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
        const suffix = suffixes[placement] || 'th';
        return `${placement}${suffix} Place`;
    }

    async sendEliminationReport(guildId, team) {
        const game = this.getGame(guildId);
        const totalTeams = game.teams.length;

        // Build player stats
        const playerStats = team.players.map(pid => {
            const p = game.players.get(pid);
            if (!p) return null;

            const cls = CLASSES[p.classKey];
            return {
                username: p.username,
                platform: p.platform,
                classKey: p.classKey,
                classEmoji: cls?.emoji || '❓',
                className: cls?.name || p.classKey,
                damage: p.damage || 0,
                kills: p.kills || 0,
                deaths: p.deaths || 0,
                respawns: p.respawns || 0,
                killedBy: p.killedBy || 'Ring-out',
                killedByClass: p.killedByClass || null,
                roundsSurvived: p.roundsSurvived || 0,
                victims: p.victims || []
            };
        }).filter(Boolean);

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle(`☠️ ${team.name} ELIMINATED!`)
            .setDescription(`**${this.getPlacementText(team.placement)}** of ${totalTeams} teams`)
            .setTimestamp();

        // Add player stats
        for (const p of playerStats) {
            const killerInfo = p.killedByClass
                ? `${CLASSES[p.killedByClass]?.emoji || ''} ${p.killedBy}`
                : p.killedBy;

            embed.addFields({
                name: `${p.classEmoji} ${p.username} (${p.className})`,
                value: `⚔️ ${p.kills} kills | 💀 Died to: ${killerInfo}\n📊 ${p.damage.toLocaleString()} dmg | 💫 ${p.respawns} respawns | 🔄 ${p.roundsSurvived} rounds`,
                inline: false
            });
        }

        // Send to Discord channel
        await this.broadcastToDiscord(guildId, embed);

        // Send to Twitch
        const twitchMsg = `☠️ ${team.name} eliminated! (${this.getPlacementText(team.placement)}) - ` +
            playerStats.map(p => `${p.username}: ${p.kills}K/${p.deaths}D`).join(' | ');
        this.broadcastToTwitch(guildId, twitchMsg);

        // Update player stats in accountLinker
        if (this.client?.accountLinker) {
            for (const p of playerStats) {
                const player = game.players.get(team.players.find(pid => game.players.get(pid)?.username === p.username));
                if (player) {
                    this.client.accountLinker.updateStats(player.userId, null, {
                        won: false,
                        classKey: p.classKey,
                        kills: p.kills,
                        deaths: p.deaths,
                        damage: p.damage,
                        respawns: p.respawns,
                        killedBy: p.killedBy,
                        victims: p.victims
                    });
                }
            }
        }
    }

    async sendWinnerReport(guildId, winningTeam) {
        const game = this.getGame(guildId);
        const totalTeams = game.teams.length;

        // Build player stats
        const playerStats = winningTeam.players.map(pid => {
            const p = game.players.get(pid);
            if (!p) return null;

            const cls = CLASSES[p.classKey];
            return {
                username: p.username,
                platform: p.platform,
                classKey: p.classKey,
                classEmoji: cls?.emoji || '❓',
                className: cls?.name || p.classKey,
                damage: p.damage || 0,
                kills: p.kills || 0,
                deaths: p.deaths || 0,
                respawns: p.respawns || 0,
                roundsSurvived: p.roundsSurvived || 0,
                victims: p.victims || []
            };
        }).filter(Boolean);

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 ${winningTeam.name} WINS!`)
            .setDescription(`**CHAMPION** after ${game.round} rounds!`)
            .setTimestamp();

        // Add player stats
        for (const p of playerStats) {
            embed.addFields({
                name: `${p.classEmoji} ${p.username} (${p.className})`,
                value: `⚔️ ${p.kills} kills | 📊 ${p.damage.toLocaleString()} dmg | 💫 ${p.respawns} respawns`,
                inline: false
            });
        }

        // MVP calculation
        const mvp = playerStats.reduce((best, p) =>
            (p.kills + p.damage / 100) > (best.kills + best.damage / 100) ? p : best
        );
        embed.addFields({ name: '⭐ MVP', value: `${mvp.classEmoji} ${mvp.username}` });

        // Send to Discord
        await this.broadcastToDiscord(guildId, embed);

        // Send to Twitch
        const twitchMsg = `🏆 ${winningTeam.name} WINS! MVP: ${mvp.username} (${mvp.kills}K) - ` +
            playerStats.map(p => `${p.username}: ${p.kills}K`).join(' | ');
        this.broadcastToTwitch(guildId, twitchMsg);

        // Update winner stats in accountLinker
        if (this.client?.accountLinker) {
            for (const p of playerStats) {
                const player = game.players.get(winningTeam.players.find(pid => game.players.get(pid)?.username === p.username));
                if (player) {
                    this.client.accountLinker.updateStats(player.userId, null, {
                        won: true,
                        classKey: p.classKey,
                        kills: p.kills,
                        deaths: p.deaths,
                        damage: p.damage,
                        respawns: p.respawns,
                        victims: p.victims
                    });
                }
            }
        }
    }

    // =============================================================================
    // XP & REWARDS
    // =============================================================================

    awardXP(guildId, winningTeam) {
        const game = this.getGame(guildId);
        const rewards = [];

        for (const [userId, player] of game.players) {
            let xp = 25; // Base participation
            let bonusText = '';

            // Winner bonus
            if (winningTeam && winningTeam.players.includes(userId)) {
                xp += 100;
                bonusText = ' (WINNER)';
            }

            // Momentum perk bonus
            if (player.roundPerk?.effect?.xpPerRound) {
                const bonus = Math.round(player.roundsSurvived * player.roundPerk.effect.xpPerRound * 50);
                xp += bonus;
            }

            // XP Pirate - damage to XP
            if (player.perks.some(p => p.effect?.damageToXp)) {
                xp += Math.round(player.damage * 0.1);
            }

            this.xpStorage.addXP(guildId, userId, xp, 'wildcard');
            rewards.push({ userId, username: player.username, xp, bonusText });
        }

        return rewards;
    }

    reset(guildId) {
        const game = this.getGame(guildId);
        game.state = GameState.IDLE;
        game.players.clear();
        game.teams = [];
        game.round = 0;
        game.readyPlayers.clear();
        game.roundResults = [];
        game.perkSelectionActive = false;
        game.perkChoices.clear();
        game.usedPerksA.clear();
        game.usedPerksB.clear();
        game.secondChanceUsed.clear();
        game.matchKills.clear();
        if (game.perkTimer) clearTimeout(game.perkTimer);
        if (game.lobbyTimer) clearTimeout(game.lobbyTimer);

        // Clear active player tracking for this guild
        this.clearActivePlayersForGuild(guildId);
    }

    leave(guildId, userId) {
        const game = this.getGame(guildId);

        if (!game.players.has(userId)) {
            return { success: false, error: "You're not in the game!" };
        }

        if (game.state === GameState.IN_PROGRESS) {
            return { success: false, error: "Can't leave during a match!" };
        }

        const player = game.players.get(userId);
        game.players.delete(userId);

        // Remove from global active tracking
        this.unregisterActivePlayer(userId);

        if (game.players.size === 0) {
            game.state = GameState.IDLE;
        }

        return { success: true, message: `${player.username} left the lobby.` };
    }

    // =============================================================================
    // INFO METHODS
    // =============================================================================

    getClassInfo(classKey) {
        const cls = CLASSES[classKey.toLowerCase()];
        if (!cls) return null;
        return cls;
    }

    getAllClasses() {
        return CLASSES;
    }

    getPerksInfo() {
        return { categoryA: PERKS_CATEGORY_A, categoryB: PERKS_CATEGORY_B };
    }
}

// Export
module.exports = WildcardGame;
module.exports.CLASSES = CLASSES;
module.exports.PERKS_CATEGORY_A = PERKS_CATEGORY_A;
module.exports.PERKS_CATEGORY_B = PERKS_CATEGORY_B;
module.exports.GameState = GameState;
