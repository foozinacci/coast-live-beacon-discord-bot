const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbmodhelp',
    description: 'Show moderator commands',
    async execute(message, args) {
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Mods only. Use `!lbhelp` for public commands.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🛡️ LIVE BEACON - Mod Commands')
            .addFields(
                {
                    name: '📺 Streamers',
                    value: '`!lbaddstreamer USER`\n' +
                        '`!lbaddstreamers U1, U2`\n' +
                        '`!lbremovestreamer USER`\n' +
                        '`!lbstats USER`',
                    inline: true
                },
                {
                    name: '🎂 Birthdays',
                    value: '`!lbaddbday @USER MM/DD`\n' +
                        '`!lbremovebday @USER`',
                    inline: true
                },
                {
                    name: '⭐ XP & Streaks',
                    value: '`!lbgrantxp @USER 100`\n' +
                        '`!lbresetxp @USER`\n' +
                        '`!lbfreezestreaks on|off`',
                    inline: true
                },
                {
                    name: '📢 Ads',
                    value: '`!lbremovead @USER 1|2`',
                    inline: true
                },
                {
                    name: '🎵 Music',
                    value: '`!lbforceskip` • `!lbpause`\n' +
                        '`!lbresume` • `!lbstop`\n' +
                        '`!lbclearqueue confirm`\n' +
                        '`!lbremovetrack @USER #`\n' +
                        '`!lbblacklist [URL]`',
                    inline: true
                },
                {
                    name: '🃏 Wildcard',
                    value: '`!lbreset` - Reset game',
                    inline: true
                }
            )
            .setFooter({ text: 'Admins: !lbadmin' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
