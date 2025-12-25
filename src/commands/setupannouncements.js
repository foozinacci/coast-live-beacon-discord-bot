const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'lbsetannounce',
    description: 'Set the channel for birthday and promotional announcements',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permissions to use this command.');
        }

        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;
        const channelId = message.channel.id;

        storage.setAnnouncementsChannel(guildId, channelId);

        return message.reply('✅ Announcements channel set to <#' + channelId + '>!\n\n' +
            '📢 **What will be posted here:**\n' +
            '• 🎂 Birthday celebrations (with personalized stats!)\n' +
            '• 📣 Scheduled user ads (daily at set times)\n\n' +
            '**Next Steps:**\n' +
            '• `!addbirthday @USER MM/DD/YYYY` - Mod adds a user\'s birthday\n' +
            '• `!addmybirthday MM/DD/YYYY` - Users add their own birthday\n' +
            '• `!addad HH:MM https://link.com` - Users schedule a daily ad (max 2)\n\n' +
            '*Birthdays are checked daily at midnight and announced automatically!*');
    },
};
