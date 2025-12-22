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
            return message.reply('❌ Mods only. Use `!help` for public commands.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🛡️ LIVE BEACON - Mod/Admin')
            .setDescription(isAdmin ? '👑 **Admin View**' : '🛡️ **Mod View**');

        // Streamers
        embed.addFields({
            name: '📺 Streamers',
            value: '`!addstreamer USER`\n' +
                '`!addstreamers USER, USER.`\n' +
                '`!removestreamer USER`\n' +
                '`!stats USER` · `!leaderboard`',
            inline: true
        });

        // Birthdays
        embed.addFields({
            name: '🎂 Birthdays',
            value: '`!addbirthday @USER MM/DD/YYYY`\n' +
                '`!removebirthday @USER`',
            inline: true
        });

        // XP & Streaks
        embed.addFields({
            name: '⭐ XP & Streaks',
            value: '`!grantxp @USER 100`\n' +
                '`!resetxp @USER`\n' +
                '`!freezestreaks on|off`',
            inline: true
        });

        // Music
        embed.addFields({
            name: '🎵 Music',
            value: '`!forceskip` · `!pausemusic`\n' +
                '`!resumemusic`\n' +
                '`!clearqueue confirm`\n' +
                '`!removetrack @USER [#]`\n' +
                '`!blacklist [url]`',
            inline: true
        });

        // Admin-only
        if (isAdmin) {
            embed.addFields({
                name: '⚙️ Admin: Setup',
                value: '`!setup` - First-time wizard\n' +
                    '`!setchannel` - Go-live\n' +
                    '`!setupupdates` - Summaries\n' +
                    '`!setupannouncements`\n' +
                    '`!setmusicchannel`\n' +
                    '`!setrole @ROLE`',
                inline: true
            });

            embed.addFields({
                name: '💾 Admin: Data',
                value: '`!config` - View settings\n' +
                    '`!backup` - Manage backups\n' +
                    '`!musicstatus`\n' +
                    '`!removead @USER 1|2`\n' +
                    '`!clearbirthdays confirm`',
                inline: true
            });
        }

        embed.setFooter({ text: isAdmin ? '👑 Administrator' : '🛡️ Moderator' });
        embed.setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
