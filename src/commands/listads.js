const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'listads',
    description: 'View all promotional ads configured for this server',
    async execute(message, args) {
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Only moderators can view ads.');
        }

        const storage = new AnnouncementStorage();
        const guildAds = storage.getGuildAds(message.guild.id);
        const globalAds = storage.getPromotionalAds();

        if (guildAds.length === 0 && globalAds.length === 0) {
            return message.reply('📢 No promotional ads configured!\n\nUse `!addad <name> <url> [description]` to add one.');
        }

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('📢 Promotional Ads')
            .setTimestamp();

        if (guildAds.length > 0) {
            const guildAdsList = guildAds.map((ad, i) =>
                `**${i + 1}.** [${ad.name}](${ad.url})${ad.description ? `\n   └ ${ad.description}` : ''}`
            ).join('\n\n');

            embed.addFields({
                name: '🏠 Server Ads',
                value: guildAdsList,
                inline: false
            });
        }

        if (globalAds.length > 0) {
            const globalAdsList = globalAds.map((ad, i) =>
                `**${i + 1}.** [${ad.name}](${ad.url})${ad.description ? `\n   └ ${ad.description}` : ''}`
            ).join('\n\n');

            embed.addFields({
                name: '🌐 Global Ads (All Servers)',
                value: globalAdsList,
                inline: false
            });
        }

        embed.setFooter({ text: `${guildAds.length} server ads • ${globalAds.length} global ads` });

        return message.reply({ embeds: [embed] });
    },
};
