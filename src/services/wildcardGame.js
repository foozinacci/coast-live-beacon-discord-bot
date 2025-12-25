/**
 * WILDCARD GAME ENGINE
 * A mini battle royale game for Twitch-Discord integration
 * 5 teams of 3 players, character selection, and Wildcard perks
 */

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const XPStorage = require('../utils/xpStorage');

// Game states
const GameState = {
    IDLE: 'idle',
    LOBBY: 'lobby',
    CHARACTER_SELECT: 'character_select',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished'
};

// Character classes with unique abilities
const CHARACTERS = {
    shadow: {
        name: 'Shadow',
        emoji: '🌑',
        description: 'Stealth specialist with evasion bonuses',
        stats: { health: 90, damage: 35, teamBonus: 'evasion' },
        ability: '5% team evasion'
    },
    titan: {
        name: 'Titan',
        emoji: '🛡️',
        description: 'Heavy tank with high defense',
        stats: { health: 120, damage: 35, teamBonus: 'resistance' },
        ability: '5% team damage resistance'
    },
    striker: {
        name: 'Striker',
        emoji: '⚔️',
        description: 'Aggressive fighter with high damage',
        stats: { health: 130, damage: 35, teamBonus: 'selfDamage' },
        ability: '5% individual dmg boost'
    },
    medic: {
        name: 'Medic',
        emoji: '💚',
        description: 'Support class that heals teammates',
        stats: { health: 110, damage: 35, teamBonus: 'regen' },
        ability: '5% team health regen/1s'
    },
    scout: {
        name: 'Scout',
        emoji: '🔭',
        description: 'Reconnaissance expert with speed advantage',
        stats: { health: 100, damage: 35, teamBonus: 'accuracy' },
        ability: '5% team accuracy boost'
    },
    pyro: {
        name: 'Pyro',
        emoji: '🔥',
        description: 'Area damage dealer with burn effects',
        stats: { health: 80, damage: 35, teamBonus: 'teamDamage' },
        ability: '5% team damage buff'
    }
};

// Wildcard perks - simple and clear
const WILDCARD_PERKS = {
    xpBoost: {
        name: '+10% XP',
        emoji: '⭐',
        description: 'Earn 10% more XP if you win',
        effect: { xpBonus: 0.1 }
    },
    healthBoost: {
        name: '+10% Health',
        emoji: '💚',
        description: '10% more HP for this round',
        effect: { healthBonus: 0.1 }
    },
    damageBoost: {
        name: '+10% Damage',
        emoji: '⚔️',
        description: 'Deal 10% more damage this round',
        effect: { damageBonus: 0.1 }
    }
};

class WildcardGame {
    constructor(discordClient) {
        this.client = discordClient;
        this.games = new Map(); // guildId -> gameState
        this.xpStorage = new XPStorage();
        this.dailyPerks = this.generateDailyPerks();
    }

