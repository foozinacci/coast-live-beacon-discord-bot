const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'linktwitchchat',
    description: 'Link your Twitch channel for song requests',
    async execute(message, args) {
        // Admin only
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need admin permissions to link a Twitch channel to this server.');
        }

        const configPath = path.join(__dirname, '../../data/twitchLinks.json');

        // Load existing config
        let config = {};
        try {
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) { }

        // Check if already linked
        if (config[message.guild.id]) {
            return message.reply('⚠️ Already linked to `' + config[message.guild.id].channel + '`\n\n' +
                'Use `!unlinktwitch` first to remove the current connection.');
        }

        // No arguments - show instructions
        if (args.length === 0) {
            return message.reply('**🔐 Link Your Twitch Chat**\n\n' +
                '**Step 1:** Get your Twitch token\n' +
                '→ Visit: <https://twitchtokengenerator.com/>\n' +
                '→ Click "Bot Chat Token"\n' +
                '→ Authorize with Twitch\n' +
                '→ Copy the **Access Token**\n\n' +
                '**Step 2:** DM me this command (for privacy):\n' +
                '```!linktwitchchat YourTwitchName oauth:TOKEN```\n\n' +
                '*🔒 The token is used once to connect and is never stored.*');
        }

        // Parse arguments
        const twitchChannel = args[0].toLowerCase().replace('@', '').replace('#', '');
        const token = args[1];

        if (!token || !token.startsWith('oauth:')) {
            return message.reply('❌ Missing or invalid token!\n\n' +
                'Format: `!linktwitchchat YourChannel oauth:YOUR_TOKEN`');
        }

        // Delete the message immediately to hide the token
        try {
            await message.delete();
        } catch (e) { }

        // Connect to Twitch chat (uses token once)
        const TwitchChat = require('../services/twitchChat');
        let twitchChat = message.client.twitchChat;

        if (!twitchChat) {
            twitchChat = new TwitchChat(message.client);
            message.client.twitchChat = twitchChat;
        }

        try {
            // Connect with token (token used here only)
            await twitchChat.connectGuild(message.guild.id, twitchChannel, twitchChannel, token);
            twitchChat.linkChannel(twitchChannel, message.guild.id);

            // Save ONLY channel name - NOT the token
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            config[message.guild.id] = {
                channel: twitchChannel,
                linkedBy: message.author.id,
                linkedAt: Date.now()
                // Note: token is NOT stored
            };

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Confirm via DM
            await message.author.send('✅ **Twitch Chat Linked!**\n\n' +
                '**Channel:** `' + twitchChannel + '`\n' +
                '**Server:** ' + message.guild.name + '\n\n' +
                '**Your viewers can now use:**\n' +
                '• `!lbsr [URL]` - Request a song\n' +
                '• `!lbqueue` - View queue\n' +
                '• `!lbnp` - Now playing\n\n' +
                '*🔒 Your token was used once and discarded.*');

        } catch (error) {
            console.error('Twitch connect error:', error);
            await message.author.send('❌ Failed to connect: ' + error.message + '\n\nVerify your token is valid.');
        }
    }
};
