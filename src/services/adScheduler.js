const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

class AdScheduler {
    constructor(client) {
        this.client = client;
        this.storage = new AnnouncementStorage();
        this.checkInterval = null;
        this.lastCheckedMinute = null;
    }

    start() {
        console.log('📢 Ad scheduler starting...');

        // Check every 30 seconds to ensure we don't miss a minute
        this.checkInterval = setInterval(() => {
            this.checkScheduledAds();
        }, 30000);

        // Initial check
        this.checkScheduledAds();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            console.log('📢 Ad scheduler stopped');
        }
    }

    async checkScheduledAds() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Don't check the same minute twice
        if (this.lastCheckedMinute === currentTime) {
            return;
        }
        this.lastCheckedMinute = currentTime;

        // Get all configured guilds
        const configuredGuilds = this.storage.getAllConfiguredGuilds();

        for (const guildConfig of configuredGuilds) {
            try {
                const { guildId, announcementsChannelId } = guildConfig;

                if (!announcementsChannelId) continue;

                // Get ads scheduled for this time
                const scheduledAds = this.storage.getAdsForTime(guildId, currentTime);

                if (scheduledAds.length === 0) continue;

                // Get the channel
                const channel = await this.client.channels.fetch(announcementsChannelId);
                if (!channel) {
                    console.error(`❌ Could not find announcements channel ${announcementsChannelId}`);
                    continue;
                }

                // Post each ad
                for (const ad of scheduledAds) {
                    await this.postAd(channel, ad);

                    // Mark as posted
                    this.storage.markAdPosted(guildId, ad.userId, ad.index);

                    // Small delay between ads
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`❌ Error checking scheduled ads:`, error.message);
            }
        }
    }

    async postAd(channel, ad) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle(`📢 ${ad.name}`)
                .setURL(ad.url)
                .setDescription(ad.description || 'Check it out!')
                .addFields(
                    { name: '🔗 Link', value: `[Click here](${ad.url})`, inline: true }
                )
                .setFooter({ text: `Shared by ${ad.username}` })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            console.log(`📢 Posted scheduled ad: ${ad.name} by ${ad.username}`);

        } catch (error) {
            console.error(`❌ Error posting ad:`, error.message);
        }
    }
}

module.exports = AdScheduler;
