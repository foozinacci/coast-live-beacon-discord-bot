const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'addad',
    description: 'Add a scheduled promotional ad (max 2 per user)',
    async execute(message, args) {
        const storage = new AnnouncementStorage();
        const guildId = message.guild.id;

        // Check if announcements channel is set
        const announcementsChannel = storage.getAnnouncementsChannel(guildId);
        if (!announcementsChannel) {
            return message.reply('❌ No announcements channel set! An admin needs to run `!setupannouncements` first.');
        }

        // Show usage if no args
        if (args.length < 3) {
            const userAds = storage.getUserAds(guildId, message.author.id);

            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle('📢 Add a Scheduled Ad')
                .setDescription('Promote your content with a daily scheduled ad!')
                .addFields(
                    {
                        name: '📝 Usage',
                        value: '`!addad <HH:MM> <url> <message>`\n*Time is in 24-hour format*',
                        inline: false
                    },
                    {
                        name: '💡 Examples',
                        value: '`!addad 14:30 https://twitch.tv/mystream Check out my stream!`\n`!addad 20:00 https://youtube.com/c/mychannel New video!`',
                        inline: false
                    },
                    {
                        name: '📊 Your Ads',
                        value: userAds.length === 0
                            ? '*No ads yet (0/2)*'
                            : userAds.map((ad, i) => `**${i + 1}.** ${ad.scheduledTime} - ${ad.name}`).join('\n') + `\n*(${userAds.length}/2)*`,
                        inline: false
                    },
                    {
                        name: '🗑️ Remove an Ad',
                        value: '`!myads remove 1` or `!myads remove 2`',
                        inline: false
                    }
                )
                .setFooter({ text: 'Ads post once per day at your scheduled time' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Parse arguments: !addad HH:MM url message...
        const scheduledTime = args[0];
        const url = args[1];
        const description = args.slice(2).join(' ');

        // Validate URL
        try {
            new URL(url);
        } catch (error) {
            return message.reply('❌ Invalid URL. Make sure it starts with http:// or https://');
        }

        // Extract name from URL
        let name;
        try {
            const urlObj = new URL(url);
            name = urlObj.hostname.replace('www.', '');
        } catch {
            name = 'Link';
        }

        // Add the ad
        const result = storage.addUserAd(
            guildId,
            message.author.id,
            message.author.username,
            name,
            url,
            description,
            scheduledTime
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Ad Scheduled!')
            .addFields(
                { name: '⏰ Time', value: scheduledTime + ' (daily)', inline: true },
                { name: '🔗 URL', value: `[${name}](${url})`, inline: true },
                { name: '📝 Message', value: description || '*No message*', inline: false },
                { name: '📊 Your Ads', value: `${result.count}/2 slots used`, inline: true }
            )
            .setFooter({ text: `Posts in #${message.guild.channels.cache.get(announcementsChannel)?.name || 'announcements'}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
