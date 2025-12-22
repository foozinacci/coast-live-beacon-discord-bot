const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const QueueStorage = require('../utils/queueStorage');
const play = require('play-dl');
const youtubedl = require('youtube-dl-exec');
const { Readable } = require('stream');

class MusicPlayer {
    constructor(client) {
        this.client = client;
        this.players = new Map();
        this.queueStorage = new QueueStorage();
        this.idleTimers = new Map();
    }

    async joinChannel(voiceChannel) {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30000);
            return connection;
        } catch (error) {
            connection.destroy();
            throw error;
        }
    }

    getPlayer(guildId) {
        if (!this.players.has(guildId)) {
            const player = createAudioPlayer();
            this.players.set(guildId, { player, connection: null, current: null });

            player.on(AudioPlayerStatus.Idle, () => {
                this.playNext(guildId);
            });

            player.on('error', error => {
                console.error('Audio player error:', error.message);
                this.playNext(guildId);
            });
        }
        return this.players.get(guildId);
    }

    async play(guildId, voiceChannel) {
        const queue = this.queueStorage.getGuildQueue(guildId);

        if (queue.tracks.length < 1) {
            return { success: false, error: 'Queue is empty! Add tracks with `!addtrack [URL]`' };
        }

        const playerData = this.getPlayer(guildId);

        if (!playerData.connection || playerData.connection.state.status === VoiceConnectionStatus.Destroyed) {
            try {
                console.log('🎵 Joining voice channel:', voiceChannel.name);
                playerData.connection = await this.joinChannel(voiceChannel);
                playerData.connection.subscribe(playerData.player);
                console.log('🎵 Connected');
            } catch (error) {
                console.error('Voice connection error:', error);
                return { success: false, error: 'Could not join voice channel: ' + error.message };
            }
        }

        this.playNext(guildId);
        return { success: true };
    }

    async playNext(guildId) {
        const playerData = this.getPlayer(guildId);
        const track = this.queueStorage.getNextTrack(guildId);

        if (!track) {
            this.startIdleTimer(guildId);
            return;
        }

        console.log('🎵 Playing:', track.title);

        this.clearIdleTimer(guildId);

        try {
            let videoUrl = track.url;

            // For Spotify, search YouTube first
            if (track.platform === 'spotify') {
                const searchQuery = track.title + ' ' + track.artist;
                console.log('🎵 Searching YouTube for:', searchQuery);
                const searched = await play.search(searchQuery, { limit: 1 });
                if (searched.length === 0) {
                    console.error('No YouTube match');
                    this.playNext(guildId);
                    return;
                }
                videoUrl = searched[0].url;
            }

            console.log('🎵 Getting audio URL via yt-dlp:', videoUrl);

            // Use youtube-dl-exec to get direct audio URL
            const info = await youtubedl(videoUrl, {
                dumpSingleJson: true,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0']
            }, { windowsHide: true });

            // Find best audio format - prioritize higher bitrate
            const audioFormats = info.formats.filter(f =>
                f.acodec !== 'none' && f.vcodec === 'none'
            ).sort((a, b) => (b.abr || 0) - (a.abr || 0));

            const audioFormat = audioFormats[0] || info.formats.find(f => f.acodec !== 'none');

            if (!audioFormat || !audioFormat.url) {
                console.error('No audio format found');
                this.playNext(guildId);
                return;
            }

            console.log('🎵 Audio format:', audioFormat.acodec, (audioFormat.abr || 'unknown') + 'kbps');

            const stream = createAudioResource(audioFormat.url, {
                inputType: StreamType.Arbitrary
            });

            playerData.current = track;
            playerData.player.play(stream);
            this.queueStorage.markPlayed(guildId, track.id);

            console.log('🎵 Playback started!');
            await this.updateNowPlaying(guildId, track);
        } catch (error) {
            console.error('Error playing:', error.message);
            this.playNext(guildId);
        }
    }

    async updateNowPlaying(guildId, track) {
        const queue = this.queueStorage.getGuildQueue(guildId);
        if (!queue.musicChannelId) return;

        try {
            const channel = await this.client.channels.fetch(queue.musicChannelId);
            if (!channel) return;

            const minutes = Math.floor(track.duration / 60);
            const seconds = String(track.duration % 60).padStart(2, '0');

            const embed = new EmbedBuilder()
                .setColor('#00D4AA')
                .setTitle('🎵 Now Playing')
                .setDescription('**' + track.title + '**\n' + track.artist)
                .addFields(
                    { name: '⏱️', value: minutes + ':' + seconds, inline: true },
                    { name: '📤', value: track.username, inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Now playing error:', error);
        }
    }

    pause(guildId) {
        const playerData = this.getPlayer(guildId);
        if (playerData.player.state.status === AudioPlayerStatus.Playing) {
            playerData.player.pause();
            return true;
        }
        return false;
    }

    resume(guildId) {
        const playerData = this.getPlayer(guildId);
        if (playerData.player.state.status === AudioPlayerStatus.Paused) {
            playerData.player.unpause();
            return true;
        }
        return false;
    }

    skip(guildId) {
        const playerData = this.getPlayer(guildId);
        playerData.player.stop();
        return true;
    }

    stop(guildId) {
        const playerData = this.getPlayer(guildId);
        if (playerData.connection) {
            playerData.connection.destroy();
            playerData.connection = null;
        }
        playerData.player.stop();
        playerData.current = null;
        this.clearIdleTimer(guildId);
    }

    startIdleTimer(guildId) {
        this.clearIdleTimer(guildId);
        const timer = setTimeout(() => {
            this.stop(guildId);
        }, 10 * 60 * 1000);
        this.idleTimers.set(guildId, timer);
    }

    clearIdleTimer(guildId) {
        const timer = this.idleTimers.get(guildId);
        if (timer) {
            clearTimeout(timer);
            this.idleTimers.delete(guildId);
        }
    }

    getCurrent(guildId) {
        const playerData = this.getPlayer(guildId);
        return playerData.current;
    }

    isPlaying(guildId) {
        const playerData = this.getPlayer(guildId);
        return playerData.player.state.status === AudioPlayerStatus.Playing;
    }
}

module.exports = MusicPlayer;
