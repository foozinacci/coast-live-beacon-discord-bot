const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show setup guide and commands',
  async execute(message, args) {
    const topic = args[0]?.toLowerCase();

    // Check permissions
    const isAdmin = message.member.permissions.has('Administrator');
    const isModerator = isAdmin ||
      message.member.permissions.has('ManageMessages') ||
      message.member.permissions.has('ModerateMembers');

    // Detailed help for specific commands
    if (topic) {
      return this.showDetailedHelp(message, topic, isModerator, isAdmin);
    }

    // Build help based on user permissions
    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('🗼 LIVE BEACON - Command Guide')
      .setDescription(isAdmin
        ? '**Admin View** - Full setup guide and all commands'
        : isModerator
          ? '**Mod View** - Streamer & birthday management'
          : '**User View** - Public commands');

    // Public commands (everyone sees)
    embed.addFields({
      name: '📺 Public Commands',
      value: '`!whoslive` - See who\'s streaming now\n' +
        '`!liststreamer` - View monitored streamers\n' +
        '`!listbirthdays` - Upcoming birthdays\n' +
        '`!help` - This guide',
      inline: false
    });

    // Ad commands (everyone)
    embed.addFields({
      name: '📢 Your Ads (max 2)',
      value: '`!addad 14:30 https://link.com` - Schedule daily ad\n' +
        '`!myads` - View your ads\n' +
        '`!removemyad 1` or `2` - Remove your ad\n' +
        '*Ad time in 24hr format (14:30 = 2:30 PM)*',
      inline: false
    });

    // Mod commands
    if (isModerator) {
      embed.addFields({
        name: '🔧 Mod: Streamers *(run in private channel)*',
        value: '`!addstreamer USER1` - Add single streamer\n' +
          '`!addstreamers USER1, USER2, USER3.` - Add multiple\n' +
          '`!removestreamer USER1` - Remove streamer\n' +
          '`!stats USER1` - View analytics',
        inline: false
      });

      embed.addFields({
        name: '🏆 Mod: Leaderboard',
        value: '`!leaderboard` - Rank by peak viewers\n' +
          '`!leaderboard avgviewers` - Rank by average\n' +
          '`!leaderboard streams` - Rank by stream count\n' +
          '`!leaderboard duration` - Rank by total time',
        inline: false
      });

      embed.addFields({
        name: '🎂 Mod: Birthdays',
        value: '`!addbirthday @User 03/15/1995` - Add birthday\n' +
          '`!removebirthday @User` - Remove birthday',
        inline: false
      });
    }

    // Admin commands
    if (isAdmin) {
      embed.addFields({
        name: '⚙️ Admin: Channel Setup',
        value: '*Run these IN the target channel:*\n' +
          '`!setchannel` - Go-live notifications\n' +
          '`!setupupdates` - Stream summaries (mod-only)\n' +
          '`!setupannouncements` - Birthdays & ads\n' +
          '`!setrole @StreamerRole` - Ping role for go-live',
        inline: false
      });

      embed.addFields({
        name: '💾 Admin: Data',
        value: '`!backup` - View/create/restore backups\n' +
          '`!config` - View current settings\n' +
          '`!removead @User 1|2` - Remove user\'s ad',
        inline: false
      });
    }

    const roleText = isAdmin ? '👑 Admin' : isModerator ? '🛡️ Moderator' : '👤 Member';
    embed.setFooter({ text: roleText + ' | LIVE BEACON by COAST' });
    embed.setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  showDetailedHelp(message, topic, isModerator, isAdmin) {
    const helpTopics = {
      leaderboard: {
        title: '🏆 Leaderboard Command',
        description: 'Rank your monitored streamers by different stats.',
        usage: '`!leaderboard` or `!leaderboard [metric]`',
        options: [
          '**Metrics:**',
          '• `peakviewers` - Highest peak viewers *(default)*',
          '• `avgviewers` - Highest average viewers',
          '• `streams` - Most streams tracked',
          '• `duration` - Longest total stream time'
        ],
        examples: [
          '`!leaderboard` - Top by peak viewers',
          '`!leaderboard avgviewers` - Top by average',
          '`!leaderboard duration` - Who streams most'
        ],
        note: '**Mod only** • Data from tracked streams since bot was added.',
        requiresMod: true
      },
      stats: {
        title: '📊 Stats Command',
        description: 'View detailed analytics for a specific streamer.',
        usage: '`!stats USER1`',
        options: [
          '• Total streams tracked',
          '• Peak & average viewers',
          '• Total streaming time',
          '• Top games played'
        ],
        examples: ['`!stats USER1`'],
        note: '**Mod only** • Streamer must be in your monitored list.',
        requiresMod: true
      },
      birthday: {
        title: '🎂 Birthday System',
        description: 'Track and celebrate birthdays!',
        usage: '`!addbirthday @User MM/DD/YYYY`',
        options: [
          '• **Date format:** MM/DD/YYYY (03/15/1995)',
          '• Announces in announcements channel',
          '• Shows age & server tenure',
          '• Includes streamer stats if applicable!'
        ],
        examples: [
          '`!addbirthday @JohnDoe 12/25/2000`',
          '`!removebirthday @JohnDoe`',
          '`!listbirthdays` - See next 60 days'
        ],
        note: '**Mod to add/remove** • Anyone can view upcoming.',
        requiresMod: true
      },
      ads: {
        title: '📢 Scheduled Ads',
        description: 'Schedule your promo link to post daily!',
        usage: '`!addad HH:MM https://your-link.com`',
        options: [
          '• **Time:** 24-hour format (14:30 = 2:30 PM)',
          '• **Max 2 ads** per user',
          '• Posts once daily at your time',
          '• Posts to announcements channel'
        ],
        examples: [
          '`!addad 14:30 https://twitch.tv/mystream`',
          '`!addad 20:00 https://youtube.com/c/mychannel`',
          '`!myads` - View your ads',
          '`!removemyad 1` - Remove first ad'
        ],
        note: '**Everyone can add** • Mods can remove with `!removead @User`',
        requiresMod: false
      },
      whoslive: {
        title: '🔴 Who\'s Live',
        description: 'Check who is streaming right now.',
        usage: '`!whoslive`',
        options: [
          '• Shows all live streamers',
          '• Sorted by viewer count',
          '• Clickable Twitch links',
          '• **10 second cooldown**'
        ],
        examples: ['`!whoslive`'],
        note: '**Public** • Only works in the go-live channel.',
        requiresMod: false
      },
      streamers: {
        title: '📺 Adding Streamers',
        description: 'How to add Twitch streamers to monitor.',
        usage: '`!addstreamer USER1` or `!addstreamers USER1, USER2.`',
        options: [
          '• **Single:** `!addstreamer USER1`',
          '• **Multiple:** `!addstreamers USER1, USER2, USER3.`',
          '• End bulk list with a period `.`',
          '• **Run in a private/mod channel** to avoid spam'
        ],
        examples: [
          '`!addstreamer twitchusername`',
          '`!addstreamers USER1, USER2, USER3.`',
          '`!removestreamer USER1`'
        ],
        note: '**Mod only** • Validates each username on Twitch.',
        requiresMod: true
      }
    };

    const help = helpTopics[topic];

    if (!help) {
      return message.reply('❌ Unknown topic: `' + topic + '`\n\n**Available:** `leaderboard`, `stats`, `birthday`, `ads`, `whoslive`, `streamers`');
    }

    // Check permissions for mod-only topics
    if (help.requiresMod && !isModerator) {
      return message.reply('❌ You need moderator permissions to view help for `' + topic + '`');
    }

    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle(help.title)
      .setDescription(help.description)
      .addFields(
        { name: '📝 Usage', value: help.usage, inline: false },
        { name: '📋 Details', value: help.options.join('\n'), inline: false },
        { name: '💡 Examples', value: help.examples.join('\n'), inline: false },
        { name: '⚠️ Note', value: help.note, inline: false }
      )
      .setFooter({ text: 'LIVE BEACON by COAST' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
