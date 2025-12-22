const play = require('play-dl');
const QueueStorage = require('../utils/queueStorage');
const XPStorage = require('../utils/xpStorage');

module.exports = {
    name: 'addtrack',
    description: 'Add a track to the music queue',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('**Add a Track**\n\n' +
                '`!addtrack [YouTube URL]`\n\n' +
                '📋 **Limits:** 3 tracks (4 on birthday)\n' +
                '⏱️ **Max Duration:** 7 min (15 min birthday)\n\n' +
                '*Supported: YouTube, SoundCloud, direct audio links*\n' +
                '*View your tracks: `!myqueue`*');
        }

        const url = args[0];
        const isExtended = args.includes('--extended');

        // Check for Spotify
        if (url.includes('spotify.com')) {
            return message.reply('⚠️ **Spotify not yet configured.**\n\n' +
                'Please use a YouTube or SoundCloud link instead.\n' +
                '*Tip: Search for the song on YouTube and use that URL.*');
        }

        // Validate URL
        let platform = 'unknown';
        if (play.yt_validate(url) === 'video') {
            platform = 'youtube';
        } else if (play.so_validate(url)) {
            platform = 'soundcloud';
        } else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            platform = 'direct';
        } else {
            return message.reply('❌ Unsupported link.\n\n' +
                '**Supported:** YouTube, SoundCloud, direct audio links (.mp3, .wav)');
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
            } else if (platform === 'soundcloud') {
                const info = await play.soundcloud(url);
                trackInfo = {
                    url,
                    title: info.name,
                    artist: info.user?.name || 'Unknown',
                    duration: Math.floor(info.durationInMs / 1000),
                    platform
                };
            } else {
                // Direct link - estimate duration
                trackInfo = {
                    url,
                    title: url.split('/').pop(),
                    artist: 'Unknown',
                    duration: 180, // Assume 3 min
                    platform
                };
            }
        } catch (error) {
            console.error('Track info error:', error);
            return message.reply('❌ Could not fetch track info.\n\n' +
                'Make sure the video is public and not age-restricted.');
        }

        // Check birthday status (would check AnnouncementStorage)
        trackInfo.isBirthday = false; // TODO: integrate with birthday system
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

        // Award XP for adding track
        const xpStorage = new XPStorage();
        xpStorage.addXP(message.guild.id, message.author.id, 5, 'trackAdded');

        const minutes = Math.floor(trackInfo.duration / 60);
        const seconds = String(trackInfo.duration % 60).padStart(2, '0');

        return message.reply('🎵 **Track Added!**\n\n' +
            '**' + trackInfo.title + '**\n' +
            trackInfo.artist + ' • ' + minutes + ':' + seconds + '\n\n' +
            '📍 Position: #' + result.position + ' in queue\n' +
            '*Join voice & run `!play` to start*');
    },
};