    // Generate 6 random perks for today
    generateDailyPerks() {
        const perkKeys = Object.keys(WILDCARD_PERKS);
        const shuffled = perkKeys.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 6);
    }

    // Get or create game state for a guild
    getGame(guildId) {
        if (!this.games.has(guildId)) {
            this.games.set(guildId, {
                state: GameState.IDLE,
                players: new Map(), // userId -> { username, platform, team, character, perks, hp }
                teams: [], // [{ id, players: [], alive: true }]
                round: 0,
                maxPlayers: 15,
                minPlayers: 6,
                teamSize: 3,
                readyPlayers: new Set(),
                roundResults: [],
                startTime: null,
                discordChannelId: null,
                // Perk selection phase
                perkSelectionActive: false,
                perkChoices: new Map(),
                perkTimer: null,
                currentPerkOptions: [],
                // Auto-start lobby timer
                lobbyTimer: null,
                lobbyTimeRemaining: 60000, // 60 seconds default
                lobbyCountdownActive: false
            });
        }
        return this.games.get(guildId);
    }

    // Set the Discord channel for game updates
    setDiscordChannel(guildId, channelId) {
        const game = this.getGame(guildId);
        game.discordChannelId = channelId;
    }

    // Broadcast rich embed to Discord (Twitch gets brief text separately)
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

    // Broadcast a simple text message to Discord
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

    // Broadcast to Twitch chat
    broadcastToTwitch(guildId, message) {
        if (!this.client.twitchChat) return;

        // Get the linked Twitch channel for this guild
        const twitchChat = this.client.twitchChat;
        const linkedChannels = twitchChat.linkedChannels;

        // Find channel for this guild
        for (const [channel, linkedGuildId] of linkedChannels) {
            if (linkedGuildId === guildId) {
                twitchChat.say(guildId, channel, message);
                return;
            }
        }
    }

    // Broadcast to BOTH Discord and Twitch
    async broadcastBoth(guildId, discordEmbed, twitchMessage) {
        await this.broadcastToDiscord(guildId, discordEmbed);
        this.broadcastToTwitch(guildId, twitchMessage);
    }

    // Get game key for multiple games per guild
    getGameKey(guildId, gameNum = 1) {
        return gameNum === 1 ? guildId : `${guildId}_game${gameNum}`;
    }

    // Find an available game or create a new one
    findAvailableGame(guildId, userId) {
        // Check if user is already in any game
        for (let i = 1; i <= 10; i++) {
            const key = this.getGameKey(guildId, i);
            const game = this.games.get(key);
            if (game && game.players.has(userId)) {
                return { game, gameNum: i, alreadyIn: true };
            }
        }

        // Find a game with space
        for (let i = 1; i <= 10; i++) {
            const key = this.getGameKey(guildId, i);
            let game = this.games.get(key);

            if (!game) {
                // Create new game
                game = this.getGame(key);
                return { game, gameNum: i, isNew: true };
            }

            if ((game.state === GameState.IDLE || game.state === GameState.LOBBY)
                && game.players.size < game.maxPlayers) {
                return { game, gameNum: i };
            }
        }

        return { game: null, error: 'All game lobbies are full! Try again soon.' };
    }

    // Join the game
    join(guildId, userId, username, platform = 'discord') {
        const { game, gameNum, alreadyIn, isNew, error } = this.findAvailableGame(guildId, userId);

        if (error) {
            return { success: false, error };
        }

        if (alreadyIn) {
            return { success: false, error: `You're already in Game ${gameNum}!` };
        }

        if (game.state !== GameState.IDLE && game.state !== GameState.LOBBY) {
            return { success: false, error: 'Game already in progress. Wait for next round!' };
        }

        // Add player
        game.players.set(userId, {
            userId: userId,
            username: username,
            platform: platform,
            team: null,
            character: null,
            perks: [],
            hp: 100,
            alive: true
        });

        // Move to lobby state if first player
        if (game.state === GameState.IDLE) {
            game.state = GameState.LOBBY;
            game.startTime = Date.now();
        }

        const gameLabel = gameNum > 1 ? ` (Game ${gameNum})` : '';
        let timerMessage = '';

        // Timer values based on player count (9+ starts countdown)
        const COUNTDOWN_TIMERS = {
            9: 60000,   // 60s - countdown starts here
            10: 60000,  // 60s (reset if someone joins during 9-player countdown)
            11: 30000,  // 30s
            12: 15000,  // 15s
            13: 8000,   // 8s
            14: 4000,   // 4s
            15: 2000    // 2s (then instant)
        };

        // Check if we have minimum players (9+) - start/update countdown
        if (game.players.size >= 9) {
            const playerCount = game.players.size;

            if (playerCount >= game.maxPlayers) {
                // Full lobby - instant start after 2s
                timerMessage = ' 🚀 LOBBY FULL! Starting in 2s!';
                this.cancelLobbyTimer(guildId);
                setTimeout(() => this.autoStartGame(guildId), 2000);
            } else {
                // Set timer based on current player count
                game.lobbyTimeRemaining = COUNTDOWN_TIMERS[playerCount] || 60000;
                game.lobbyCountdownActive = true;
                this.restartLobbyCountdown(guildId);
                timerMessage = ` ⏱️ ${Math.ceil(game.lobbyTimeRemaining / 1000)}s countdown!`;
            }
        }

        const countdownThreshold = 9; // Countdown starts at 9 players
        const needed = Math.max(0, countdownThreshold - game.players.size);
        const neededText = needed > 0 ? ` Need ${needed} more! "!lbjoin" to join!` : '';

        return {
            success: true,
            playerCount: game.players.size,
            needed: needed,
            gameNum: gameNum,
            timerMessage: timerMessage,
            message: `${username} joined${gameLabel}! (${game.players.size}/${game.maxPlayers})${timerMessage}${neededText}`
        };
    }

    // Start lobby countdown timer
    startLobbyCountdown(guildId) {
        const game = this.getGame(guildId);

        game.lobbyTimer = setTimeout(() => {
            this.autoStartGame(guildId);
        }, game.lobbyTimeRemaining);

        console.log(`⏱️ Lobby countdown started: ${game.lobbyTimeRemaining / 1000}s`);
    }

    // Restart lobby countdown with current remaining time
    restartLobbyCountdown(guildId) {
        const game = this.getGame(guildId);

        if (game.lobbyTimer) {
            clearTimeout(game.lobbyTimer);
        }

        game.lobbyTimer = setTimeout(() => {
            this.autoStartGame(guildId);
        }, game.lobbyTimeRemaining);

        console.log(`⏱️ Lobby countdown reset: ${game.lobbyTimeRemaining / 1000}s`);
    }

    // Cancel lobby countdown
    cancelLobbyTimer(guildId) {
        const game = this.getGame(guildId);
        if (game.lobbyTimer) {
            clearTimeout(game.lobbyTimer);
            game.lobbyTimer = null;
        }
        game.lobbyCountdownActive = false;
    }

    // Auto-start game when timer expires
    autoStartGame(guildId) {
        const game = this.getGame(guildId);

        if (game.state !== GameState.LOBBY) return;
        if (game.players.size < 2) return;

        console.log(`🎮 Auto-starting game for guild ${guildId}`);

        // Force all players ready
        for (const [playerId] of game.players) {
            game.readyPlayers.add(playerId);
        }

        // Start the game
        const result = this.startGame(guildId);

        if (result.success) {
            // Send one dense game start embed to Discord
            const { EmbedBuilder } = require('discord.js');

            const teamsList = result.teams.map(t =>
                `**Team ${t.id}:** ${t.players.join(' • ')}`
            ).join('\n');

            const startEmbed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle('🎮 WILDCARD STARTED!')
                .setDescription(`**${game.players.size} players** across **${result.teams.length} teams**\n\n${teamsList}`)
                .addFields(
                    { name: '⏱️ Next', value: 'Perk selection in 2s - Type !lbperk1 or !lbperk2 (5 sec timer!)', inline: false }
                )
                .setTimestamp();

            this.broadcastToDiscord(guildId, startEmbed);

            // Build Twitch message with @mentions + character emoji
            const twitchPlayers = [];
            for (const [userId, player] of game.players) {
                if (userId.startsWith('twitch_')) {
                    const name = player.username.replace(' (Twitch)', '');
                    const charEmoji = player.characterData?.emoji || '';
                    twitchPlayers.push(`@${name}${charEmoji}(T${player.team})`);
                }
            }

            // Send Twitch announcement
            if (twitchPlayers.length > 0) {
                this.broadcastToTwitch(guildId, `🎮 WILDCARD! ${twitchPlayers.join(' ')} | !lbperk1 or !lbperk2 in 2s (30s timer!)`);
            } else {
                this.broadcastToTwitch(guildId, `🎮 WILDCARD STARTED! ${game.players.size} players! !lbperk1 or !lbperk2 in 2s`);
            }
        }
    }


    // Leave the game
    leave(guildId, userId) {
        const game = this.getGame(guildId);

        if (!game.players.has(userId)) {
            return { success: false, error: 'You\'re not in the game!' };
        }

        if (game.state === GameState.IN_PROGRESS) {
            return { success: false, error: 'Can\'t leave during a match!' };
        }

        const player = game.players.get(userId);
        game.players.delete(userId);
        game.readyPlayers.delete(userId);

        // Reset if no players
        if (game.players.size === 0) {
            game.state = GameState.IDLE;
        }

        return {
            success: true,
            message: `${player.username} left the lobby.`,
            playerCount: game.players.size
        };
    }

    // Ready up
    ready(guildId, userId) {
        const game = this.getGame(guildId);

        if (game.state !== GameState.LOBBY) {
            return { success: false, error: 'No game in lobby phase!' };
        }

        if (!game.players.has(userId)) {
            return { success: false, error: 'Join the game first with !lbjoin' };
        }

        if (game.readyPlayers.has(userId)) {
            return { success: false, error: 'You\'re already ready!' };
        }

        game.readyPlayers.add(userId);
        const readyCount = game.readyPlayers.size;
        const totalPlayers = game.players.size;

        // Check if we can start
        const canStart = totalPlayers >= game.minPlayers && readyCount === totalPlayers;

        return {
            success: true,
            readyCount,
            totalPlayers,
            canStart,
            message: `Ready! (${readyCount}/${totalPlayers})`
        };
    }

    // Start the game (auto-assign characters and begin)
    startGame(guildId) {
        const game = this.getGame(guildId);

        if (game.players.size < 2) {
            return { success: false, error: 'Need at least 2 players!' };
        }

        // Assign teams
        const playerArray = Array.from(game.players.values());
        const shuffled = playerArray.sort(() => Math.random() - 0.5);
        const numTeams = Math.ceil(shuffled.length / game.teamSize);

        game.teams = [];
        for (let i = 0; i < numTeams; i++) {
            game.teams.push({
                id: i + 1,
                name: `Team ${i + 1}`,
                players: [],
                alive: true,
                totalHP: 0
            });
        }

        // Character pool for random assignment
        const characterPool = Object.keys(CHARACTERS);

        // Distribute players to teams AND auto-assign characters
        shuffled.forEach((player, index) => {
            const teamIndex = index % numTeams;
            player.team = teamIndex + 1;

            // Auto-assign random character
            const randomChar = characterPool[Math.floor(Math.random() * characterPool.length)];
            player.character = randomChar;
            player.characterData = CHARACTERS[randomChar];
            player.alive = true;

            game.teams[teamIndex].players.push(player.userId);
            game.players.set(player.userId, player);
        });

        game.state = GameState.IN_PROGRESS;
        game.round = 0;

        // Start first perk selection after a brief delay
        setTimeout(() => {
            this.startPerkSelection(guildId);
        }, 2000);

        return {
            success: true,
            teams: game.teams.map(t => ({
                id: t.id,
                players: t.players.map(id => {
                    const p = game.players.get(id);
                    const charEmoji = p.characterData?.emoji || '';
                    const charName = p.characterData?.name || '';
                    return `${p.username} ${charEmoji}${charName}`;
                })
            })),
            message: 'Game started! First round begins in 2 seconds...'
        };
    }

    // Pick a character
    pickCharacter(guildId, userId, characterName) {
        const game = this.getGame(guildId);

        if (game.state !== GameState.CHARACTER_SELECT) {
            return { success: false, error: 'Not in character selection phase!' };
        }

        if (!game.players.has(userId)) {
            return { success: false, error: 'You\'re not in this game!' };
        }

        const charKey = characterName.toLowerCase();
        if (!CHARACTERS[charKey]) {
            const available = Object.keys(CHARACTERS).join(', ');
            return { success: false, error: `Unknown character! Choose: ${available}` };
        }

        const player = game.players.get(userId);
        if (player.character) {
            return { success: false, error: `You already picked ${player.character.name}!` };
        }

        player.character = { ...CHARACTERS[charKey], key: charKey };
        player.hp = 100 + (CHARACTERS[charKey].stats.defense * 5); // HP scales with defense
        game.players.set(userId, player);

        // Check if all players have picked
        const allPicked = Array.from(game.players.values()).every(p => p.character !== null);

        if (allPicked) {
            // Start the game! First round with perk selection
            game.state = GameState.IN_PROGRESS;
            game.round = 1;

            // Start perk selection after a short delay
            setTimeout(() => this.startPerkSelection(guildId), 1500);
        }

        return {
            success: true,
            character: CHARACTERS[charKey],
            allReady: allPicked,
            message: `${player.username} chose ${CHARACTERS[charKey].emoji} ${CHARACTERS[charKey].name}!`,
            gameStarting: allPicked
        };
    }

    // Get 2 random perk options for this round
    getRoundPerks(round) {
        const perkKeys = Object.keys(WILDCARD_PERKS);
        // Shuffle and pick 2
        const shuffled = perkKeys.sort(() => Math.random() - 0.5);
        return [shuffled[0], shuffled[1]];
    }

    // Start perk selection phase before a round
    async startPerkSelection(guildId) {
        const game = this.getGame(guildId);

        if (game.state !== GameState.IN_PROGRESS) return;

        // Get alive players
        const alivePlayers = [...game.players.values()].filter(p => p.alive);
        if (alivePlayers.length === 0) return;

        // Set up perk selection phase
        game.perkSelectionActive = true;
        game.perkChoices.clear();
        game.currentPerkOptions = this.getRoundPerks(game.round);

        // DON'T reveal perks - just prompt to pick
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🃏 ROUND ${game.round} - PICK YOUR PERK!`)
            .setDescription('**You have 30 seconds to choose!**\nType `!lbperk1` or `!lbperk2`\n\n*Perks are hidden - choose wisely!*')
            .setFooter({ text: '⚠️ No response = -10 HP penalty!' })
            .setTimestamp();

        await this.broadcastToDiscord(guildId, embed);

        // Broadcast to Twitch - don't reveal perks
        const twitchAlive = alivePlayers.filter(p => p.userId.startsWith('twitch_'));
        const mentions = twitchAlive.map(p => '@' + p.username.replace(' (Twitch)', '')).join(' ');
        const twitchMsg = `⚡ R${game.round} PERK! ${mentions} | !lbperk1 or !lbperk2 (30 sec) | No pick = -10 HP!`;
        this.broadcastToTwitch(guildId, twitchMsg);

        // Start 30-second timer
        game.perkTimer = setTimeout(() => {
            this.endPerkSelection(guildId);
        }, 30000);
    }

    // End perk selection and penalize non-responders
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

        // Check each alive player
        for (const [userId, player] of game.players) {
            if (!player.alive) continue;

            if (!game.perkChoices.has(userId)) {
                // No response - penalty -10 HP
                player.hp = (player.hp || player.characterData?.stats?.health || 100) - 10;
                penalized.push(player.username);
            } else {
                // Apply perk for THIS round only
                const chosenPerkKey = game.perkChoices.get(userId);
                const perk = WILDCARD_PERKS[chosenPerkKey];
                player.roundPerk = perk;
                perkResults.push(`${player.username}: ${perk.emoji} ${perk.name}`);
            }
        }

        // Update team status
        this.updateTeamStatus(guildId);

        // Broadcast results - NOW reveal what everyone picked
        const { EmbedBuilder } = require('discord.js');

        let resultText = '';
        if (perkResults.length > 0) {
            resultText = '**Perks Selected:**\n' + perkResults.join('\n');
        }
        if (penalized.length > 0) {
            resultText += '\n\n**⚠️ -10 HP Penalty:**\n' + penalized.map(n => `${n}`).join(', ');
        }

        if (resultText) {
            const resultEmbed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle(`📋 Round ${game.round} - Perk Results`)
                .setDescription(resultText)
                .setTimestamp();
            await this.broadcastToDiscord(guildId, resultEmbed);

            // Brief Twitch summary
            const twitchSummary = penalized.length > 0
                ? `📋 R${game.round}: ${perkResults.length} picked | ${penalized.join(', ')} -10 HP penalty`
                : `📋 R${game.round}: All players picked!`;
            this.broadcastToTwitch(guildId, twitchSummary);
        }

        // Now run the combat round
        await this.runCombatRound(guildId);
    }

    // Pick a Wildcard perk (only works during selection phase)
    pickPerk(guildId, userId, perkChoice) {
        const game = this.getGame(guildId);

        if (!game.perkSelectionActive) {
            return { success: false, error: 'No perk selection active! Wait for the prompt.' };
        }

        if (!game.players.has(userId)) {
            return { success: false, error: 'You\'re not in this game!' };
        }

        const player = game.players.get(userId);
        if (!player.alive) {
            return { success: false, error: 'You\'ve been eliminated!' };
        }

        if (game.perkChoices.has(userId)) {
            return { success: false, error: 'You already picked!' };
        }

        const choiceNum = parseInt(perkChoice);
        if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > 2) {
            return { success: false, error: 'Choose 1 or 2!' };
        }

        const chosenPerkKey = game.currentPerkOptions[choiceNum - 1];
        const chosenPerk = WILDCARD_PERKS[chosenPerkKey];

        game.perkChoices.set(userId, chosenPerkKey);

        // Check if all alive players have picked
        const alivePlayers = [...game.players.values()].filter(p => p.alive);
        const allPicked = alivePlayers.every(p => game.perkChoices.has(p.userId));

        if (allPicked && game.perkTimer) {
            // Everyone picked early - proceed immediately
            clearTimeout(game.perkTimer);
            game.perkTimer = null;
            setTimeout(() => this.endPerkSelection(guildId), 500);
        }

        // Confirm pick privately - don't reveal the perk yet
        return {
            success: true,
            perk: chosenPerk,
            message: `Perk ${perkChoice} locked in! ✓`
        };
    }

    // Update team alive status
    updateTeamStatus(guildId) {
        const game = this.getGame(guildId);

        for (const team of game.teams) {
            const aliveInTeam = team.players.filter(pid => {
                const p = game.players.get(pid);
                return p && p.alive;
            });
            team.alive = aliveInTeam.length > 0;
        }
    }

    // Run combat after perk selection
    async runCombatRound(guildId) {
        const result = this.simulateRound(guildId);

        const { EmbedBuilder } = require('discord.js');
        const game = this.getGame(guildId);

        if (result.finished) {
            // Award XP first to get the rewards list
            const xpRewards = this.awardXP(guildId, result.winner);

            // Build XP breakdown
            const winners = xpRewards.filter(r => r.winner).map(r => `🏅 ${r.username} +${r.xp} XP`);
            const others = xpRewards.filter(r => !r.winner).map(r => `${r.username} +${r.xp} XP`);

            let xpText = '';
            if (winners.length > 0) xpText += '**Winners:**\n' + winners.join('\n');
            if (others.length > 0) xpText += '\n\n**Participants:**\n' + others.join(', ');

            // Game over embed
            const winEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏆 WILDCARD - GAME OVER!')
                .setDescription(`**Team ${result.winner.id}** WINS!\n\n${xpText}`)
                .addFields(
                    { name: '📊 Stats', value: `Rounds: ${game.round} | Players: ${game.players.size}`, inline: true }
                )
                .setTimestamp();

            await this.broadcastToDiscord(guildId, winEmbed);

            // Twitch announcement
            const winnerNames = result.winner.players.map(pid => {
                const p = game.players.get(pid);
                return p ? p.username.replace(' (Twitch)', '') : '';
            }).filter(Boolean).join(', ');
            this.broadcastToTwitch(guildId, `🏆 GAME OVER! Team ${result.winner.id} WINS! (${winnerNames}) | GG!`);

            this.reset(guildId);
        } else {
            // Combat results
            const combatEmbed = new EmbedBuilder()
                .setColor('#FF6B00')
                .setTitle(`⚔️ ROUND ${game.round} RESULTS`)
                .setDescription(result.events.join('\n') || 'No eliminations this round!')
                .setTimestamp();

            await this.broadcastToDiscord(guildId, combatEmbed);

            // Twitch round summary
            const twitchEvents = result.events.length > 0
                ? result.events.slice(0, 2).join(' | ')  // Limit to 2 events for Twitch
                : 'No eliminations!';
            this.broadcastToTwitch(guildId, `⚔️ R${game.round}: ${twitchEvents} | Next round in 2s...`);

            // Clear round perks
            for (const player of game.players.values()) {
                player.roundPerk = null;
            }

            // Next round
            game.round++;
            setTimeout(() => this.startPerkSelection(guildId), 2000);
        }
    }

    // Simulate a round of combat
    simulateRound(guildId) {
        const game = this.getGame(guildId);
        const events = [];
        const aliveTeams = game.teams.filter(t => t.alive);

        if (aliveTeams.length <= 1) {
            return { events, finished: true, winner: aliveTeams[0] };
        }

        // Pair up teams for battles
        const shuffledTeams = aliveTeams.sort(() => Math.random() - 0.5);

        for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
            const team1 = shuffledTeams[i];
            const team2 = shuffledTeams[i + 1];

            if (!team2) break; // Odd team gets a bye

            // Calculate team power using new health/damage system
            const getTeamPower = (team) => {
                let totalDamage = 0;
                let totalHealth = 0;

                team.players.forEach(playerId => {
                    const player = game.players.get(playerId);
                    if (player && player.alive && player.characterData) {
                        let damage = player.characterData.stats.damage || 35;
                        let health = player.characterData.stats.health || 100;

                        // Apply perk bonuses
                        if (player.roundPerk && player.roundPerk.effect) {
                            const effect = player.roundPerk.effect;
                            if (effect.damageBonus) damage *= (1 + effect.damageBonus);
                            if (effect.healthBonus) health *= (1 + effect.healthBonus);
                        }

                        totalDamage += damage;
                        totalHealth += health;
                    }
                });

                // Add randomness factor (0-20%)
                const randomFactor = 1 + (Math.random() * 0.2);
                return (totalDamage + totalHealth * 0.3) * randomFactor;
            };

            const power1 = getTeamPower(team1);
            const power2 = getTeamPower(team2);

            // Determine winner
            const winner = power1 > power2 ? team1 : team2;
            const loser = power1 > power2 ? team2 : team1;

            // Eliminate random player from losing team
            const alivePlayers = loser.players.filter(id => {
                const p = game.players.get(id);
                return p && p.alive;
            });

            if (alivePlayers.length > 0) {
                const eliminated = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                const player = game.players.get(eliminated);
                player.alive = false;
                player.hp = 0;
                game.players.set(eliminated, player);

                events.push(`💀 ${player.username} (Team ${loser.id}) eliminated by Team ${winner.id}!`);

                // Check if team is wiped
                const remainingAlive = loser.players.filter(id => {
                    const p = game.players.get(id);
                    return p && p.alive;
                });
                if (remainingAlive.length === 0) {
                    loser.alive = false;
                    events.push(`☠️ Team ${loser.id} ELIMINATED!`);
                }
            }
        }

        // Check for winner
        const remaining = game.teams.filter(t => t.alive);
        if (remaining.length === 1) {
            return { events, finished: true, winner: remaining[0] };
        }

        return { events, finished: false };
    }

    // Process a full round (perk selection + combat)
    processRound(guildId) {
        const game = this.getGame(guildId);
        game.round++;

        const result = this.simulateRound(guildId);
        game.roundResults.push(result);

        if (result.finished) {
            game.state = GameState.FINISHED;

            // Award XP to winners
            if (result.winner) {
                result.winner.players.forEach(playerId => {
                    const player = game.players.get(playerId);
                    if (player) {
                        this.xpStorage.addXP(guildId, playerId, 100, 'wildcardWin');
                    }
                });
            }

            // Award participation XP to all
            game.players.forEach((player, id) => {
                this.xpStorage.addXP(guildId, id, 25, 'wildcardParticipation');
            });
        }

        return result;
    }

    // Get game status embed
    getStatusEmbed(guildId) {
        const game = this.getGame(guildId);

        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🃏 WILDCARD - Game Status')
            .setTimestamp();

        switch (game.state) {
            case GameState.IDLE:
                embed.setDescription('No game in progress. Start one with `!lbjoin`!');
                break;

            case GameState.LOBBY:
                const playerList = Array.from(game.players.values())
                    .map(p => {
                        const ready = game.readyPlayers.has(p.userId) ? '✅' : '⏳';
                        const platform = p.platform === 'twitch' ? '📺' : '💬';
                        return `${ready} ${platform} ${p.username}`;
                    }).join('\n');

                embed.setDescription(`**Lobby** (${game.players.size}/${game.maxPlayers})\n\n${playerList || 'Empty'}`);
                embed.addFields({
                    name: 'Next Step',
                    value: game.players.size >= game.minPlayers
                        ? 'All players ready up with `!lbready`!'
                        : `Need ${game.minPlayers - game.players.size} more players!`
                });
                break;

            case GameState.CHARACTER_SELECT:
                const teamsList = game.teams.map(team => {
                    const members = team.players.map(id => {
                        const p = game.players.get(id);
                        const char = p.character ? `${p.character.emoji} ${p.character.name}` : '❓ Picking...';
                        return `  • ${p.username}: ${char}`;
                    }).join('\n');
                    return `**Team ${team.id}**\n${members}`;
                }).join('\n\n');

                embed.setDescription(`**Character Selection**\n\n${teamsList}`);
                embed.addFields({
                    name: 'Available Characters',
                    value: Object.values(CHARACTERS).map(c => `${c.emoji} **${c.name}** - ${c.description}`).join('\n')
                });
                break;

            case GameState.IN_PROGRESS:
                const aliveTeams = game.teams.filter(t => t.alive);
                const roundInfo = game.roundResults.length > 0
                    ? game.roundResults[game.roundResults.length - 1].events.map(e => e.message).join('\n')
                    : 'Round starting...';

                embed.setDescription(`**Round ${game.round}** - ${aliveTeams.length} teams remaining\n\n${roundInfo}`);
                break;

            case GameState.FINISHED:
                const lastResult = game.roundResults[game.roundResults.length - 1];
                if (lastResult && lastResult.winner) {
                    const winners = lastResult.winner.players.map(id => game.players.get(id).username).join(', ');
                    embed.setDescription(`🏆 **VICTORY!**\n\n**${lastResult.winner.name}** wins!\nPlayers: ${winners}\n\n+100 XP awarded!`);
                }
                break;
        }

        return embed;
    }

    // Award XP to game participants
    awardXP(guildId, winningTeam) {
        const game = this.getGame(guildId);
        const xpRewards = [];

        for (const [userId, player] of game.players) {
            // Skip Twitch users (they have twitch_ prefix)
            if (userId.startsWith('twitch_')) {
                continue;
            }

            const isWinner = winningTeam && winningTeam.players.includes(userId);
            const xpAmount = isWinner ? 100 : 25;

            try {
                this.xpStorage.addXP(guildId, userId, xpAmount);
                xpRewards.push({
                    username: player.username,
                    xp: xpAmount,
                    winner: isWinner
                });
            } catch (e) {
                console.error('Failed to award XP to', userId, e.message);
            }
        }

        console.log(`🏆 XP awarded for Wildcard game: ${xpRewards.length} players`);
        return xpRewards;
    }

    // Reset game for a guild
    reset(guildId) {
        this.cancelLobbyTimer(guildId);
        this.games.delete(guildId);
        return { success: true, message: 'Game reset!' };
    }
}

module.exports = WildcardGame;
module.exports.CHARACTERS = CHARACTERS;
module.exports.WILDCARD_PERKS = WILDCARD_PERKS;
module.exports.GameState = GameState;
