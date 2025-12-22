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
            .setDescription(isAdmin ? '👑 **Full Admin Access**' : '🛡️ **Moderator Access**');

        // Streamers
        embed.addFields({
            name: '📺 Streamers',
            value: '`!addstreamer USER`\n' +
                '`!addstreamers U1, U2`\n' +
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

        // Music Control
        embed.addFields({
            name: '🎵 Music Control',
            value: '`!stop` - Stop & disconnect\n' +
                '`!forceskip` - Skip now\n' +
                '`!pausemusic` · `!resumemusic`\n' +
                '`!clearqueue confirm`',
            inline: true
        });

        // Music Moderation
        embed.addFields({
            name: '🎵 Music Moderation',
            value: '`!removetrack @USER [#]`\n' +
                '`!blacklist [URL pattern]`\n' +
                '`!unblacklist [pattern]`\n' +
                '`!setuserlimit @USER [0-4]`',
            inline: true
        });

        // Admin-only
        if (isAdmin) {
            embed.addFields({
                name: '⚙️ Setup',
                value: '`!setup` - First-time wizard\n' +
                    '`!setchannel` - Go-live alerts\n' +
                    '`!setupupdates` - Summaries\n' +
                    '`!setmusicchannel`\n' +
                    '`!setrole @ROLE`',
                inline: true
            });

            embed.addFields({
                name: '💾 Data & Config',
                value: '`!config` - View all settings\n' +
                    '`!musicstatus` - Player status\n' +
                    '`!backup` - Manage backups\n' +
                    '`!linktwitchchat #channel`',
                inline: true
            });
        }

        embed.setFooter({ text: 'LIVE BEACON by COAST' });
        embed.setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
