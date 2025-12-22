const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'setupannouncements',
    description: 'Set the channel for birthday and promotional announcements',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permissions to use this command.');
        }

        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;
        const channelId = message.channel.id;

        storage.setAnnouncementsChannel(guildId, channelId);

        return message.reply(`✅ Announcements channel set to <#${channelId}>!

📢 **What will be posted here:**
• 🎂 Birthday celebrations (with personalized stats!)
• 📣 Promotional announcements
• 🎉 Community milestones

**Next steps:**
• Use \`!addbirthday @User MM/DD/YYYY\` to track birthdays
• Use \`!addad\` to add promotional links
• Birthdays are checked daily and announced automatically!`);
    },
};
