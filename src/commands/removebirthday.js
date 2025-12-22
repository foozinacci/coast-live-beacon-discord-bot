const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'removebirthday',
    description: 'Remove a tracked birthday',
    async execute(message, args) {
        // Check moderator permissions
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Only moderators can remove birthdays.');
        }

        if (args.length < 1) {
            return message.reply('❌ Usage: `!removebirthday @User`');
        }

        // Parse user mention or ID
        let targetUserId;
        let targetUsername;
        const userArg = args[0];

        // Check if it's a mention
        const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            targetUserId = mentionMatch[1];
            try {
                const member = await message.guild.members.fetch(targetUserId);
                targetUsername = member.user.username;
            } catch (error) {
                targetUsername = 'Unknown User';
            }
        } else {
            // Try to find by username
            const members = await message.guild.members.fetch({ query: userArg, limit: 1 });
            const targetUser = members.first();

            if (!targetUser) {
                return message.reply(`❌ Could not find user "${userArg}". Try mentioning them with @.`);
            }

            targetUserId = targetUser.id;
            targetUsername = targetUser.user.username;
        }

        const storage = new AnnouncementStorage();
        const removed = storage.removeBirthday(message.guild.id, targetUserId);

        if (removed) {
            return message.reply(`✅ Birthday removed for **${targetUsername}**.`);
        } else {
            return message.reply(`❌ No birthday found for **${targetUsername}**.`);
        }
    },
};
