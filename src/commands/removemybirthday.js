const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'removemybirthday',
    description: 'Remove your own birthday',
    async execute(message, args) {
        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;
        const userId = message.author.id;

        const existing = storage.getBirthday(guildId, userId);

        if (!existing) {
            return message.reply('❌ You don\'t have a birthday set.\n\nUse `!addmybirthday MM/DD/YYYY` to add one!');
        }

        storage.removeBirthday(guildId, userId);

        return message.reply('✅ Your birthday has been removed.');
    },
};
