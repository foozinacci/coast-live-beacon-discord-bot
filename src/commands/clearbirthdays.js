const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'lbclearbdays',
    description: 'Clear all birthdays (Admin only)',
    async execute(message, args) {
        // Check admin permissions
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only administrators can clear all birthdays.');
        }

        const confirm = args[0]?.toLowerCase();

        if (confirm !== 'confirm') {
            return message.reply('⚠️ This will **permanently delete ALL birthdays** in this server.\n\n' +
                'To confirm, run: `!clearbirthdays confirm`');
        }

        const storage = new AnnouncementStorage();
        const data = storage.getData();
        const guildId = message.guild.id;

        if (data.guilds && data.guilds[guildId]) {
            const count = Object.keys(data.guilds[guildId].birthdays || {}).length;
            data.guilds[guildId].birthdays = {};
            storage.saveData(data);
            return message.reply('✅ Cleared **' + count + '** birthdays from this server.');
        }

        return message.reply('ℹ️ No birthdays were set in this server.');
    },
};
