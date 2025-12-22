const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'listads',
    description: 'View all scheduled ads in this server',
    async execute(message, args) {
        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;
        const allUserAds = storage.getAllUserAds(guildId);

        const userIds = Object.keys(allUserAds);

        if (userIds.length === 0) {
            return message.reply('📢 No scheduled ads in this server.\n\nUsers can add ads with `!addad <HH:MM> <url> <message>`');
        }

        // Build list of all ads
        let adList = [];
        let totalAds = 0;

        for (const userId of userIds) {
            const ads = allUserAds[userId];
            for (let i = 0; i < ads.length; i++) {
                const ad = ads[i];
                adList.push({
                    username: ad.username,
                    time: ad.scheduledTime,
                    name: ad.name,
                    url: ad.url,
                    description: ad.description
                });
                totalAds++;
            }
        }

        // Sort by time
        adList.sort((a, b) => a.time.localeCompare(b.time));

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('📢 Scheduled Ads')
            .setDescription(
                adList.map(ad =>
                    `⏰ **${ad.time}** - [${ad.name}](${ad.url})\n   📝 ${ad.description || '*No message*'}\n   👤 ${ad.username}`
                ).join('\n\n')
            )
            .setFooter({ text: `${totalAds} ad(s) from ${userIds.length} user(s) • Posts daily` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
