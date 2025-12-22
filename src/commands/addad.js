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
        if (args.length < 2) {
            const userAds = storage.getUserAds(guildId, message.author.id);

            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle('📢 Add a Scheduled Ad')
                .setDescription('Promote your content with a daily scheduled link!')
                .addFields(
                    {
                        name: '📝 Usage',
                        value: '`!addad HH:MM https://your-link.com`\n*Time is in 24-hour format*',
                        inline: false
                    },
                    {
                        name: '💡 Examples',
                        value: '`!addad 14:30 https://twitch.tv/mystream`\n`!addad 20:00 https://youtube.com/c/mychannel`',
                        inline: false
                    },
                    {
                        name: '⏰ Common Times',
                        value: '`09:00` = 9 AM\n`12:00` = Noon\n`14:30` = 2:30 PM\n`20:00` = 8 PM',
                        inline: true
                    },
                    {
                        name: '📊 Your Ads',
                        value: userAds.length === 0
                            ? '*No ads yet (0/2)*'
                            : userAds.map((ad, i) => `**${i + 1}.** ${ad.scheduledTime} - ${ad.name}`).join('\n') + `\n*(${userAds.length}/2)*`,
                        inline: true
                    }
                )
                .setFooter({ text: 'Ads post once per day at your scheduled time' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Parse arguments: !addad HH:MM url
        const scheduledTime = args[0];
        const url = args[1];

        // Validate time format
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
            return message.reply('❌ Invalid time format. Use `HH:MM` (24-hour)\n\nExamples: `09:00`, `14:30`, `20:00`');
        }

        // Validate URL
        try {
            new URL(url);
        } catch (error) {
            return message.reply('❌ Invalid URL. Make sure it starts with `http://` or `https://`');
        }

        // Extract name from URL for display
        let name;
        try {
            const urlObj = new URL(url);
            // Get a nice display name from the URL
            const host = urlObj.hostname.replace('www.', '');
            const pathName = urlObj.pathname.split('/').filter(p => p)[0];
            name = pathName ? host + '/' + pathName : host;
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
            null, // No separate description - URL is the ad
            scheduledTime
        );

        if (!result.success) {
            return message.reply('❌ ' + result.error);
        }

        const channelName = message.guild.channels.cache.get(announcementsChannel)?.name || 'announcements';

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Ad Scheduled!')
            .setDescription('Your link will be posted daily at **' + scheduledTime + '**')
            .addFields(
                { name: '🔗 Link', value: '[' + name + '](' + url + ')', inline: true },
                { name: '📊 Slots', value: result.count + '/2 used', inline: true },
                { name: '📢 Channel', value: '#' + channelName, inline: true }
            )
            .setFooter({ text: 'Use !myads to view • !removemyad 1 to remove' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
