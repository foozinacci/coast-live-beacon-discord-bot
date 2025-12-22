const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'linktwitchchat',
    description: 'Link your Twitch channel for song requests',
    async execute(message, args) {
        // Admin only
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Admin only.');
        }

        const configPath = path.join(__dirname, '../../data/twitchLinks.json');

        // Load existing config
        let config = {};
        try {
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) { }

        // No arguments - show instructions
        if (args.length === 0) {
            const currentLink = config[message.guild.id];

            let status = '';
            if (currentLink) {
                status = '✅ **Currently linked:** `' + currentLink.channel + '`\n\n';
            }

            return message.reply(status +
                '**Link Your Twitch Chat for Song Requests**\n\n' +
                '**Step 1:** Get your Twitch token\n' +
                '→ Go to: <https://twitchtokengenerator.com/>\n' +
                '→ Click "Bot Chat Token"\n' +
                '→ Authorize with your Twitch account\n' +
                '→ Copy the **Access Token**\n\n' +
                '**Step 2:** Run this command (in DMs for privacy!):\n' +
                '```!linktwitchchat YourTwitchName oauth:YOUR_TOKEN```\n\n' +
                '**Example:**\n' +
                '`!linktwitchchat foozinacci oauth:abc123def456`\n\n' +
                '⚠️ *Send the token command in DMs to keep it private!*\n' +
                '*The bot will link it to this server.*');
        }

        // Parse arguments
        const twitchChannel = args[0].toLowerCase().replace('@', '').replace('#', '');
        const token = args[1];

        if (!token || !token.startsWith('oauth:')) {
            return message.reply('❌ Missing token!\n\n' +
                'Usage: `!linktwitchchat YourTwitchName oauth:YOUR_TOKEN`\n\n' +
                'Get your token at: <https://twitchtokengenerator.com/>');
        }

        // Delete the message to hide the token (if in a channel)
        if (message.guild) {
            try {
                await message.delete();
            } catch (e) {
                // Can't delete - might be DMs
            }
        }

        // Save the config for this guild
        config[message.guild.id] = {
            channel: twitchChannel,
            token: token,
            username: twitchChannel,
            linkedBy: message.author.id,
            linkedAt: Date.now()
        };

        // Ensure data directory exists
        const dataDir = path.dirname(configPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Connect to Twitch chat
        const TwitchChat = require('../services/twitchChat');
        let twitchChat = message.client.twitchChat;

        if (!twitchChat) {
            twitchChat = new TwitchChat(message.client);
            message.client.twitchChat = twitchChat;
        }

        // Connect with this server's credentials
        try {
            await twitchChat.connectGuild(message.guild.id, twitchChannel, twitchChannel, token);
            twitchChat.linkChannel(twitchChannel, message.guild.id);

            // Reply in DMs or channel
            const successMsg = '✅ **Twitch Chat Linked!**\n\n' +
                '**Channel:** `' + twitchChannel + '`\n\n' +
                '**Your Twitch viewers can now use:**\n' +
                '• `!lbsr [URL]` - Request a song\n' +
                '• `!lbqueue` - View queue\n' +
                '• `!lbnp` - Now playing\n\n' +
                '*Token saved securely. You won\'t need to enter it again.*';

            await message.author.send(successMsg);

        } catch (error) {
            console.error('Twitch connect error:', error);
            return message.author.send('❌ Failed to connect to Twitch: ' + error.message + '\n\nCheck that your token is valid.');
        }
    }
};
