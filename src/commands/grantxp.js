const XPStorage = require('../utils/xpStorage');

module.exports = {
    name: 'grantxp',
    description: 'Grant XP to a user (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can grant XP.');
        }

        if (args.length < 2) {
            return message.reply('Usage: `!grantxp @USER 100`');
        }

        const match = args[0].match(/<@!?(\d+)>/);
        if (!match) {
            return message.reply('❌ Please mention a user.');
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Amount must be a positive number.');
        }

        let username = 'Unknown';
        try {
            const member = await message.guild.members.fetch(match[1]);
            username = member.user.username;
        } catch (e) {
            return message.reply('❌ User not found.');
        }

        const storage = new XPStorage();
        const result = storage.grantXP(message.guild.id, match[1], amount);

        let response = '✅ Granted **' + amount + ' XP** to **' + username + '**';
        if (result.levelUp) {
            response += '\n🎉 They leveled up to **Level ' + result.level + '**!';
        }

        return message.reply(response);
    },
};
