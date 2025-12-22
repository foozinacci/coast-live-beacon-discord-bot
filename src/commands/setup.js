const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
    name: 'setup',
    description: 'Server setup wizard (Owner only)',
    async execute(message, args) {
        // Owner only
        if (message.guild.ownerId !== message.author.id) {
            return message.reply('❌ Only the server owner can run setup.');
        }

        const streamerStorage = new StreamerStorage();
        const guildId = message.guild.id;

        // Check if already configured
        const existingConfig = streamerStorage.getGuildConfig(guildId);
        if (existingConfig.notificationChannelId) {
            return message.reply('⚠️ Server already configured!\n\n' +
                'Use individual commands to update:\n' +
                '• `!setchannel` - Go-live notifications\n' +
                '• `!setrole @Role` - Ping role\n' +
                '• `!setmusicchannel` - Music updates\n' +
                '• `!linktwitchchat username` - Twitch chat\n\n' +
                '*To start fresh, delete data/streamers.json*');
        }

        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('🗼 LIVE BEACON Setup Wizard')
            .setDescription('Welcome! Follow these steps to configure your server.')
            .addFields(
                {
                    name: '📺 Step 1: Go-Live Alerts',
                    value: 'Go to your notification channel and run:\n' +
                        '```!setchannel```\n' +
                        'Then set ping role:\n' +
                        '```!setrole @StreamersLive```',
                    inline: false
                },
                {
                    name: '👤 Step 2: Add Streamers',
                    value: 'Add Twitch streamers to monitor:\n' +
                        '```!addstreamer TwitchUsername```\n' +
                        'Or multiple:\n' +
                        '```!addstreamers user1, user2, user3.```',
                    inline: false
                },
                {
                    name: '🎵 Step 3: Music (Optional)',
                    value: 'Set music updates channel:\n' +
                        '```!setmusicchannel```\n' +
                        'Users can then:\n' +
                        '`!addtrack [URL]` → `!play`',
                    inline: false
                },
                {
                    name: '📺 Step 4: Twitch Chat (Optional)',
                    value: '**Link your Twitch channel:**\n' +
                        '```!linktwitchchat YourTwitchUsername```\n\n' +
                        '⚠️ **First, add credentials to .env:**\n' +
                        '1. Go to: twitchtokengenerator.com\n' +
                        '2. Get a "Bot Chat Token"\n' +
                        '3. Add to `.env`:\n' +
                        '```\nTWITCH_BOT_USERNAME=yourname\nTWITCH_BOT_TOKEN=oauth:xxxxx\n```\n' +
                        '4. Restart bot, then run `!linktwitchchat`\n\n' +
                        'Your Twitch viewers can then use:\n' +
                        '`!lbsr [URL]` • `!lbqueue` • `!lbnp`',
                    inline: false
                }
            )
            .setFooter({ text: 'LIVE BEACON by COAST • !help for commands' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
