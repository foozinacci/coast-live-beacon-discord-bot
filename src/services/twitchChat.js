const tmi = require('tmi.js');
const play = require('play-dl');
const QueueStorage = require('../utils/queueStorage');

class TwitchChat {
    constructor(discordClient) {
        this.discordClient = discordClient;
        this.tmiClient = null;
        this.queueStorage = new QueueStorage();
        this.cooldowns = new Map(); // twitchUser -> lastRequest timestamp
        this.cooldownMs = 5 * 60 * 1000; // 5 minutes
        this.linkedChannels = new Map(); // twitchChannel -> guildId
    }

    async connect(channels) {
        if (!process.env.TWITCH_BOT_USERNAME || !process.env.TWITCH_BOT_TOKEN) {
            console.log('⚠️ Twitch chat not configured (TWITCH_BOT_USERNAME, TWITCH_BOT_TOKEN missing)');
            return;
        }

        this.tmiClient = new tmi.Client({
            options: { debug: false },
            identity: {
                username: process.env.TWITCH_BOT_USERNAME,
                password: process.env.TWITCH_BOT_TOKEN // oauth:xxxxx
            },
            channels: channels
        });

        this.tmiClient.on('message', (channel, tags, message, self) => {
            if (self) return;
            this.handleMessage(channel, tags, message);
        });

        this.tmiClient.on('connected', (addr, port) => {
            console.log('📺 Twitch chat connected: ' + addr + ':' + port);
        });

        this.tmiClient.on('disconnected', (reason) => {
            console.log('📺 Twitch chat disconnected:', reason);
            // Auto-reconnect after 30 seconds
            setTimeout(() => this.connect(channels), 30000);
        });

        try {
            await this.tmiClient.connect();
        } catch (error) {
            console.error('❌ Twitch chat connection error:', error);
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
        const lastRequest = this.cooldowns.get(twitchUser);
        if (lastRequest && Date.now() - lastRequest < this.cooldownMs) {
            const remaining = Math.ceil((this.cooldownMs - (Date.now() - lastRequest)) / 60000);
            this.say(channel, '@' + twitchUser + ' Cooldown: wait ' + remaining + ' min.');
            return;
        }

        if (args.length === 0) {
            this.say(channel, '@' + twitchUser + ' Usage: !lbsr [YouTube/Spotify URL]');
            return;
        }

        const url = args[0];

        // Validate URL
        let platform = 'unknown';
        if (play.yt_validate(url) === 'video') {
            platform = 'youtube';
        } else if (play.so_validate(url)) {
            platform = 'soundcloud';
        } else {
            this.say(channel, '@' + twitchUser + ' Unsupported link. Use YouTube or SoundCloud.');
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
            this.say(channel, '@' + twitchUser + ' Could not fetch track info.');
            return;
        }

        // Check duration (7 min max)
        if (trackInfo.duration > 420) {
            this.say(channel, '@' + twitchUser + ' Track exceeds 7 min limit.');
            return;
        }

        // Use Twitch username as userId with prefix to avoid collision
        const twitchUserId = 'twitch_' + twitchUser;

        const result = this.queueStorage.addTrack(guildId, twitchUserId, twitchUser + ' (Twitch)', trackInfo);

        if (!result.success) {
            this.say(channel, '@' + twitchUser + ' ' + result.error);
            return;
        }

        // Set cooldown
        this.cooldowns.set(twitchUser, Date.now());

        this.say(channel, '@' + twitchUser + ' Added: ' + trackInfo.title.substring(0, 50) + ' (#' + result.position + ')');
    }

    async handleQueue(channel, guildId) {
        const queue = this.queueStorage.getGuildQueue(guildId);

        if (queue.tracks.length === 0) {
            this.say(channel, 'Queue is empty!');
            return;
        }

        const uniqueUsers = new Set(queue.tracks.map(t => t.userId)).size;
        this.say(channel, 'Queue: ' + queue.tracks.length + ' tracks from ' + uniqueUsers + ' users');
    }

    async handleNowPlaying(channel, guildId) {
        const musicPlayer = this.discordClient.musicPlayer;

        if (!musicPlayer) {
            this.say(channel, 'Music not playing.');
            return;
        }

        const current = musicPlayer.getCurrent(guildId);

        if (!current) {
            this.say(channel, 'Nothing playing.');
            return;
        }

        this.say(channel, 'Now playing: ' + current.title + ' by ' + current.username);
    }

    say(channel, message) {
        if (this.tmiClient) {
            this.tmiClient.say(channel, message);
        }
    }

    disconnect() {
        if (this.tmiClient) {
            this.tmiClient.disconnect();
        }
    }
}

module.exports = TwitchChat;
