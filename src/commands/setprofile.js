const UserProfileStorage = require('../utils/userProfileStorage');

module.exports = {
    name: 'lbsetprofile',
    description: 'Set your social media links',
    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('**Set Your Profile Links**\n\n' +
                '`!setprofile twitch username`\n' +
                '`!setprofile youtube @handle`\n' +
                '`!setprofile twitter @handle`\n' +
                '`!setprofile tiktok @handle`\n' +
                '`!setprofile other https://link.com`\n\n' +
                '*View with `!myprofile` • Clear with `!clearprofile`*');
        }

        const platform = args[0].toLowerCase();
        const value = args.slice(1).join(' ');

        const validPlatforms = ['twitch', 'youtube', 'twitter', 'tiktok', 'other'];
        if (!validPlatforms.includes(platform)) {
            return message.reply('❌ Invalid platform. Use: `twitch`, `youtube`, `twitter`, `tiktok`, or `other`');
        }

        // Format the URL/handle
        let formattedValue = value;
        if (platform === 'twitch' && !value.startsWith('http')) {
            formattedValue = 'https://twitch.tv/' + value.replace('@', '');
        } else if (platform === 'youtube' && !value.startsWith('http')) {
            formattedValue = 'https://youtube.com/' + value;
        } else if (platform === 'twitter' && !value.startsWith('http')) {
            formattedValue = 'https://x.com/' + value.replace('@', '');
        } else if (platform === 'tiktok' && !value.startsWith('http')) {
            formattedValue = 'https://tiktok.com/@' + value.replace('@', '');
        }

        const storage = new UserProfileStorage();
        const update = {};
        update[platform] = formattedValue;

        storage.setProfile(
            message.guild.id,
            message.author.id,
            message.author.username,
            update
        );

        const platformNames = {
            twitch: '📺 Twitch',
            youtube: '▶️ YouTube',
            twitter: '🐦 Twitter/X',
            tiktok: '🎵 TikTok',
            other: '🔗 Link'
        };

        return message.reply('✅ ' + platformNames[platform] + ' set to: ' + formattedValue);
    },
};
