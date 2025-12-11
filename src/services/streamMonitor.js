const { EmbedBuilder } = require('discord.js');
const TwitchClient = require('../api/twitchClient');
const StreamerStorage = require('../utils/streamerStorage');

class StreamMonitor {
  constructor(client) {
    this.client = client;
    this.twitchClient = new TwitchClient();
    this.streamerStorage = new StreamerStorage();
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
      const streamers = this.streamerStorage.getStreamers();

      if (streamers.length === 0) {
        return;
      }

      const liveStreams = await this.twitchClient.getStreams(streamers);

      const currentlyLive = new Set(liveStreams.map(stream => stream.user_login.toLowerCase()));

      for (const stream of liveStreams) {
        const userLogin = stream.user_login.toLowerCase();

        if (!this.liveStreams.has(userLogin)) {
          await this.sendNotification(stream);
          this.liveStreams.add(userLogin);
        }
      }

      for (const userLogin of this.liveStreams) {
        if (!currentlyLive.has(userLogin)) {
          this.liveStreams.delete(userLogin);
          console.log(`📴 ${userLogin} went offline`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking streams:', error);
    }
  }

  async sendNotification(stream) {
    try {
      const channelId = process.env.NOTIFICATION_CHANNEL_ID;
      const roleId = process.env.WIZARDS_ROLE_ID;

      if (!channelId) {
        console.error('❌ NOTIFICATION_CHANNEL_ID not set in .env');
        return;
      }

      const channel = await this.client.channels.fetch(channelId);

      if (!channel) {
        console.error('❌ Could not find notification channel');
        return;
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

      const message = roleId ? `<@&${roleId}> ${stream.user_name} is live!` : `${stream.user_name} is live!`;

      await channel.send({
        content: message,
        embeds: [embed],
      });

      console.log(`✅ Notification sent for ${stream.user_name}`);
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }
}

module.exports = StreamMonitor;
