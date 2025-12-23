const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'modhelp',
    description: 'Show moderator commands',
    async execute(message, args) {
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Mods only. Use `!help` for public commands.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🛡️ LIVE BEACON - Mod Commands')
            .addFields(
                {
                    name: '📺 Streamers',
                    value: '`!addstreamer USER`\n' +
                        '`!addstreamers U1, U2.`\n' +
                        '`!removestreamer USER`\n' +
                        '`!stats USER`',
                    inline: true
                },
                {
                    name: '🎂 Birthdays',
                    value: '`!addbirthday @USER MM/DD/YYYY`\n' +
                        '`!removebirthday @USER`',
                    inline: true
                },
                {
                    name: '⭐ XP & Streaks',
                    value: '`!grantxp @USER 100`\n' +
                        '`!resetxp @USER`\n' +
                        '`!freezestreaks on|off`',
                    inline: true
                },
                {
                    name: '📢 Ads',
                    value: '`!removead @USER 1|2`',
                    inline: true
                },
                {
                    name: '🎵 Music',
                    value: '`!forceskip` • `!pausemusic`\n' +
                        '`!resumemusic` • `!stop`\n' +
                        '`!clearqueue confirm`\n' +
                        '`!removetrack @USER [#]`\n' +
                        '`!blacklist [URL]`\n' +
                        '`!musicstatus`',
                    inline: true
                }
            )
            .setFooter({ text: 'Admins: !adminhelp' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
