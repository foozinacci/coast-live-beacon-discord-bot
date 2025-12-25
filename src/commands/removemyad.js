const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'lbremovead',
    description: 'Remove one of your scheduled ads',
    async execute(message, args) {
        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;
        const userId = message.author.id;

        const index = parseInt(args[0]);

        if (!index || isNaN(index) || index < 1 || index > 2) {
            const userAds = storage.getUserAds(guildId, userId);

            if (userAds.length === 0) {
                return message.reply('📢 You have no ads to remove.');
            }

            return message.reply(
                '❌ Please specify which ad to remove:\n\n' +
                userAds.map((ad, i) => `\`!removemyad ${i + 1}\` - ${ad.name} (${ad.scheduledTime})`).join('\n')
            );
        }

        const result = storage.removeUserAd(guildId, userId, index);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        return message.reply(`✅ Removed ad #${index}: **${result.removed.name}** (${result.removed.scheduledTime})`);
    },
};
