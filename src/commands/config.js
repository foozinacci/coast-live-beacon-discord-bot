const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
  name: 'config',
  description: 'Show current server configuration',
  async execute(message, args) {
    const storage = new StreamerStorage();
    const announcementStorage = new AnnouncementStorage();
    const guildId = message.guild.id;
    const config = storage.getGuildConfig(guildId);
    const announcementConfig = announcementStorage.getGuildConfig(guildId);

    const channelText = config.notificationChannelId
      ? `<#${config.notificationChannelId}>`
      : '❌ Not set (use `!setchannel`)';

    const roleText = config.roleId
      ? `<@&${config.roleId}>`
      : '❌ Not set (use `!setrole @RoleName`)';

    const updatesText = config.updatesChannelId
      ? `<#${config.updatesChannelId}>`
      : '❌ Not set (use `!setupupdates`)';

    const announcementsText = announcementConfig.announcementsChannelId
      ? `<#${announcementConfig.announcementsChannelId}>`
      : '❌ Not set (use `!setupannouncements`)';

    const streamersText = config.streamers.length > 0
      ? config.streamers.join(', ')
      : 'None (ask a moderator to use `!addstreamer`)';

    const birthdayCount = Object.keys(announcementConfig.birthdays || {}).length;
    const adCount = (announcementConfig.customAds || []).length;

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('⚙️ Server Configuration')
      .addFields(
        { name: '📺 Go-Live Notifications', value: channelText, inline: true },
        { name: '📊 Stream Summaries (Mod)', value: updatesText, inline: true },
        { name: '🎂 Announcements', value: announcementsText, inline: true },
        { name: '👥 Mention Role', value: roleText, inline: true },
        { name: '🎂 Birthdays Tracked', value: birthdayCount.toString(), inline: true },
        { name: '📢 Promo Ads', value: adCount.toString(), inline: true },
        { name: '🎮 Monitored Streamers', value: streamersText, inline: false }
      )
      .setFooter({ text: `Server ID: ${guildId}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};

