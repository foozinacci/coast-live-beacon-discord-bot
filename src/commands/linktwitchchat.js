module.exports = {
    name: 'linktwitchchat',
    description: 'Link a Twitch channel to this server\'s music queue',
    async execute(message, args) {
        // Admin only
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Admin only.');
        }

        if (args.length === 0) {
            return message.reply('**Link Twitch Chat**\n\n' +
                '`!linktwitchchat [twitch_channel]`\n\n' +
                'Example: `!linktwitchchat foozinacci`\n\n' +
                'This lets Twitch viewers request songs with `!lbsr`');
        }

        const twitchChannel = args[0].toLowerCase().replace('@', '').replace('#', '');

        // Get or create Twitch chat service
        let twitchChat = message.client.twitchChat;

        if (!twitchChat) {
            const TwitchChat = require('../services/twitchChat');
            twitchChat = new TwitchChat(message.client);
            message.client.twitchChat = twitchChat;
        }

        // Link the channel to this guild
        twitchChat.linkChannel(twitchChannel, message.guild.id);

        // Connect if not already connected
        if (!twitchChat.tmiClient) {
            await twitchChat.connect([twitchChannel]);
        } else {
            // Join the new channel
            try {
                await twitchChat.tmiClient.join(twitchChannel);
            } catch (err) {
                console.log('Already in channel or error:', err.message);
            }
        }

        // Save to config
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../../data/twitchLinks.json');

        let links = {};
        try {
            if (fs.existsSync(configPath)) {
                links = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) { }

        links[message.guild.id] = twitchChannel;
        fs.writeFileSync(configPath, JSON.stringify(links, null, 2));

        return message.reply('✅ **Twitch Chat Linked!**\n\n' +
            '**Channel:** `' + twitchChannel + '`\n\n' +
            '**Twitch viewers can now use:**\n' +
            '• `!lbsr [URL]` - Request a song\n' +
            '• `!lbqueue` - View queue\n' +
            '• `!lbnp` - Now playing');
    }
};
