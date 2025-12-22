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

    // Connect with per-guild credentials
    async connectGuild(guildId, channel, username, token) {
        // Disconnect existing client for this guild
        if (this.clients.has(guildId)) {
            try {
                await this.clients.get(guildId).disconnect();
            } catch (e) { }
        }

        const client = new tmi.Client({
            options: { debug: false },
            identity: {
                username: username,
                password: token
            },
            channels: [channel]
        });

        client.on('message', (ch, tags, message, self) => {
            if (self) return;
            this.handleMessage(ch, tags, message);
        });

        client.on('connected', () => {
            console.log('📺 Twitch chat connected for guild ' + guildId + ': #' + channel);
        });

        client.on('disconnected', () => {
            console.log('📺 Twitch chat disconnected for guild ' + guildId);
        });

        await client.connect();
        this.clients.set(guildId, client);
        this.linkChannel(channel, guildId);
    }

    // Load saved configs on startup
    async loadSavedConfigs() {
        const configPath = path.join(__dirname, '../../data/twitchLinks.json');
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                for (const [guildId, data] of Object.entries(config)) {
                    if (data.channel && data.token) {
                        try {
                            await this.connectGuild(guildId, data.channel, data.username, data.token);
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

        if (!guildId) return;

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
        const client = this.clients.get(guildId);
        if (client) {
            client.say(channel, message);
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
}

module.exports = TwitchChat;
