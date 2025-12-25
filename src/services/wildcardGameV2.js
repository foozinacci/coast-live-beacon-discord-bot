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
// BALANCED CLASS DEFINITIONS (Pentagon System)
// =============================================================================
const CLASSES = {
    support: {
        name: 'Support',
        emoji: '⚪',
        hp: 88,
        accuracy: 0.93,
        evasion: 0.05,
        execute: 0.00,
        momentum: 10,
        hitbox: 1.00,
        description: 'Team sustain specialist with Second Chance respawn',
        perk1: 'Second Chance - Respawn once at 50% HP when eliminated',
        perk2: 'Team Aura - Provides pentagon ally bonuses',
        counters: 'Controller, Recon',
        counteredBy: 'Skirmisher, Assault'
    },
    controller: {
        name: 'Controller',
        emoji: '🟣',
        hp: 67,
        accuracy: 0.80,
        evasion: 0.00,
        execute: 0.05,
        momentum: 0,
        hitbox: 1.05,
        description: 'Area denial expert with momentum suppression',
        perk1: 'Suppress - Enemies suffer momentum penalty when attacking you',
        perk2: 'Anchor - Immune to Recon Disruption',
        counters: 'Assault, Skirmisher',
        counteredBy: 'Support, Recon'
    },
    assault: {
        name: 'Assault',
        emoji: '🔴',
        hp: 89,
        accuracy: 0.95,
        evasion: 0.08,
        execute: 0.22,
        momentum: 30,
        hitbox: 1.08,
        description: 'Aggressive fighter with high execute chance',
        perk1: 'Rampage - +30% damage scaling with momentum',
        perk2: 'Execution - 22% chance to instant-kill low HP targets',
        counters: 'Support, Recon',
        counteredBy: 'Controller, Skirmisher'
    },
    recon: {
        name: 'Recon',
        emoji: '🔵',
        hp: 87,
        accuracy: 0.91,
        evasion: 0.04,
        execute: 0.16,
        momentum: 5,
        hitbox: 1.02,
        description: 'Precision specialist with disruption abilities',
        perk1: 'Disrupt - Chance to stun targets with low execute chance',
        perk2: 'Precision - Evasion bonus when attacking (-4% to be hit back)',
        counters: 'Controller, Skirmisher',
        counteredBy: 'Support, Assault'
    },
    skirmisher: {
        name: 'Skirmisher',
        emoji: '🟢',
        hp: 83,
        accuracy: 0.87,
        evasion: 0.08,
        execute: 0.05,
        momentum: 40,
        hitbox: 1.03,
        description: 'High mobility fighter with bleed effects',
        perk1: 'Bleed - Attacks reduce enemy healing by 50%',
        perk2: 'Counter - +30% damage vs high-accuracy targets (≥0.95)',
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

    // Generate random compositions with constraints
    generateRandomCompositions(numTeams) {
        const allClasses = CLASS_KEYS;
        const globalClassCount = {};
        allClasses.forEach(c => globalClassCount[c] = 0);

        const compositions = Array.from({ length: numTeams }, () => []);

        for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
            const usedOnTeam = new Set();

            for (let slot = 0; slot < 3; slot++) {
                let available = allClasses.filter(c =>
                    !usedOnTeam.has(c) && globalClassCount[c] < 3
                );

                // 3-team mode: prevent Support+Skirmisher combo
                if (numTeams === 3) {
                    if (usedOnTeam.has('support')) {
                        available = available.filter(c => c !== 'skirmisher');
                    }
                    if (usedOnTeam.has('skirmisher')) {
                        available = available.filter(c => c !== 'support');
                    }
                }

                if (available.length === 0) {
                    let fallback = allClasses.filter(c => !usedOnTeam.has(c));
                    if (numTeams === 3) {
                        if (usedOnTeam.has('support')) fallback = fallback.filter(c => c !== 'skirmisher');
                        if (usedOnTeam.has('skirmisher')) fallback = fallback.filter(c => c !== 'support');
                    }
                    const classKey = fallback[Math.floor(Math.random() * fallback.length)] || allClasses[0];
                    compositions[teamIndex].push(classKey);
                    usedOnTeam.add(classKey);
                    globalClassCount[classKey]++;
                } else {
                    const classKey = available[Math.floor(Math.random() * available.length)];
                    compositions[teamIndex].push(classKey);
                    usedOnTeam.add(classKey);
                    globalClassCount[classKey]++;
                }
            }
        }

        return compositions;
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

    join(guildId, userId, username, platform = 'discord') {
        const game = this.getGame(guildId);

        if (game.players.has(userId)) {
            return { success: false, error: "You're already in the game!" };
        }

        if (game.state !== GameState.IDLE && game.state !== GameState.LOBBY) {
            return { success: false, error: 'Game already in progress. Wait for next round!' };
        }

        if (game.players.size >= game.maxPlayers) {
            return { success: false, error: 'Game is full!' };
        }

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

        // Create teams
        game.teams = [];
        for (let i = 0; i < numTeams; i++) {
            game.teams.push({
                id: i + 1,
                name: `Team ${i + 1}`,
                players: [],
                alive: true,
                anchoredClasses: compositions[i] // Store initial composition
            });
        }

        // Assign players to teams in seat order: 123123123 444 555
        const playerArray = Array.from(game.players.values());
        let playerIndex = 0;

        // First 9 players: interleaved 123123123
        for (let slot = 0; slot < 9 && playerIndex < playerArray.length; slot++) {
            const teamIndex = slot % Math.min(3, numTeams);
            const player = playerArray[playerIndex];
            const classIndex = game.teams[teamIndex].players.length;

            player.team = teamIndex + 1;
            player.classKey = compositions[teamIndex][classIndex] || 'support';
            player.hp = CLASSES[player.classKey].hp;
            player.maxHp = CLASSES[player.classKey].hp;

            game.teams[teamIndex].players.push(player.userId);
            game.players.set(player.userId, player);
            playerIndex++;
        }

        // Remaining players: sequential 444 555
        for (let teamIndex = 3; teamIndex < numTeams && playerIndex < playerArray.length; teamIndex++) {
            for (let slot = 0; slot < 3 && playerIndex < playerArray.length; slot++) {
                const player = playerArray[playerIndex];

                player.team = teamIndex + 1;
                player.classKey = compositions[teamIndex][slot] || 'support';
                player.hp = CLASSES[player.classKey].hp;
                player.maxHp = CLASSES[player.classKey].hp;

                game.teams[teamIndex].players.push(player.userId);
                game.players.set(player.userId, player);
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
            // Game over
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏆 WILDCARD - GAME OVER!')
                .setDescription(`**Team ${result.winner.id}** WINS!\n\n${result.events.join('\n')}`)
                .setTimestamp();

            await this.broadcastToDiscord(guildId, embed);
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
                    events.push(`💫 ${defender.username} used SECOND CHANCE! (50% HP)`);
                } else if (hasSecondChance) {
                    defender.hp = Math.round(defender.maxHp * 0.25);
                    defender.alive = true;
                    events.push(`💫 ${defender.username} respawned at 25% HP!`);
                } else {
                    defender.alive = false;
                    attacker.kills++;
                    events.push(`💀 ${defender.username} eliminated by ${attacker.username}!`);
                }
            }
        }

        // Update team status
        for (const team of game.teams) {
            const aliveInTeam = team.players.filter(pid => {
                const p = game.players.get(pid);
                return p && p.alive;
            });
            team.alive = aliveInTeam.length > 0;
            if (!team.alive && !events.includes(`☠️ Team ${team.id} ELIMINATED!`)) {
                events.push(`☠️ Team ${team.id} ELIMINATED!`);
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
