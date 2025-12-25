const tmi = require('tmi.js');
const play = require('play-dl');
const QueueStorage = require('../utils/queueStorage');
const fs = require('fs');
const path = require('path');

class TwitchChat {
    constructor(discordClient) {
        this.discordClient = discordClient;
        this.clients = new Map(); // guildId -> tmiClient
        this.queueStorage = new QueueStorage();
        this.cooldowns = new Map();
        this.cooldownMs = 5 * 60 * 1000;
        this.linkedChannels = new Map();
    }

    // Single shared TMI client for all channels
    async initSharedClient() {
        const botUsername = process.env.TWITCH_BOT_USERNAME;
        const botToken = process.env.TWITCH_BOT_TOKEN;

        if (!botUsername || !botToken) {
            console.log('⚠️ No TWITCH_BOT credentials - Twitch chat disabled');
            return null;
        }

        if (this.sharedClient) {
            return this.sharedClient;
        }

        this.sharedClient = new tmi.Client({
            options: { debug: false },
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: botUsername,
                password: botToken
            },
            channels: [] // Will join channels dynamically
        });

        this.sharedClient.on('message', (ch, tags, message, self) => {
            if (self) return;
            this.handleMessage(ch, tags, message);
        });

        this.sharedClient.on('connected', () => {
            console.log('📺 Twitch bot connected as: ' + botUsername);
        });

        this.sharedClient.on('disconnected', (reason) => {
            console.log('📺 Twitch bot disconnected:', reason);
        });

        this.sharedClient.on('join', (channel, username, self) => {
            if (self) {
                console.log('📺 Joined channel: ' + channel);
            }
        });

