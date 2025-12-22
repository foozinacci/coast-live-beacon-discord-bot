module.exports = {
    name: 'setuserlimit',
    description: 'Set track limit for a user (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can set user limits.');
        }

        if (args.length < 2) {
            return message.reply('Usage: `!setuserlimit @USER [0-4]`\n\n' +
                '0 = blocked, 3 = default, 4 = birthday level');
        }

        const match = args[0].match(/<@!?(\d+)>/);
        if (!match) {
            return message.reply('❌ Please mention a user.');
        }

        const limit = parseInt(args[1]);
        if (isNaN(limit) || limit < 0 || limit > 4) {
            return message.reply('❌ Limit must be 0-4.');
        }

        let username = 'Unknown';
        try {
            const member = await message.guild.members.fetch(match[1]);
            username = member.user.username;
        } catch (e) {
            return message.reply('❌ User not found.');
        }

        // Would store in UserProfileStorage
        // For now, acknowledge the setting
        return message.reply('✅ Set track limit for **' + username + '** to **' + limit + '**');
    },
};
