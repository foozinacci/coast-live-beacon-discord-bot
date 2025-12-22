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
    this.liveStreams = new Map(); // Changed to Map to store stream data
    this.pendingNotifications = new Map(); // Streams waiting for delayed notification
    this.pendingOffline = new Map(); // Streams waiting for offline confirmation
    this.offlineCooldowns = new Map(); // Prevent rapid on/off spam
    this.checkInterval = parseInt(process.env.CHECK_INTERVAL) || 60000;
    this.notificationDelay = parseInt(process.env.NOTIFICATION_DELAY) || 60000; // 60s default
    this.offlineCooldown = parseInt(process.env.OFFLINE_COOLDOWN) || 120000; // 2min cooldown
    this.offlineConfirmDelay = parseInt(process.env.OFFLINE_CONFIRM_DELAY) || 300000; // 5min default
    this.intervalId = null;
    this.isFirstCheck = true;
  }

  async start() {
    console.log(`🔄 Stream monitoring starting (checking every ${this.checkInterval / 1000}s)`);
    console.log(`⏱️  Notification delay: ${this.notificationDelay / 1000}s | Offline cooldown: ${this.offlineCooldown / 1000}s`);
    console.log(`📊 Stream summary delay: ${this.offlineConfirmDelay / 1000}s (confirms offline before posting)`);

    // Validate configured channels on startup
    await this.validateChannels();

    // Graceful startup: Load active streams from analytics to avoid re-notifying
    await this.syncActiveStreams();

    await this.checkStreams();

    this.intervalId = setInterval(async () => {
      await this.checkStreams();
    }, this.checkInterval);
  }

  /**
   * Validates that all configured notification channels still exist.
   * Logs warnings for any missing channels.
   */
  async validateChannels() {
    try {
      const allGuilds = this.streamerStorage.getAllGuilds();
      let validCount = 0;
      let invalidCount = 0;

      console.log(`📡 Validating notification channels...`);

      for (const [guildId, config] of Object.entries(allGuilds)) {
        const channelId = config.notificationChannelId;

        if (!channelId) {
          continue;
        }

        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel) {
            validCount++;
            console.log(`   ✅ Guild ${guildId}: #${channel.name} (${config.streamers?.length || 0} streamers)`);
          }
        } catch (error) {
          invalidCount++;
          console.log(`   ⚠️  Guild ${guildId}: Channel ${channelId} not accessible - ${error.message}`);
        }
      }

      if (validCount > 0 || invalidCount > 0) {
        console.log(`📡 Channel validation: ${validCount} valid, ${invalidCount} invalid`);
      }
    } catch (error) {
      console.error('⚠️  Error validating channels:', error.message);
    }
  }

  /**
   * Syncs liveStreams with persisted activeStreams from analytics.
   * This prevents re-notifying streamers who were already live before bot restart.
   */
  async syncActiveStreams() {
    try {
      const activeSessions = this.analyticsStorage.getAllActiveSessions();
      const activeCount = Object.keys(activeSessions).length;

      if (activeCount > 0) {
        console.log(`📂 Found ${activeCount} active stream(s) from previous session - syncing...`);

        for (const [userLogin, session] of Object.entries(activeSessions)) {
          this.liveStreams.set(userLogin, {
            startTime: session.startTime,
            game: session.game,
            title: session.title,
            notified: true // Mark as already notified
          });
          console.log(`   ↳ Restored: ${userLogin} (started ${this.formatDuration(Date.now() - session.startTime)} ago)`);
        }
      }
    } catch (error) {
      console.error('⚠️  Error syncing active streams:', error.message);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('⏹️  Stream monitoring stopped');
    }

    // Clear pending notification timeouts
    for (const [userLogin, pending] of this.pendingNotifications) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
    }
    this.pendingNotifications.clear();

    // Clear pending offline timeouts
    for (const [userLogin, pending] of this.pendingOffline) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
    }
    this.pendingOffline.clear();
  }

  async checkStreams() {
    try {
      const allStreamers = this.streamerStorage.getAllStreamers();

      if (allStreamers.length === 0) {
        return;
      }

      const liveStreams = await this.twitchClient.getStreams(allStreamers);
      const currentlyLive = new Set(liveStreams.map(stream => stream.user_login.toLowerCase()));

      // Collect streams that were already live on first check (for condensed summary)
      const alreadyLiveStreams = [];

      // Process live streams
      for (const stream of liveStreams) {
        const userLogin = stream.user_login.toLowerCase();

        // Cancel pending offline if they came back
        if (this.pendingOffline.has(userLogin)) {
          const pending = this.pendingOffline.get(userLogin);
          if (pending.timeoutId) {
            clearTimeout(pending.timeoutId);
          }
          this.pendingOffline.delete(userLogin);
          console.log(`🔙 ${userLogin} came back online - cancelled offline confirmation`);

          // Re-add to live streams (they never really left)
          this.liveStreams.set(userLogin, pending.streamData);
        }

        if (!this.liveStreams.has(userLogin)) {
          // Check offline cooldown
          if (this.isInCooldown(userLogin)) {
            console.log(`⏳ ${userLogin} is in cooldown, skipping notification`);
            continue;
          }

          // New stream detected
          this.analyticsStorage.startSession(userLogin, stream);

          // Store stream info
          this.liveStreams.set(userLogin, {
            startTime: Date.now(),
            game: stream.game_name,
            title: stream.title,
            userName: stream.user_name,
            notified: false
          });

          // On first check after restart, collect for condensed summary instead of individual notifications
          if (this.isFirstCheck) {
            console.log(`🔄 First check: ${stream.user_name} already live, adding to summary`);
            this.liveStreams.get(userLogin).notified = true;
            alreadyLiveStreams.push(stream);
          } else {
            // Schedule delayed notification (only for NEW streams after bot is running)
            this.scheduleNotification(stream);
          }
        } else {
          // Update existing stream
          this.analyticsStorage.updateSession(userLogin, stream.viewer_count);

          // Check for game/title changes (optional logging)
          const storedStream = this.liveStreams.get(userLogin);
          if (storedStream.game !== stream.game_name) {
            console.log(`🎮 ${userLogin} switched game: ${storedStream.game} → ${stream.game_name}`);
            storedStream.game = stream.game_name;
          }
        }
      }

      // On first check, send condensed "Currently Live" summary
      if (this.isFirstCheck && alreadyLiveStreams.length > 0) {
        await this.sendCurrentlyLiveSummary(alreadyLiveStreams);
      }

      // Process offline streams
      for (const [userLogin, streamData] of this.liveStreams) {
        if (!currentlyLive.has(userLogin)) {
          // Move to pending offline instead of immediately ending
          const storedData = this.liveStreams.get(userLogin);
          this.liveStreams.delete(userLogin);

          // Cancel pending notification if they went offline before delay
          if (this.pendingNotifications.has(userLogin)) {
            const pending = this.pendingNotifications.get(userLogin);
            if (pending.timeoutId) {
              clearTimeout(pending.timeoutId);
            }
            this.pendingNotifications.delete(userLogin);
            console.log(`🚫 ${userLogin} went offline before notification delay - cancelled`);
          }

          // Schedule offline confirmation (don't end session yet)
          this.scheduleOfflineConfirmation(userLogin, storedData);
        }
      }

      this.isFirstCheck = false;
    } catch (error) {
      console.error('❌ Error checking streams:', error);
    }
  }

  /**
   * Schedules offline confirmation after 5 minutes.
   * If streamer is still offline, ends session and posts summary.
   */
  scheduleOfflineConfirmation(userLogin, streamData) {
    // Don't double-schedule
    if (this.pendingOffline.has(userLogin)) {
      return;
    }

    console.log(`⏰ ${userLogin} appears offline - confirming in ${this.offlineConfirmDelay / 1000}s...`);

    const timeoutId = setTimeout(async () => {
      try {
        // Re-check if they're still offline
        const streams = await this.twitchClient.getStreams([userLogin]);
        const isStillLive = streams.some(s => s.user_login.toLowerCase() === userLogin);

        if (!isStillLive) {
          // Confirmed offline - end session and post summary
          console.log(`📴 ${userLogin} confirmed offline after ${this.offlineConfirmDelay / 1000}s`);

          // Set cooldown
          this.offlineCooldowns.set(userLogin, Date.now());

          const session = this.analyticsStorage.endSession(userLogin);
          if (session) {
            console.log(`� ${userLogin} stream ended - Duration: ${this.formatDuration(session.duration)}, Peak: ${session.peakViewers} viewers`);

            // Send stream summary to updates channel
            await this.sendStreamSummary(userLogin, session, streamData);
          }
        } else {
          console.log(`🔄 ${userLogin} is back online - was just a brief disconnect`);
          // Re-add to live streams
          this.liveStreams.set(userLogin, streamData);
        }
      } catch (error) {
        console.error(`❌ Error confirming offline status for ${userLogin}:`, error.message);
        // On error, assume offline and end session
        const session = this.analyticsStorage.endSession(userLogin);
        if (session) {
          await this.sendStreamSummary(userLogin, session, streamData);
        }
      } finally {
        this.pendingOffline.delete(userLogin);
      }
    }, this.offlineConfirmDelay);

    this.pendingOffline.set(userLogin, {
      streamData,
      timeoutId,
      offlineAt: Date.now()
    });
  }

  /**
   * Sends a stream summary to the updates channel (mod-only).
   */
  async sendStreamSummary(userLogin, session, streamData) {
    try {
      const allGuilds = this.streamerStorage.getAllGuilds();

      for (const [guildId, config] of Object.entries(allGuilds)) {
        if (!config.streamers.includes(userLogin)) {
          continue;
        }

        const updatesChannelId = config.updatesChannelId;

        if (!updatesChannelId) {
          // No updates channel configured, skip
          continue;
        }

        try {
          const channel = await this.client.channels.fetch(updatesChannelId);

          if (!channel) {
            console.error(`❌ Could not find updates channel ${updatesChannelId} for guild ${guildId}`);
            continue;
          }

          // Calculate stats
          const durationMs = session.duration || (Date.now() - session.startTime);
          const avgViewers = session.viewerSnapshots && session.viewerSnapshots.length > 0
            ? Math.round(session.viewerSnapshots.reduce((sum, s) => sum + s.count, 0) / session.viewerSnapshots.length)
            : session.startViewers || 0;

          // Format start time
          const startDate = new Date(session.startTime);
          const startTimeStr = startDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const embed = new EmbedBuilder()
            .setColor('#808080') // Gray for offline
            .setTitle(`📊 Stream Summary: ${streamData.userName || userLogin}`)
            .setURL(`https://twitch.tv/${userLogin}`)
            .setDescription(`**${session.title || 'No title'}**`)
            .addFields(
              { name: '🎮 Game', value: session.game || 'Unknown', inline: true },
              { name: '⏱️ Duration', value: this.formatDuration(durationMs), inline: true },
              { name: '📅 Started', value: startTimeStr, inline: true },
              { name: '👥 Peak Viewers', value: session.peakViewers?.toString() || '0', inline: true },
              { name: '📈 Avg Viewers', value: avgViewers.toString(), inline: true },
              { name: '🎬 Started With', value: (session.startViewers || 0).toString() + ' viewers', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Stream ended • Twitch Analytics' });

          await channel.send({
            content: `📴 **${streamData.userName || userLogin}** has gone offline.`,
            embeds: [embed],
          });

          console.log(`📊 Stream summary sent for ${userLogin} to guild ${guildId}`);
        } catch (error) {
          console.error(`❌ Error sending stream summary to guild ${guildId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error sending stream summaries:', error);
    }
  }

  /**
   * Sends a condensed "Currently Live" summary on bot restart.
   * Instead of spamming individual notifications, shows one summary embed.
   */
  async sendCurrentlyLiveSummary(streams) {
    if (streams.length === 0) return;

    console.log(`📺 Sending condensed summary for ${streams.length} currently live stream(s)...`);

    try {
      const allGuilds = this.streamerStorage.getAllGuilds();

      for (const [guildId, config] of Object.entries(allGuilds)) {
        const channelId = config.notificationChannelId;

        if (!channelId) {
          continue;
        }

        // Filter streams to only those this guild monitors
        const guildStreams = streams.filter(stream =>
          config.streamers.includes(stream.user_login.toLowerCase())
        );

        if (guildStreams.length === 0) {
          continue;
        }

        try {
          const channel = await this.client.channels.fetch(channelId);

          if (!channel) {
            console.error(`❌ Could not find channel ${channelId} for guild ${guildId}`);
            continue;
          }

          // Build condensed summary embed
          const streamList = guildStreams.map(stream => {
            const gameText = stream.game_name ? ` playing **${stream.game_name}**` : '';
            return `• [**${stream.user_name}**](https://twitch.tv/${stream.user_login})${gameText} - ${stream.viewer_count} viewers`;
          }).join('\n');

          // Group by game for a summary
          const games = {};
          guildStreams.forEach(stream => {
            const game = stream.game_name || 'Unknown';
            games[game] = (games[game] || 0) + 1;
          });

          const totalViewers = guildStreams.reduce((sum, s) => sum + s.viewer_count, 0);
          const avgViewers = Math.round(totalViewers / guildStreams.length);

          const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`📺 Currently Live (${guildStreams.length} stream${guildStreams.length === 1 ? '' : 's'})`)
            .setDescription(`LIVE BEACON just came online! Here's who's currently streaming:\n\n${streamList}`)
            .addFields(
              { name: '👥 Avg Viewers', value: avgViewers.toLocaleString(), inline: true },
              { name: '🎮 Games', value: Object.keys(games).slice(0, 3).join(', ') || 'Various', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bot restarted • Individual notifications will resume for new streams' });

          await channel.send({
            embeds: [embed],
          });

          console.log(`📺 Currently live summary sent to guild ${guildId} (${guildStreams.length} streams)`);
        } catch (error) {
          console.error(`❌ Error sending currently live summary to guild ${guildId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Error sending currently live summaries:', error);
    }
  }

  /**
   * Schedules a notification to be sent after the delay period.
   * This allows time for viewers to join before we report the count.
   */
  scheduleNotification(stream) {
    const userLogin = stream.user_login.toLowerCase();

    console.log(`⏰ Scheduling notification for ${stream.user_name} in ${this.notificationDelay / 1000}s...`);

    const timeoutId = setTimeout(async () => {
      // Re-fetch stream data to get updated viewer count
      try {
        const updatedStreams = await this.twitchClient.getStreams([userLogin]);
        const updatedStream = updatedStreams.find(s => s.user_login.toLowerCase() === userLogin);

        if (updatedStream) {
          await this.sendNotifications(updatedStream);

          // Mark as notified
          const storedStream = this.liveStreams.get(userLogin);
          if (storedStream) {
            storedStream.notified = true;
          }
        } else {
          console.log(`⚠️  ${userLogin} went offline before notification could be sent`);
        }
      } catch (error) {
        console.error(`❌ Error fetching updated stream for ${userLogin}:`, error.message);
        // Fall back to original stream data
        await this.sendNotifications(stream);
      } finally {
        this.pendingNotifications.delete(userLogin);
      }
    }, this.notificationDelay);

    this.pendingNotifications.set(userLogin, {
      stream,
      scheduledAt: Date.now(),
      timeoutId
    });
  }

  /**
   * Checks if a streamer is in cooldown (recently went offline).
   */
  isInCooldown(userLogin) {
    const cooldownStart = this.offlineCooldowns.get(userLogin);
    if (!cooldownStart) return false;

    const elapsed = Date.now() - cooldownStart;
    if (elapsed > this.offlineCooldown) {
      this.offlineCooldowns.delete(userLogin);
      return false;
    }

    return true;
  }

  /**
   * Formats milliseconds to human-readable duration.
   */
  formatDuration(ms) {
    const minutes = Math.round(ms / 1000 / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}min`;
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

          // Cache-bust the thumbnail URL to get a fresh image
          const thumbnailUrl = stream.thumbnail_url
            .replace('{width}', '440')
            .replace('{height}', '248') + `?t=${Date.now()}`;

          const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle(`🔴 ${stream.user_name} is now live!`)
            .setURL(`https://twitch.tv/${stream.user_login}`)
            .setDescription(stream.title || 'No title')
            .addFields(
              { name: '🎮 Game', value: stream.game_name || 'Not specified', inline: true },
              { name: '👥 Viewers', value: stream.viewer_count.toString(), inline: true }
            )
            .setImage(thumbnailUrl) // Changed to setImage for larger preview
            .setTimestamp()
            .setFooter({ text: 'Twitch • Click title to watch' });

          const roleId = config.roleId;
          const message = roleId ? `<@&${roleId}> ${stream.user_name} is live!` : `${stream.user_name} is live!`;

          await channel.send({
            content: message,
            embeds: [embed],
          });

          console.log(`✅ Notification sent for ${stream.user_name} to guild ${guildId} (${stream.viewer_count} viewers)`);
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

