const QueueStorage = require('../utils/queueStorage');

module.exports = {
    name: 'blacklist',
    description: 'Blacklist a URL or domain (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can manage blacklist.');
        }

        if (args.length === 0) {
            return message.reply('Usage: `!blacklist [URL or domain]`\n\nExample: `!blacklist youtube.com/badchannel`');
        }

        const pattern = args[0];
        const queueStorage = new QueueStorage();

        if (queueStorage.addBlacklist(message.guild.id, pattern)) {
            return message.reply('✅ Blacklisted: `' + pattern + '`');
        } else {
            return message.reply('ℹ️ Already blacklisted.');
        }
    },
};
