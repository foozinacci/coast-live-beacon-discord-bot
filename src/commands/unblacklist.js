const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'unblacklist',
    description: 'Remove from blacklist (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can manage blacklist.');
        }

        if (args.length === 0) {
            return message.reply('Usage: `!unblacklist [URL or domain]`');
        }

        const pattern = args[0];
        const queueStorage = new QueueStorage();

        if (queueStorage.removeBlacklist(message.guild.id, pattern)) {
            return message.reply('✅ Removed from blacklist: `' + pattern + '`');
        } else {
            return message.reply('ℹ️ Not in blacklist.');
        }
    },
};
