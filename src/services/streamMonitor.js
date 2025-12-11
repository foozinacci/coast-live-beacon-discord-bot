const { EmbedBuilder } = require('discord.js');
const TwitchClient = require('../api/twitchClient');
const StreamerStorage = require('../utils/streamerStorage');
const AnalyticsStorage = require('../utils/analyticsStorage');

class StreamMonitor {
  constructor(client) {
    this.client = client;
    this.twitchClient = new TwitchClient();
    this.streamerStorage = new StreamerStorage();
    this.analyticsStorage = new AnalyticsStorage();
    this.liveStreams = new Set();
    this.checkInterval = parseInt(process.env.CHECK_INTERVAL) || 60000;
    this.intervalId = null;
  }

  async start() {
    console.log(`🔄 Stream monitoring starting (checking every ${this.checkInterval / 1000}s)`);

    await this.checkStreams();

    this.intervalId = setInterval(async () => {
      await this.checkStreams();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('⏹️  Stream monitoring stopped');
    }
  }

  async checkStreams() {
    try {
      const allStreamers = this.streamerStorage.getAllStreamers();

      if (allStreamers.length === 0) {
        return;
      }

      const liveStreams = await this.twitchClient.getStreams(allStreamers);

      const currentlyLive = new Set(liveStreams.map(stream => stream.user_login.toLowerCase()));

      for (const stream of liveStreams) {
        const userLogin = stream.user_login.toLowerCase();

        if (!this.liveStreams.has(userLogin)) {
          this.analyticsStorage.startSession(userLogin, stream);
          await this.sendNotifications(stream);
          this.liveStreams.add(userLogin);
        } else {
          this.analyticsStorage.updateSession(userLogin, stream.viewer_count);
        }
      }

      for (const userLogin of this.liveStreams) {
        if (!currentlyLive.has(userLogin)) {
          this.liveStreams.delete(userLogin);
          const session = this.analyticsStorage.endSession(userLogin);
          if (session) {
            console.log(`📴 ${userLogin} went offline - Duration: ${Math.round(session.duration / 1000 / 60)}min, Peak: ${session.peakViewers} viewers`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking streams:', error);
    }
  }

  async sendNotifications(stream) {
    try {
      const allGuilds = this.streamerStorage.getAllGuilds();
      const userLogin = stream.user_login.toLowerCase();

      for (const [guildId, config] of Object.entries(allGuilds)) {
        if (!config.streamers.includes(userLogin)) {
          continue;
        }

        const channelId = config.notificationChannelId;

        if (!channelId) {
          console.log(`⚠️  Guild ${guildId} has no notification channel set for ${stream.user_name}`);
          continue;
        }

        try {
          const channel = await this.client.channels.fetch(channelId);

          if (!channel) {
            console.error(`❌ Could not find channel ${channelId} for guild ${guildId}`);
            continue;
          }

          const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`🔴 ${stream.user_name} is now live!`)
            .setURL(`https://twitch.tv/${stream.user_login}`)
            .setDescription(stream.title || 'No title')
            .addFields(
              { name: '🎮 Game', value: stream.game_name || 'Not specified', inline: true },
              { name: '👥 Viewers', value: stream.viewer_count.toString(), inline: true }
            )
            .setThumbnail(stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248'))
            .setTimestamp()
            .setFooter({ text: 'Twitch' });

          const roleId = config.roleId;
          const message = roleId ? `<@&${roleId}> ${stream.user_name} is live!` : `${stream.user_name} is live!`;

          await channel.send({
            content: message,
            embeds: [embed],
          });

          console.log(`✅ Notification sent for ${stream.user_name} to guild ${guildId}`);
        } catch (error) {
          console.error(`❌ Error sending notification to guild ${guildId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error sending notifications:', error);
    }
  }
}

module.exports = StreamMonitor;
