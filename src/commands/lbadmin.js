const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbadmin',
    description: 'Show admin commands',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Admins only.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👑 LIVE BEACON - Admin Commands')
            .addFields(
                {
                    name: '🔐 Twitch Integration',
                    value: '`!lblinktwitch` - Link channel\n' +
                        '`!lbunlinktwitch` - Remove link\n' +
                        '`!lbtwitchstatus` - View status',
                    inline: true
                },
                {
                    name: '⚙️ Setup',
                    value: '`!lbsetup` - First-time wizard\n' +
                        '`!lbsetchannel` - Go-live channel\n' +
                        '`!lbsetupdates` - Summaries\n' +
                        '`!lbsetannounce` - Announcements\n' +
                        '`!lbsetmusic` - Music channel\n' +
                        '`!lbsetrole @ROLE`',
                    inline: true
                },
                {
                    name: '💾 Data',
                    value: '`!lbconfig` - View settings\n' +
                        '`!lbbackup` - Manage backups\n' +
                        '`!lbclearbdays confirm`',
                    inline: true
                },
                {
                    name: '🃏 Game',
                    value: '`!lbsetgame` - Set game channel',
                    inline: true
                }
            )
            .setFooter({ text: '🔐 Connection persists through restarts' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