        await this.sharedClient.connect();
        return this.sharedClient;
    }

    // Connect with per-guild credentials (legacy - redirects to shared)
    async connectGuild(guildId, channel, username, token) {
        // Ensure shared client exists
        const client = await this.initSharedClient();
        if (!client) return;

        // Join the channel with our shared client
        const cleanChannel = channel.toLowerCase().replace('#', '');

        try {
            await client.join(cleanChannel);
            this.clients.set(guildId, client); // Store reference
            this.linkChannel(cleanChannel, guildId);
        } catch (e) {
            console.error('Failed to join #' + cleanChannel + ':', e.message);
        }
    }

    // Load saved configs on startup - uses global bot account from .env
    async loadSavedConfigs() {
        const configPath = path.join(__dirname, '../../data/twitchLinks.json');

        // Get bot credentials from .env
        const botUsername = process.env.TWITCH_BOT_USERNAME;
        const botToken = process.env.TWITCH_BOT_TOKEN;

        console.log('📺 Twitch bot account:', botUsername || 'NOT SET');

        if (!botUsername || !botToken) {
            console.log('⚠️ No TWITCH_BOT_USERNAME or TWITCH_BOT_TOKEN in .env - Twitch chat disabled');
            return;
        }

        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                for (const [guildId, data] of Object.entries(config)) {
                    if (data.channel) {
                        try {
                            // Use bot account credentials, just join the channel
                            await this.connectGuild(guildId, data.channel, botUsername, botToken);
                        } catch (e) {
                            console.error('Failed to reconnect Twitch for guild ' + guildId + ':', e.message);
                        }
                    }
                }
            }
        } catch (e) {
            console.log('No saved Twitch configs found');
        }
    }

    linkChannel(twitchChannel, guildId) {
        this.linkedChannels.set(twitchChannel.toLowerCase(), guildId);
    }

    async handleMessage(channel, tags, message) {
        const cleanChannel = channel.replace('#', '').toLowerCase();
        const guildId = this.linkedChannels.get(cleanChannel);

        // Debug: Log all incoming messages
        console.log(`📥 Twitch msg in #${cleanChannel}: ${message.substring(0, 50)}`);

        if (!guildId) {
            console.log(`   ↳ No guild linked to #${cleanChannel}`);
            return;
        }

        const args = message.trim().split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case '!lbsr':
            case '!lbsongrequest':
                await this.handleSongRequest(cleanChannel, tags, args.slice(1), guildId);
                break;
            case '!lbqueue':
                await this.handleQueue(cleanChannel, guildId);
                break;
            case '!lbnp':
            case '!lbnowplaying':
                await this.handleNowPlaying(cleanChannel, guildId);
                break;
            // Wildcard game commands from Twitch
            case '!lbjoin':
                await this.handleGameJoin(cleanChannel, tags, guildId);
                break;
            case '!lbready':
                await this.handleGameReady(cleanChannel, tags, guildId);
                break;
            case '!lbpick':
                await this.handleGamePick(cleanChannel, tags, args.slice(1), guildId);
                break;
            case '!lbwildcard':
                await this.handleGameWildcard(cleanChannel, tags, args.slice(1), guildId);
                break;
            case '!lbperk1':
                await this.handleGameWildcard(cleanChannel, tags, ['1'], guildId);
                break;
            case '!lbperk2':
                await this.handleGameWildcard(cleanChannel, tags, ['2'], guildId);
                break;
            case '!lbgame':
                await this.handleGameStatus(cleanChannel, guildId);
                break;
            case '!lbgamehelp':
                this.say(guildId, channel, '🃏 WILDCARD: !lbjoin to enter | Classes auto-assigned | !lbperk1 or !lbperk2 each round (30s) | -10 HP if no pick | Last team wins!');
                break;
            // Class info commands
            case '!lbsupport':
                this.say(guildId, channel, '⚪ SUPPORT: Health 88 | Damage 35-38 | Accuracy 93% | Evasion 5% | Execute 0% | Momentum 10 | PERK: Second Chance (respawn 50% HP) | Beats: 🟣🔵 | Weak to: 🟢🔴');
                break;
            case '!lbcontroller':
                this.say(guildId, channel, '🟣 CONTROLLER: Health 67 | Damage 35-37 | Accuracy 80% | Evasion 0% | Execute 5% | Momentum 0 | PERK: Suppress + Anchor | Beats: 🔴🟢 | Weak to: ⚪🔵');
                break;
            case '!lbassault':
                this.say(guildId, channel, '🔴 ASSAULT: Health 89 | Damage 35-40 | Accuracy 95% | Evasion 8% | Execute 22% | Momentum 30 | PERK: Rampage + Execute | Beats: ⚪🔵 | Weak to: 🟣🟢');
                break;
            case '!lbrecon':
                this.say(guildId, channel, '🔵 RECON: Health 87 | Damage 35-38 | Accuracy 91% | Evasion 4% | Execute 16% | Momentum 5 | PERK: Disrupt + Precision | Beats: 🟣🟢 | Weak to: ⚪🔴');
                break;
            case '!lbskirmisher':
                this.say(guildId, channel, '🟢 SKIRMISHER: Health 83 | Damage 35-50 | Accuracy 87% | Evasion 8% | Execute 5% | Momentum 40 | PERK: Bleed + Counter | Beats: ⚪🔴 | Weak to: 🟣🔵');
                break;
            case '!lbperks':
                this.say(guildId, channel, '🃏 PERKS: !lbperk1 = Game Changers (Second Life, +5% stats) | !lbperk2 = Rewards (CONTRACT, MOMENTUM, ALL IN, TEAM XP, XP PIRATE) | 30 seconds to pick!');
                break;
            case '!lbcharacters':
            case '!lbclasses':
                this.say(guildId, channel, '🎭 CLASSES: ⚪Support 🟣Controller 🔴Assault 🔵Recon 🟢Skirmisher | Pentagon balance | Use !lb<class> for full stats');
                break;
            case '!lbgamestats':
            case '!lbstats':
                this.say(guildId, channel, '🃏 WILDCARD: ⚪Support>🟣Controller>🔴Assault>🔵Recon>🟢Skirmisher>⚪ | 3-5 teams of 3 | Classes random | !lbperk1 or !lbperk2 each round (30s) | !lb<class> for stats');
                break;
        }
    }

    async handleSongRequest(channel, tags, args, guildId) {
        const twitchUser = tags.username;

        // Check cooldown
        const cooldownKey = guildId + '_' + twitchUser;
        const lastRequest = this.cooldowns.get(cooldownKey);
        if (lastRequest && Date.now() - lastRequest < this.cooldownMs) {
            const remaining = Math.ceil((this.cooldownMs - (Date.now() - lastRequest)) / 60000);
            this.say(guildId, channel, '@' + twitchUser + ' Cooldown: wait ' + remaining + ' min.');
            return;
        }

        if (args.length === 0) {
            this.say(guildId, channel, '@' + twitchUser + ' Usage: !lbsr [YouTube/Spotify URL]');
            return;
        }

        const url = args[0];

        // Validate URL
        let platform = 'unknown';
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            platform = 'youtube';
        } else if (url.includes('spotify.com')) {
            platform = 'spotify';
        } else if (url.includes('soundcloud.com')) {
            platform = 'soundcloud';
        } else {
            this.say(guildId, channel, '@' + twitchUser + ' Use YouTube, Spotify, or SoundCloud links.');
            return;
        }

        // Get track info
        let trackInfo;
        try {
            if (platform === 'youtube') {
                const info = await play.video_info(url);
                trackInfo = {
                    url,
                    title: info.video_details.title,
                    artist: info.video_details.channel?.name || 'Unknown',
                    duration: info.video_details.durationInSec,
                    platform
                };
            } else if (platform === 'spotify') {
                // For Spotify, we'll add basic info and resolve later
                trackInfo = {
                    url,
                    title: 'Spotify Track',
                    artist: 'Loading...',
                    duration: 180,
                    platform
                };
            } else {
                const info = await play.soundcloud(url);
                trackInfo = {
                    url,
                    title: info.name,
                    artist: info.user?.name || 'Unknown',
                    duration: Math.floor(info.durationInMs / 1000),
                    platform
                };
            }
        } catch (error) {
            this.say(guildId, channel, '@' + twitchUser + ' Could not fetch track info.');
            return;
        }

        // Check duration (7 min max)
        if (trackInfo.duration > 420) {
            this.say(guildId, channel, '@' + twitchUser + ' Track exceeds 7 min limit.');
            return;
        }

        // Use Twitch username with prefix
        const twitchUserId = 'twitch_' + twitchUser;

        const result = this.queueStorage.addTrack(guildId, twitchUserId, twitchUser + ' (Twitch)', trackInfo);

        if (!result.success) {
            this.say(guildId, channel, '@' + twitchUser + ' ' + result.error);
            return;
        }

        // Set cooldown
        this.cooldowns.set(cooldownKey, Date.now());

        this.say(guildId, channel, '@' + twitchUser + ' Added: ' + trackInfo.title.substring(0, 50) + ' (#' + result.position + ')');
    }

    async handleQueue(channel, guildId) {
        const queue = this.queueStorage.getGuildQueue(guildId);

        if (queue.tracks.length === 0) {
            this.say(guildId, channel, 'Queue is empty! Add songs with !lbsr [URL]');
            return;
        }

        const uniqueUsers = new Set(queue.tracks.map(t => t.userId)).size;
        this.say(guildId, channel, 'Queue: ' + queue.tracks.length + ' tracks from ' + uniqueUsers + ' users');
    }

    async handleNowPlaying(channel, guildId) {
        const musicPlayer = this.discordClient.musicPlayer;

        if (!musicPlayer) {
            this.say(guildId, channel, 'Music not playing.');
            return;
        }

        const current = musicPlayer.getCurrent(guildId);

        if (!current) {
            this.say(guildId, channel, 'Nothing playing right now.');
            return;
        }

        this.say(guildId, channel, 'Now playing: ' + current.title + ' - added by ' + current.username);
    }

    say(guildId, channel, message) {
        // Use shared client (all channels go through one connection)
        const client = this.sharedClient || this.clients.get(guildId);
        if (client) {
            // Ensure channel has # prefix
            const targetChannel = channel.startsWith('#') ? channel : '#' + channel;
            console.log(`📤 Twitch say to ${targetChannel}: ${message.substring(0, 50)}...`);
            client.say(targetChannel, message).catch(err => {
                console.error('Twitch say error:', err.message);
            });
        } else {
            console.error('No Twitch client available');
        }
    }

    disconnect(guildId) {
        const client = this.clients.get(guildId);
        if (client) {
            client.disconnect();
            this.clients.delete(guildId);
        }
    }

    disconnectAll() {
        for (const [guildId, client] of this.clients) {
            try {
                client.disconnect();
            } catch (e) { }
        }
        this.clients.clear();
    }

    // ========== WILDCARD GAME HANDLERS ==========

    async handleGameJoin(channel, tags, guildId) {
        const twitchUser = tags.username;
        const twitchUserId = 'twitch_' + twitchUser;

        // Initialize game if needed
        const WildcardGame = require('./wildcardGameV2');
        if (!this.discordClient.wildcardGame) {
            this.discordClient.wildcardGame = new WildcardGame(this.discordClient);
        }

        const game = this.discordClient.wildcardGame;
        const result = game.join(guildId, twitchUserId, twitchUser, 'twitch');

        if (!result.success) {
            this.say(guildId, channel, '@' + twitchUser + ' ' + result.error);
            return;
        }

        // Announce on Twitch
        this.say(guildId, channel, '🎮 ' + result.message);

        // Also announce on Discord to keep count synced
        game.broadcastText(guildId, `📺 **${result.message}**`);
    }

    async handleGameReady(channel, tags, guildId) {
        const twitchUser = tags.username;
        const twitchUserId = 'twitch_' + twitchUser;

        if (!this.discordClient.wildcardGame) {
            this.say(guildId, channel, '@' + twitchUser + ' No lobby! !lbjoin first');
            return;
        }

        const game = this.discordClient.wildcardGame;
        const result = game.ready(guildId, twitchUserId);

        if (!result.success) {
            this.say(guildId, channel, '@' + twitchUser + ' ' + result.error);
            return;
        }

        // Brief Twitch
        this.say(guildId, channel, '@' + twitchUser + ' Ready! (' + result.readyCount + '/' + result.totalPlayers + ')');

        if (result.canStart) {
            const startResult = game.startGame(guildId);
            if (startResult.success) {
                // Brief Twitch
                this.say(guildId, channel, '🎮 GO! Classes auto-assigned! Wait for perk selection - !lbperk1 or !lbperk2');

                // Rich Discord embed
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor('#FF6B00')
                    .setTitle('🃏 WILDCARD - Teams Formed!')
                    .setDescription('**Pick your character with** `!lbpick <name>`')
                    .setTimestamp();

                startResult.teams.forEach(team => {
                    embed.addFields({
                        name: `Team ${team.id}`,
                        value: team.players.join('\n') || 'Empty',
                        inline: true
                    });
                });

                embed.addFields({
                    name: '🎭 Characters',
                    value: '`Shadow` `Titan` `Striker` `Medic` `Scout` `Pyro`',
                    inline: false
                });

                game.broadcastToDiscord(guildId, embed);
            }
        }
    }

    async handleGamePick(channel, tags, args, guildId) {
        const twitchUser = tags.username;
        // V2: Classes are auto-assigned, !lbpick now just shows info
        this.say(guildId, channel, '@' + twitchUser + ' Classes are now auto-assigned at game start! Use !lbcharacters for info.');
    }

    async handleGameWildcard(channel, tags, args, guildId) {
        const twitchUser = tags.username;
        const twitchUserId = 'twitch_' + twitchUser;

        if (!this.discordClient.wildcardGame) {
            this.say(guildId, channel, '@' + twitchUser + ' No game in progress!');
            return;
        }

        if (args.length === 0) {
            this.say(guildId, channel, '@' + twitchUser + ' Use !lbwildcard 1 or !lbwildcard 2 to pick a perk!');
            return;
        }

        const game = this.discordClient.wildcardGame;
        const result = game.pickPerk(guildId, twitchUserId, args[0]);

        if (!result.success) {
            this.say(guildId, channel, '@' + twitchUser + ' ' + result.error);
            return;
        }

        this.say(guildId, channel, result.message);
    }

    async handleGameStatus(channel, guildId) {
        if (!this.discordClient.wildcardGame) {
            this.say(guildId, channel, 'No Wildcard game active. Start with !lbjoin');
            return;
        }

        const game = this.discordClient.wildcardGame;
        const gameState = game.getGame(guildId);

        let status = 'Wildcard: ' + gameState.state;
        if (gameState.state === 'lobby') {
            status += ' (' + gameState.players.size + ' players)';
        } else if (gameState.state === 'in_progress') {
            const alive = gameState.teams.filter(t => t.alive).length;
            status += ' - Round ' + gameState.round + ', ' + alive + ' teams alive';
        }

        this.say(guildId, channel, status);
    }
}

module.exports = TwitchChat;
