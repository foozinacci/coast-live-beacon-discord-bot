const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'modhelp',
    description: 'Show moderator and admin commands',
    async execute(message, args) {
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');
        const isAdmin = message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ This command is for moderators only.\n\nUse `!help` for public commands.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🛡️ LIVE BEACON - Mod/Admin Commands')
            .setDescription(isAdmin ? '**Admin View** - Full access' : '**Mod View**');

        // Streamer Management
        embed.addFields({
            name: '📺 Streamers *(run in private channel)*',
            value: '`!addstreamer USER` - Add single streamer\n' +
                '`!addstreamers USER, USER, USER.` - Add multiple\n' +
                '`!removestreamer USER` - Remove streamer\n' +
                '`!stats USER` - View streamer analytics',
            inline: false
        });

        // Leaderboard
        embed.addFields({
            name: '🏆 Leaderboard',
            value: '`!leaderboard` - Rank by peak viewers\n' +
                '`!leaderboard avgviewers` - Rank by average\n' +
                '`!leaderboard streams` - Rank by stream count\n' +
                '`!leaderboard duration` - Rank by total time',
            inline: false
        });

        // Birthday Management
        embed.addFields({
            name: '🎂 Birthdays',
            value: '`!addbirthday @USER MM/DD/YYYY` - Add user birthday\n' +
                '`!removebirthday @USER` - Remove birthday',
            inline: false
        });

        // Admin-only commands
        if (isAdmin) {
            embed.addFields({
                name: '⚙️ Admin: Channel Setup',
                value: '*Run these IN the target channel:*\n' +
                    '`!setchannel` - Go-live notifications\n' +
                    '`!setupupdates` - Stream-end summaries\n' +
                    '`!setupannouncements` - Birthdays & ads\n' +
                    '`!setrole @ROLE` - Ping role for go-live',
                inline: false
            });

            embed.addFields({
                name: '💾 Admin: Data',
                value: '`!backup` - List backups\n' +
                    '`!backup view NAME` - See backup contents\n' +
                    '`!backup create [reason]` - Create backup\n' +
                    '`!backup restore NAME` - Restore (hot reload)\n' +
                    '`!config` - View current settings\n' +
                    '`!removead @USER 1|2` - Remove user\'s ad\n' +
                    '`!clearbirthdays confirm` - Reset all birthdays',
                inline: false
            });
        }

        const roleText = isAdmin ? '👑 Administrator' : '🛡️ Moderator';
        embed.setFooter({ text: roleText + ' | LIVE BEACON by COAST' });
        embed.setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
