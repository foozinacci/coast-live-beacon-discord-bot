const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');
const StreamerStorage = require('../utils/streamerStorage');
const AnalyticsStorage = require('../utils/analyticsStorage');

class BirthdayAnnouncer {
    constructor(client) {
        this.client = client;
        this.announcementStorage = new AnnouncementStorage();
        this.streamerStorage = new StreamerStorage();
        this.analyticsStorage = new AnalyticsStorage();
        this.checkInterval = null;
        this.lastCheckedDate = null;
    }

    async start() {
        console.log('🎂 Birthday announcer starting...');

        // Check every hour, but only announce once per day
        this.checkInterval = setInterval(async () => {
            await this.checkBirthdays();
        }, 60 * 60 * 1000); // Every hour

        // Do initial check
        await this.checkBirthdays();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            console.log('🎂 Birthday announcer stopped');
        }
    }

    async checkBirthdays() {
        const today = new Date();
        const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;

        // Only check once per day
        if (this.lastCheckedDate === todayStr) {
            return;
        }

        console.log(`🎂 Checking birthdays for ${todayStr}...`);
        this.lastCheckedDate = todayStr;

        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Get all configured guilds
        const configuredGuilds = this.announcementStorage.getAllConfiguredGuilds();

        for (const guildConfig of configuredGuilds) {
            try {
                const { guildId, announcementsChannelId } = guildConfig;

                // Get birthdays for today
                const birthdays = this.announcementStorage.getBirthdaysForDate(guildId, month, day);

                if (birthdays.length === 0) {
                    continue;
                }

                // Get the channel
                const channel = await this.client.channels.fetch(announcementsChannelId);
                if (!channel) {
                    console.error(`❌ Could not find announcements channel ${announcementsChannelId}`);
                    continue;
                }

                // Get the guild
                const guild = await this.client.guilds.fetch(guildId);
                if (!guild) {
                    continue;
                }

                // Announce each birthday
                for (const birthday of birthdays) {
                    await this.announceBirthday(channel, guild, birthday);
                }
            } catch (error) {
                console.error(`❌ Error checking birthdays for guild:`, error.message);
            }
        }
    }

    async announceBirthday(channel, guild, birthdayData) {
        try {
            const { userId, username, birthYear, discordJoinDate } = birthdayData;

            // Try to fetch the member
            let member;
            try {
                member = await guild.members.fetch(userId);
            } catch (error) {
                console.log(`⚠️  Could not find member ${username} (${userId}) for birthday - they may have left`);
                return;
            }

            // Calculate age
            const today = new Date();
            const age = today.getFullYear() - birthYear;

            // Calculate Discord tenure
            const joinDate = new Date(discordJoinDate);
            const tenureMs = today - joinDate;
            const tenureDays = Math.floor(tenureMs / (1000 * 60 * 60 * 24));
            const tenureYears = Math.floor(tenureDays / 365);
            const tenureMonths = Math.floor((tenureDays % 365) / 30);

            let tenureText;
            if (tenureYears > 0) {
                tenureText = `${tenureYears} year${tenureYears === 1 ? '' : 's'}`;
                if (tenureMonths > 0) {
                    tenureText += ` and ${tenureMonths} month${tenureMonths === 1 ? '' : 's'}`;
                }
            } else if (tenureMonths > 0) {
                tenureText = `${tenureMonths} month${tenureMonths === 1 ? '' : 's'}`;
            } else {
                tenureText = `${tenureDays} day${tenureDays === 1 ? '' : 's'}`;
            }

            // Check if they're a streamer and get stats
            const allStreamers = this.streamerStorage.getAllStreamers();
            const isStreamer = allStreamers.some(s => s.toLowerCase() === username.toLowerCase());
            let streamerStats = null;

            if (isStreamer) {
                streamerStats = this.analyticsStorage.getStreamerStats(username.toLowerCase());
            }

            // Build personalized message
            const milestones = [];
            if (age === 18) milestones.push('🎉 Officially an adult!');
            if (age === 21) milestones.push('🍾 The big 21!');
            if (age === 30) milestones.push('💫 Welcome to your 30s!');
            if (age === 40) milestones.push('🌟 Fabulous at 40!');
            if (age === 50) milestones.push('👑 Half a century of awesome!');
            if (age % 10 === 0 && age > 0) milestones.push(`🎯 A perfect ${age}!`);
            if (tenureYears >= 1 && tenureMonths === 0 && tenureDays % 365 < 30) {
                milestones.push(`📅 Also celebrating ${tenureYears} year${tenureYears === 1 ? '' : 's'} in the community!`);
            }

            // Pick a random birthday message
            const messages = [
                `🎂 **HAPPY BIRTHDAY** to our amazing community member **${member.displayName}**! 🎉`,
                `🎈 Everyone wish **${member.displayName}** a fantastic birthday! 🎂`,
                `🥳 It's **${member.displayName}**'s special day! Happy Birthday! 🎁`,
                `🎊 Birthday celebration time! Happy Birthday **${member.displayName}**! 🎂`,
                `🌟 The spotlight is on **${member.displayName}** today! Happy Birthday! 🎉`
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            // Build the embed
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle(`🎂 Happy ${this.getOrdinal(age)} Birthday!`)
                .setDescription(milestones.length > 0 ? milestones.join('\n') : '🎉 Wishing you an amazing day!')
                .setThumbnail(member.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '🎈 Age', value: `${age} years young!`, inline: true },
                    { name: '📅 Community Member', value: `For ${tenureText}`, inline: true }
                );

            // Add streamer stats if applicable
            if (streamerStats) {
                embed.addFields(
                    { name: '📺 Streamer Stats', value: '━━━━━━━━━━━━━━━', inline: false },
                    { name: '🎮 Total Streams', value: streamerStats.totalSessions.toString(), inline: true },
                    { name: '👥 Peak Viewers', value: streamerStats.peakViewers.toString(), inline: true },
                    { name: '⏱️ Total Airtime', value: this.formatDuration(streamerStats.totalDuration), inline: true }
                );

                if (streamerStats.topGames && streamerStats.topGames.length > 0) {
                    embed.addFields({
                        name: '🎮 Top Game',
                        value: streamerStats.topGames[0].game,
                        inline: true
                    });
                }
            }

            // Add a random promotional ad sometimes (30% chance)
            const guildAds = this.announcementStorage.getGuildAds(guild.id);
            const globalAds = this.announcementStorage.getPromotionalAds();
            const allAds = [...guildAds, ...globalAds];

            if (allAds.length > 0 && Math.random() < 0.3) {
                const randomAd = allAds[Math.floor(Math.random() * allAds.length)];
                embed.addFields({
                    name: '📢 Check Out',
                    value: `[${randomAd.name}](${randomAd.url})${randomAd.description ? ` - ${randomAd.description}` : ''}`,
                    inline: false
                });
            }

            embed.setTimestamp()
                .setFooter({ text: 'LIVE BEACON Birthday Celebrations 🎂' });

            // Send the announcement
            await channel.send({
                content: `${randomMessage}\n<@${userId}>`,
                embeds: [embed]
            });

            console.log(`🎂 Birthday announced for ${username} in guild ${guild.name}`);

        } catch (error) {
            console.error(`❌ Error announcing birthday:`, error.message);
        }
    }

    getOrdinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    formatDuration(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    }
}

module.exports = BirthdayAnnouncer;
