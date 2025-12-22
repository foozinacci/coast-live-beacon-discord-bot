const { EmbedBuilder } = require('discord.js');
const StreamerStorage = require('../utils/streamerStorage');
const AnnouncementStorage = require('../utils/announcementStorage');
const QueueStorage = require('../utils/queueStorage');

module.exports = {
  name: 'config',
  description: 'View or update server configuration (Admin only)',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Only administrators can view config.');
    }

    const streamerStorage = new StreamerStorage();
    const announcementStorage = new AnnouncementStorage();
    const queueStorage = new QueueStorage();
    const guildId = message.guild.id;

    const streamerConfig = streamerStorage.getGuildConfig(guildId);
    const announcementConfig = announcementStorage.getGuildConfig(guildId);
    const queueConfig = queueStorage.getGuildQueue(guildId);

    // Format channels
    const goLiveChannel = streamerConfig.notificationChannelId
      ? '<#' + streamerConfig.notificationChannelId + '>' : 'Not set';
    const updatesChannel = streamerConfig.updatesChannelId
      ? '<#' + streamerConfig.updatesChannelId + '>' : 'Not set';
    const announcementsChannel = announcementConfig.announcementsChannelId
      ? '<#' + announcementConfig.announcementsChannelId + '>' : 'Not set';
    const musicChannel = queueConfig.musicChannelId
      ? '<#' + queueConfig.musicChannelId + '>' : 'Not set';
    const pingRole = streamerConfig.roleId
      ? '<@&' + streamerConfig.roleId + '>' : 'Not set';

    // Count data
    const streamerCount = streamerConfig.streamers?.length || 0;
    const birthdayCount = Object.keys(announcementConfig.birthdays || {}).length;
    const adCount = Object.keys(announcementConfig.userAds || {}).reduce((sum, userId) => {
      const userAds = announcementConfig.userAds[userId];
      return sum + (userAds ? Object.keys(userAds).length : 0);
    }, 0);
    const queueCount = queueConfig.tracks?.length || 0;

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('⚙️ Server Configuration')
      .addFields(
        {
          name: '📺 Channels',
          value: '**Go-Live:** ' + goLiveChannel + '\n' +
            '**Summaries:** ' + updatesChannel + '\n' +
            '**Announcements:** ' + announcementsChannel + '\n' +
            '**Music:** ' + musicChannel,
          inline: true
        },
        {
          name: '📋 Roles',
          value: '**Ping Role:** ' + pingRole,
          inline: true
        },
        {
          name: '📊 Data',
          value: '**Streamers:** ' + streamerCount + '\n' +
            '**Birthdays:** ' + birthdayCount + '\n' +
            '**Ads:** ' + adCount + '\n' +
            '**Queue:** ' + queueCount + ' tracks',
          inline: true
        }
      )
      .setFooter({ text: 'Use setup commands to modify' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
