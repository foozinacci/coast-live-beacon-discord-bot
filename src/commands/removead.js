const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'removead',
    description: 'Remove ads from a user (admin only)',
    async execute(message, args) {
        // Check admin permissions
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Only administrators can remove user ads.');
        }

        if (args.length < 1) {
            return message.reply('❌ Usage:\n`!removead @User 1` - Remove ad #1\n`!removead @User 2` - Remove ad #2\n`!removead @User` - Remove all ads');
        }

        // Parse user mention or ID
        const userArg = args[0];
        const adIndex = args[1] ? parseInt(args[1]) : null;
        let targetUserId;
        let targetUsername;

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
                return message.reply('❌ Could not find user. Try mentioning them with @.');
            }

            targetUserId = targetUser.id;
            targetUsername = targetUser.user.username;
        }

        const storage = new AnnouncementStorage();

        // If specific index provided, remove just that ad
        if (adIndex) {
            const result = storage.removeUserAd(message.guild.id, targetUserId, adIndex);

            if (!result.success) {
                return message.reply('❌ ' + result.error);
            }

            return message.reply('✅ Removed ad #' + adIndex + ' from **' + targetUsername + '**: ' + result.removed.name);
        }

        // Otherwise remove all
        const result = storage.removeAllUserAds(message.guild.id, targetUserId);

        if (!result.success) {
            return message.reply('❌ **' + targetUsername + '** has no ads to remove.');
        }

        return message.reply('✅ Removed **' + result.count + '** ad(s) from **' + targetUsername + '**.');
    },
};
