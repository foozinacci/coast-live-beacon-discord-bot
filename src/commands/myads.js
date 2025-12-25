const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'lbmyads',
    description: 'View and manage your scheduled ads',
    async execute(message, args) {
        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;
        const userId = message.author.id;
        const action = args[0]?.toLowerCase();

        const userAds = storage.getUserAds(guildId, userId);

        // Remove action
        if (action === 'remove' || action === 'delete') {
            const index = parseInt(args[1]);

            if (!index || isNaN(index)) {
                return message.reply('❌ Please specify which ad to remove: `!myads remove 1` or `!myads remove 2`');
            }

            const result = storage.removeUserAd(guildId, userId, index);

            if (!result.success) {
                return message.reply(`❌ ${result.error}`);
            }

            return message.reply(`✅ Removed ad #${index}: **${result.removed.name}** (${result.removed.scheduledTime})`);
        }

        // Default: show ads
        if (userAds.length === 0) {
            return message.reply('📢 You have no scheduled ads.\n\nUse `!addad <HH:MM> <url> <message>` to create one!');
        }

        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('📢 Your Scheduled Ads')
            .setDescription(userAds.map((ad, i) => {
                const lastPosted = ad.lastPosted
                    ? `Last posted: ${new Date(ad.lastPosted).toLocaleDateString()}`
                    : 'Never posted yet';
                return `**${i + 1}.** ⏰ ${ad.scheduledTime} daily\n` +
                    `   🔗 [${ad.name}](${ad.url})\n` +
                    `   📝 ${ad.description || '*No message*'}\n` +
                    `   *${lastPosted}*`;
            }).join('\n\n'))
            .addFields({
                name: '🗑️ Remove an Ad',
                value: '`!myads remove 1` or `!myads remove 2`',
                inline: false
            })
            .setFooter({ text: `${userAds.length}/2 ad slots used` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
