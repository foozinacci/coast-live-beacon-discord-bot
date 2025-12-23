const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'adminhelp',
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
                    value: '`!linktwitchchat` - Link your Twitch\n' +
                        '`!unlinktwitch` - Remove connection\n' +
                        '`!twitchstatus` - View link status',
                    inline: true
                },
                {
                    name: '⚙️ Setup',
                    value: '`!setup` - First-time wizard\n' +
                        '`!setchannel` - Go-live channel\n' +
                        '`!setupupdates` - Summaries\n' +
                        '`!setupannouncements`\n' +
                        '`!setmusicchannel`\n' +
                        '`!setrole @ROLE`',
                    inline: true
                },
                {
                    name: '💾 Data',
                    value: '`!config` - View settings\n' +
                        '`!backup` - Manage backups\n' +
                        '`!clearbirthdays confirm`',
                    inline: true
                }
            )
            .setFooter({ text: '🔒 OAuth tokens are used once and never stored' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
