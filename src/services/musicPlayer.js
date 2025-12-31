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
// youtube-dl-exec removed - using play-dl instead for Railway compatibility
const { Readable } = require('stream');

class MusicPlayer {
    constructor(client) {
        this.client = client;
        this.players = new Map();
        this.queueStorage = new QueueStorage();
        this.idleTimers = new Map();
    }

    async joinChannel(voiceChannel) {
        // Check if bot has permission to connect (works for private channels too)
        const permissions = voiceChannel.permissionsFor(this.client.user);
        if (!permissions.has('Connect')) {
            throw new Error('Missing permission to connect to this voice channel');
        }
        if (!permissions.has('Speak')) {
            throw new Error('Missing permission to speak in this voice channel');
        }

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
            this.players.set(guildId, {
                player,
                connection: null,
                current: null,
                lastPlayedUrl: null,  // Track last played song URL
                repeatCount: 0         // Count consecutive repeats
            });

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

        // REPEAT DETECTION: Check if same song is playing again
        if (playerData.lastPlayedUrl && track.url === playerData.lastPlayedUrl) {
            playerData.repeatCount++;
            console.log('🔁 Repeat detected:', track.title, '(count:', playerData.repeatCount + ')');

            if (playerData.repeatCount >= 2) {
                // Third time same song - auto leave
                console.log('🔁 Same song 3x - leaving voice channel');
                this.stop(guildId);

                // Notify music channel
                const queue = this.queueStorage.getGuildQueue(guildId);
                if (queue.musicChannelId) {
                    try {
                        const channel = await this.client.channels.fetch(queue.musicChannelId);
                        if (channel) {
                            await channel.send('⏹️ **Left voice channel** - Same song queued 3 times in a row. Add a different song with `!lbsr`!');
                        }
                    } catch (e) { }
                }
                return;
            } else if (playerData.repeatCount === 1) {
                // Second time - warn and wait for new song
                console.log('🔁 Same song 2x - waiting for different song');
                this.startIdleTimer(guildId);

                const queue = this.queueStorage.getGuildQueue(guildId);
                if (queue.musicChannelId) {
                    try {
                        const channel = await this.client.channels.fetch(queue.musicChannelId);
                        if (channel) {
                            await channel.send('⏸️ **Paused** - Same song queued twice. Add a different song with `!lbsr` to continue!');
                        }
                    } catch (e) { }
                }
                return;
            }
        } else {
            // Different song - reset counter
            playerData.repeatCount = 0;
        }

        // Track this song as last played
        playerData.lastPlayedUrl = track.url;

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

            console.log('🎵 Getting audio stream via play-dl:', videoUrl);

            // Use play-dl to get audio stream (Railway compatible - no native binaries)
            const audioStream = await play.stream(videoUrl);

            const stream = createAudioResource(audioStream.stream, {
                inputType: audioStream.type
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
