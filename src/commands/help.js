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
      value: '`!whoslive` - See who\'s streaming *(in go-live channel)*\n' +
        '`!liststreamer` - View monitored streamers\n' +
        '`!listbirthdays` - Upcoming birthdays\n' +
        '`!help` - This guide',
      inline: false
    });

    // Ad commands (everyone)
    embed.addFields({
      name: '📢 Your Ads (max 2)',
      value: '`!addad <HH:MM> <url> <message>` - Schedule a daily ad\n' +
        '`!myads` - View your ads\n' +
        '`!removemyad 1` or `2` - Remove your ad',
      inline: false
    });

    // Mod commands
    if (isModerator) {
      embed.addFields({
        name: '🔧 Mod: Streamer Management',
        value: '`!addstreamer <username>` - Add Twitch streamer\n' +
          '`!removestreamer <username>` - Remove streamer\n' +
          '`!stats <username>` - View streamer analytics\n' +
          '`!leaderboard [metric]` - Streamer rankings',
        inline: false
      });

      embed.addFields({
        name: '🎂 Mod: Birthday Management',
        value: '`!addbirthday @User MM/DD/YYYY` - Track birthday\n' +
          '`!removebirthday @User` - Remove birthday\n' +
          '`!removead @User [1|2]` - Remove user\'s ads',
        inline: false
      });
    }

    // Admin commands
    if (isAdmin) {
      embed.addFields({
        name: '⚙️ Admin: Setup',
        value: '**Run these in the target channel:**\n' +
          '`!setchannel` - Go-live notifications *(public channel)*\n' +
          '`!setupupdates` - Stream summaries *(mod channel)*\n' +
          '`!setupannouncements` - Birthdays & ads *(announcements)*\n' +
          '`!setrole @Role` - Role to ping on go-live',
        inline: false
      });

      embed.addFields({
        name: '💾 Admin: Data',
        value: '`!backup` - View/create/restore backups\n' +
          '`!config` - View current settings',
        inline: false
      });
    }

    // Detailed help hint
    embed.addFields({
      name: '📚 Detailed Help',
      value: '`!help leaderboard` • `!help stats` • `!help birthday` • `!help ads`',
      inline: false
    });

    const roleText = isAdmin ? '👑 Admin' : isModerator ? '🛡️ Moderator' : '👤 Member';
    embed.setFooter({ text: roleText + ' | LIVE BEACON by COAST' });
    embed.setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  showDetailedHelp(message, topic, isModerator, isAdmin) {
    const helpTopics = {
      leaderboard: {
        title: '🏆 Leaderboard Command',
        description: 'View rankings of your monitored streamers.',
        usage: '`!leaderboard [metric]`',
        options: [
          '`peakviewers` - Highest peak viewers (default)',
          '`avgviewers` - Highest average viewers',
          '`streams` - Most streams tracked',
          '`duration` - Total streaming time'
        ],
        examples: [
          '`!leaderboard` - Peak viewers ranking',
          '`!leaderboard avgviewers` - Average viewers ranking'
        ],
        note: '**Mod only** • Data from tracked streams only.',
        requiresMod: true
      },
      stats: {
        title: '📊 Stats Command',
        description: 'View detailed analytics for a streamer.',
        usage: '`!stats <username>`',
        options: [
          'Total streams tracked',
          'Peak & average viewers',
          'Total streaming time',
          'Top games played'
        ],
        examples: ['`!stats ashlizzlle` - View stats'],
        note: '**Mod only** • Streamer must be monitored.',
        requiresMod: true
      },
      birthday: {
        title: '🎂 Birthday System',
        description: 'Track and celebrate birthdays!',
        usage: '`!addbirthday @User MM/DD/YYYY`',
        options: [
          '`!addbirthday @User 03/15/1995` - Add birthday',
          '`!removebirthday @User` - Remove birthday',
          '`!listbirthdays` - View upcoming (60 days)'
        ],
        examples: ['`!addbirthday @JohnDoe 12/25/2000`'],
        note: '**Mod to add** • Announces in announcements channel with age, tenure, streamer stats!',
        requiresMod: true
      },
      ads: {
        title: '📢 Scheduled Ads',
        description: 'Promote your content with daily posts!',
        usage: '`!addad <HH:MM> <url> <message>`',
        options: [
          'Each user can have **2 ads max**',
          'Ads post **once daily** at your chosen time',
          'Posts to announcements channel'
        ],
        examples: [
          '`!addad 14:30 https://twitch.tv/me Check my stream!`',
          '`!myads` - View your scheduled ads',
          '`!removemyad 1` - Remove ad #1'
        ],
        note: '**Everyone** • Mods can remove with `!removead @User`',
        requiresMod: false
      },
      whoslive: {
        title: '🔴 Who\'s Live',
        description: 'Check who is streaming right now.',
        usage: '`!whoslive`',
        options: [
          'Shows all live streamers',
          'Sorted by viewer count',
          'Clickable Twitch links'
        ],
        examples: ['`!whoslive`'],
        note: '**Public** • Only works in the go-live channel • 10s cooldown',
        requiresMod: false
      }
    };

    const help = helpTopics[topic];

    if (!help) {
      return message.reply('❌ Unknown topic: `' + topic + '`\n\nAvailable: `leaderboard`, `stats`, `birthday`, `ads`, `whoslive`');
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
        { name: '📋 Options', value: help.options.join('\n'), inline: false },
        { name: '💡 Examples', value: help.examples.join('\n'), inline: false },
        { name: '⚠️ Note', value: help.note, inline: false }
      )
      .setFooter({ text: 'LIVE BEACON by COAST' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
