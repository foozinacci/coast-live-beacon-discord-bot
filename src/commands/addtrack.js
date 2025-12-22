const play = require('play-dl');
const QueueStorage = require('../utils/queueStorage');
const XPStorage = require('../utils/xpStorage');

// Initialize Spotify on first use
let spotifyInitialized = false;

async function initSpotify() {
    if (spotifyInitialized) return true;

    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
        try {
            await play.setToken({
                spotify: {
                    client_id: process.env.SPOTIFY_CLIENT_ID,
                    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
                    refresh_token: '', // Not needed for client credentials
                    market: 'US'
                }
            });
            spotifyInitialized = true;
            console.log('🎵 Spotify initialized');
            return true;
        } catch (error) {
            console.error('Spotify init error:', error);
            return false;
        }
    }
    return false;
}

module.exports = {
    name: 'addtrack',
    description: 'Add a track to the music queue',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('**Add a Track**\n\n' +
                '`!addtrack [URL]`\n\n' +
                '📋 **Limits:** 3 tracks (4 on birthday)\n' +
                '⏱️ **Max Duration:** 7 min (15 min birthday)\n\n' +
                '*Supported: YouTube, Spotify, SoundCloud*\n' +
                '*View your tracks: `!myqueue`*');
        }

        const url = args[0];
        const isExtended = args.includes('--extended');

        // Validate URL and determine platform
        let platform = 'unknown';
        let trackInfo;

        try {
            // Check Spotify
            if (url.includes('spotify.com')) {
                const spotifyReady = await initSpotify();
                if (!spotifyReady) {
                    return message.reply('⚠️ Spotify not configured. Use YouTube instead.');
                }

                // Validate Spotify URL
                if (play.sp_validate(url) === 'track') {
                    platform = 'spotify';

                    // Get Spotify track info
                    const sp = await play.spotify(url);

                    // Spotify tracks play via YouTube search
                    trackInfo = {
                        url: url,
                        title: sp.name,
                        artist: sp.artists?.map(a => a.name).join(', ') || 'Unknown',
                        duration: Math.floor(sp.durationInMs / 1000),
                        platform: 'spotify',
                        spotifyUrl: url
                    };
                } else {
                    return message.reply('❌ Only Spotify **tracks** are supported (not albums/playlists).');
                }
            }
            // Check YouTube
            else if (play.yt_validate(url) === 'video') {
                platform = 'youtube';
                const info = await play.video_info(url);
                trackInfo = {
                    url,
                    title: info.video_details.title,
                    artist: info.video_details.channel?.name || 'Unknown',
                    duration: info.video_details.durationInSec,
                    platform
                };
            }
            // Check SoundCloud
            else if (play.so_validate(url)) {
                platform = 'soundcloud';
                const info = await play.soundcloud(url);
                trackInfo = {
                    url,
                    title: info.name,
                    artist: info.user?.name || 'Unknown',
                    duration: Math.floor(info.durationInMs / 1000),
                    platform
                };
            }
            // Direct audio link
            else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                platform = 'direct';
                trackInfo = {
                    url,
                    title: url.split('/').pop(),
                    artist: 'Unknown',
                    duration: 180,
                    platform
                };
            }
            else {
                return message.reply('❌ Unsupported link.\n\n' +
                    '**Supported:** YouTube, Spotify, SoundCloud');
            }
        } catch (error) {
            console.error('Track info error:', error);
            return message.reply('❌ Could not fetch track info.\n\n' +
                'Make sure the link is valid and public.');
        }

        // Check birthday status
        trackInfo.isBirthday = false;
        trackInfo.isExtended = isExtended;

        const queueStorage = new QueueStorage();
        const result = queueStorage.addTrack(
            message.guild.id,
            message.author.id,
            message.author.username,
            trackInfo
        );

        if (!result.success) {
            return message.reply('❌ ' + result.error);
        }

        // Award XP
        const xpStorage = new XPStorage();
        xpStorage.addXP(message.guild.id, message.author.id, 5, 'trackAdded');

        const minutes = Math.floor(trackInfo.duration / 60);
        const seconds = String(trackInfo.duration % 60).padStart(2, '0');
        const platformEmoji = platform === 'spotify' ? '💚' : platform === 'youtube' ? '▶️' : '🔊';

        return message.reply(platformEmoji + ' **Track Added!**\n\n' +
            '**' + trackInfo.title + '**\n' +
            trackInfo.artist + ' • ' + minutes + ':' + seconds + '\n\n' +
            '📍 Position: #' + result.position + ' in queue\n' +
            '*Join voice & run `!play` to start*');
    },
};
