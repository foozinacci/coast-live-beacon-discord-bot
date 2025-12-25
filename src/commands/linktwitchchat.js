const fs = require('fs');
const path = require('path');

// Pending link requests (guildId -> { channel, timestamp })
const pendingLinks = new Map();

module.exports = {
    name: 'lblinktwitch',
    description: 'Link your Twitch channel for song requests (2-step process)',
    async execute(message, args) {
        // Admin only
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only server administrators can link a Twitch channel.');
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
            return message.reply(
                '📺 **Already linked to:** `' + config[message.guild.id].channel + '`\n\n' +
                'To change channels, first use `!lbunlinktwitch`'
            );
        }

        const guildId = message.guild.id;

        // ========== STEP 1: Just channel name ==========
        if (args.length === 0) {
            return message.reply(
                '🔗 **Link Your Twitch Chat**\n\n' +
                '**Step 1:** Tell me your Twitch channel name:\n' +
                '```!lblinktwitch YourChannelName```\n\n' +
                '*I\'ll then ask for your token privately.*'
            );
        }

        // ========== STEP 2a: Channel provided, waiting for token ==========
        const firstArg = args[0].toLowerCase().replace('@', '').replace('#', '');

        // Check if this looks like an oauth token (they provided token as first arg)
        if (firstArg.startsWith('oauth:')) {
            return message.reply(
                '⚠️ **Oops!** Provide your channel name first, not the token.\n\n' +
                'Use: `!lblinktwitch YourChannelName`'
            );
        }

        // Check if they provided both channel and token
        if (args.length >= 2 && args[1].startsWith('oauth:')) {
            // Fast path: they know what they're doing
            return this.completeLink(message, firstArg, args[1], config, configPath);
        }

        // Just channel name - start 2-step process
        const twitchChannel = firstArg;

        // Store pending request
        pendingLinks.set(guildId, {
            channel: twitchChannel,
            userId: message.author.id,
            timestamp: Date.now()
        });

        // Clear pending after 10 minutes
        setTimeout(() => {
            if (pendingLinks.get(guildId)?.timestamp === Date.now()) {
                pendingLinks.delete(guildId);
            }
        }, 600000);

        await message.reply(
            '✅ **Step 1 Complete!** Channel: `' + twitchChannel + '`\n\n' +
            '**Step 2:** Get your OAuth token:\n' +
            '1️⃣ Visit: <https://twitchtokengenerator.com/>\n' +
            '2️⃣ Click **"Bot Chat Token"**\n' +
            '3️⃣ Authorize with Twitch\n' +
            '4️⃣ Copy the **Access Token**\n\n' +
            '**Then reply here with:**\n' +
            '```!lblinktwitch oauth:YOUR_TOKEN_HERE```\n\n' +
            '*⏰ This request expires in 10 minutes*'
        );

        return;
    },

    // Helper method to complete the linking process
    async completeLink(message, twitchChannel, token, config, configPath) {
        const guildId = message.guild.id;

        // Delete the message immediately to hide the token
        try {
            await message.delete();
        } catch (e) { }

        // Connect to Twitch chat
        const TwitchChat = require('../services/twitchChat');
        let twitchChat = message.client.twitchChat;

        if (!twitchChat) {
            twitchChat = new TwitchChat(message.client);
            message.client.twitchChat = twitchChat;
        }

        try {
            // Connect with token
            await twitchChat.connectGuild(guildId, twitchChannel, twitchChannel, token);
            twitchChat.linkChannel(twitchChannel, guildId);

            // Save config
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            config[guildId] = {
                channel: twitchChannel,
                username: twitchChannel,
                token: token,
                linkedBy: message.author.id,
                linkedAt: Date.now()
            };

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Auto-follow the channel so bot can chat in followers-only mode
            try {
                const TwitchClient = require('../api/twitchClient');
                const twitchApi = new TwitchClient();
                const userInfo = await twitchApi.getUserInfo(twitchChannel);
                if (userInfo) {
                    const followed = await twitchApi.followChannel(userInfo.id);
                    if (followed) {
                        console.log(`✅ Bot now follows ${twitchChannel} for followers-only chat access`);
                    }
                }
            } catch (e) {
                console.log(`⚠️ Could not auto-follow ${twitchChannel}:`, e.message);
            }

            // Clear any pending request
            pendingLinks.delete(guildId);

            // Confirm via DM
            await message.author.send(
                '✅ **Twitch Chat Linked Successfully!**\n\n' +
                '📺 **Channel:** `' + twitchChannel + '`\n' +
                '🏠 **Server:** ' + message.guild.name + '\n\n' +
                '**Your viewers can now use in Twitch chat:**\n' +
                '• `!lbsr [URL]` - Request a song\n' +
                '• `!lbqueue` - View queue\n' +
                '• `!lbnp` - Now playing\n' +
                '• `!lbjoin` - Join Wildcard game\n\n' +
                '*🔐 Connection persists through bot restarts.*'
            );

            // Also post public confirmation (without sensitive info)
            await message.channel.send(
                '✅ **Twitch linked!** Channel `' + twitchChannel + '` is now connected.\n' +
                '*Confirmation sent via DM.*'
            );

        } catch (error) {
            console.error('Twitch connect error:', error);
            await message.author.send(
                '❌ **Connection Failed**\n\n' +
                'Error: ' + error.message + '\n\n' +
                '**Common fixes:**\n' +
                '• Make sure the token starts with `oauth:`\n' +
                '• Get a fresh token from twitchtokengenerator.com\n' +
                '• Try again with `!lblinktwitch ' + twitchChannel + '`'
            );
        }
    }
};

// Handle token-only messages for pending requests
module.exports.handlePendingToken = async function (message, token) {
    const pending = pendingLinks.get(message.guild.id);

    if (!pending || pending.userId !== message.author.id) {
        return false;
    }

    // Check if expired (10 min)
    if (Date.now() - pending.timestamp > 600000) {
        pendingLinks.delete(message.guild.id);
        return false;
    }

    const configPath = path.join(__dirname, '../../data/twitchLinks.json');
    let config = {};
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { }

    await module.exports.completeLink(message, pending.channel, token, config, configPath);
    return true;
};
