const play = require('play-dl');
const SpotifyWebApi = require('spotify-web-api-node');
const QueueStorage = require('../utils/queueStorage');
const XPStorage = require('../utils/xpStorage');

// Spotify API client
let spotifyApi = null;
let tokenExpiresAt = 0;

async function initSpotify() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        return false;
    }

    if (!spotifyApi) {
        spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });
    }

    // Refresh token if expired
    if (Date.now() >= tokenExpiresAt) {
        try {
            const data = await spotifyApi.clientCredentialsGrant();
            spotifyApi.setAccessToken(data.body.access_token);
            tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000;
            console.log('🎵 Spotify token refreshed');
        } catch (error) {
            console.error('Spotify auth error:', error.message);
            return false;
        }
    }

    return true;
}

function extractSpotifyTrackId(url) {
    // Extract track ID from Spotify URL
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

module.exports = {
    name: 'lbsr',
    description: 'Add a track to the music queue (song request)',
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

        let platform = 'unknown';
        let trackInfo;

        try {
            // Check Spotify
            if (url.includes('spotify.com')) {
                const spotifyReady = await initSpotify();
                if (!spotifyReady) {
                    return message.reply('⚠️ Spotify not configured. Use YouTube instead.');
                }

                const trackId = extractSpotifyTrackId(url);
                if (!trackId) {
                    return message.reply('❌ Invalid Spotify URL. Use a track link.');
                }

                platform = 'spotify';

                try {
                    const data = await spotifyApi.getTrack(trackId);
                    const track = data.body;

                    trackInfo = {
                        url: url,
                        title: track.name,
                        artist: track.artists.map(a => a.name).join(', '),
                        duration: Math.floor(track.duration_ms / 1000),
                        platform: 'spotify',
                        spotifyUrl: url
                    };
                } catch (spotifyError) {
                    console.error('Spotify API error:', spotifyError.message);
                    return message.reply('❌ Could not fetch Spotify track. Try a YouTube link.');
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
