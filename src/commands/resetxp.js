const XPStorage = require('../utils/xpStorage');

module.exports = {
    name: 'resetxp',
    description: 'Reset a user\'s XP (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can reset XP.');
        }

        if (args.length < 1) {
            return message.reply('Usage: `!resetxp @USER`');
        }

        const match = args[0].match(/<@!?(\d+)>/);
        if (!match) {
            return message.reply('❌ Please mention a user.');
        }

        let username = 'Unknown';
        try {
            const member = await message.guild.members.fetch(match[1]);
            username = member.user.username;
        } catch (e) {
            return message.reply('❌ User not found.');
        }

        const storage = new XPStorage();
        const reset = storage.resetXP(message.guild.id, match[1]);

        if (reset) {
            return message.reply('✅ Reset XP for **' + username + '** to Level 1.');
        } else {
            return message.reply('ℹ️ No XP data found for that user.');
        }
    },
};
