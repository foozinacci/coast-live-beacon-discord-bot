const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const QueueStorage = require('../utils/queueStorage');

class MusicPlayer {
    constructor(client) {
        this.client = client;
        this.players = new Map(); // guildId -> { player, connection, current }
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
                console.error('Audio player error:', error);
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
                console.log('🎵 Attempting to join voice channel:', voiceChannel.name);
                playerData.connection = await this.joinChannel(voiceChannel);
                playerData.connection.subscribe(playerData.player);
                console.log('🎵 Successfully joined voice channel');
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

        console.log('🎵 Next track:', track.title, 'URL:', track.url, 'Platform:', track.platform);

        this.clearIdleTimer(guildId);

        try {
            let stream;

            if (track.platform === 'youtube') {
                if (!track.url || track.url === 'undefined') {
                    console.error('Invalid YouTube URL for track:', track.title);
                    this.playNext(guildId);
                    return;
                }
                console.log('🎵 Streaming from YouTube:', track.url);
                const ytStream = await play.stream(track.url);
                console.log('🎵 Got stream, type:', ytStream.type);
                stream = createAudioResource(ytStream.stream, { inputType: ytStream.type });
            } else if (track.platform === 'soundcloud') {
                const scStream = await play.stream(track.url);
                stream = createAudioResource(scStream.stream, { inputType: scStream.type });
            } else if (track.platform === 'spotify') {
                // Spotify: search YouTube for the song and play that
                const searchQuery = track.title + ' ' + track.artist;
                console.log('🎵 Searching YouTube for Spotify track:', searchQuery);
                const searched = await play.search(searchQuery, { limit: 1 });
                if (searched.length === 0) {
                    console.error('No YouTube match found for Spotify track:', searchQuery);
                    this.playNext(guildId);
                    return;
                }
                const ytStream = await play.stream(searched[0].url);
                stream = createAudioResource(ytStream.stream, { inputType: ytStream.type });
            } else {
                // Direct audio link
                stream = createAudioResource(track.url);
            }

            playerData.current = track;
            playerData.player.play(stream);
            this.queueStorage.markPlayed(guildId, track.id);

            // Update now playing
            await this.updateNowPlaying(guildId, track);
        } catch (error) {
            console.error('Error playing track:', error);
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
            const badge = track.isBirthday ? ' 🎂' : '';

            const embed = new EmbedBuilder()
                .setColor('#00D4AA')
                .setTitle('🎵 Now Playing')
                .setDescription('**' + track.title + '**\n' + track.artist)
                .addFields(
                    { name: '⏱️ Duration', value: minutes + ':' + seconds, inline: true },
                    { name: '📤 Added by', value: track.username + badge, inline: true },
                    { name: '🔗 Platform', value: track.platform, inline: true }
                )
                .setFooter({ text: 'Queue: ' + queue.tracks.length + ' tracks' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error updating now playing:', error);
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
            console.log('Music stopped due to idle timeout in guild ' + guildId);
        }, 10 * 60 * 1000); // 10 minutes
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
