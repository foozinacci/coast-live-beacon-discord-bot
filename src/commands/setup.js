const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');
const AnnouncementStorage = require('../utils/announcementStorage');
const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'setup',
    description: 'Server setup wizard (Owner only)',
    async execute(message, args) {
        // Owner only
        if (message.guild.ownerId !== message.author.id) {
            return message.reply('❌ Only the server owner can run setup.');
        }

        const streamerStorage = new StreamerStorage();
        const announcementStorage = new AnnouncementStorage();
        const queueStorage = new QueueStorage();
        const guildId = message.guild.id;

        // Check if already configured
        const existingConfig = streamerStorage.getGuildConfig(guildId);
        if (existingConfig.notificationChannelId) {
            return message.reply('⚠️ Server already configured!\n\n' +
                'Use individual commands to update:\n' +
                '• `!setchannel` - Go-live notifications\n' +
                '• `!setupupdates` - Stream summaries\n' +
                '• `!setupannouncements` - Birthdays & ads\n' +
                '• `!setmusicchannel` - Music updates\n\n' +
                '*To start fresh, use `!resetup`*');
        }

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('🗼 LIVE BEACON Setup Wizard')
            .setDescription('Welcome! I\'ll help you configure the bot.\n\n' +
                '**Step 1:** Set the go-live notification channel\n' +
                'Run `!setchannel` in the channel where you want live alerts.\n\n' +
                '**Step 2:** Set the ping role\n' +
                'Run `!setrole @YourRole` to ping on go-live.\n\n' +
                '**Step 3:** Add streamers\n' +
                '`!addstreamer username` or `!addstreamers user1, user2.`\n\n' +
                '**Optional:**\n' +
                '• `!setupupdates` - Stream-end summaries (mod channel)\n' +
                '• `!setupannouncements` - Birthdays & ads\n' +
                '• `!setmusicchannel` - Music queue updates')
            .addFields(
                {
                    name: '📋 Quick Start', value:
                        '1. Go to your notification channel\n' +
                        '2. Run `!setchannel`\n' +
                        '3. Run `!setrole @YourRole`\n' +
                        '4. Run `!addstreamer yourstreamer`', inline: false
                }
            )
            .setFooter({ text: 'LIVE BEACON by COAST • Use !help for all commands' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
