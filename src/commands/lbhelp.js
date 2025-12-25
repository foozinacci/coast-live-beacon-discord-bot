const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbhelp',
    description: 'Show public commands',
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('🗼 LIVE BEACON - Commands')
            .setDescription('All commands start with `!lb` for consistency across Discord & Twitch.')
            .addFields(
                {
                    name: '📺 Streams',
                    value: '`!lblive` - Who\'s streaming\n' +
                        '`!lbstreamers` - Monitored list',
                    inline: true
                },
                {
                    name: '🎂 Birthdays',
                    value: '`!lbbday MM/DD/YYYY`\n' +
                        '`!lbremovebday`\n' +
                        '`!lbbdays` - View all',
                    inline: true
                },
                {
                    name: '📢 Your Ads (2 max)',
                    value: '`!lbad HH:MM [URL]`\n' +
                        '`!lbmyads` - View yours\n' +
                        '`!lbremovead 1|2`',
                    inline: true
                },
                {
                    name: '🔥 Engagement',
                    value: '`!lbstreak` - Your streaks\n' +
                        '`!lbstreaks` - Leaderboard\n' +
                        '`!lblevel` - Your XP\n' +
                        '`!lblevels` - XP board',
                    inline: true
                },
                {
                    name: '🎵 Music',
                    value: '`!lbsr [URL]` - Request\n' +
                        '`!lbplay` - Start\n' +
                        '`!lbqueue` • `!lbmyqueue`\n' +
                        '`!lbnp` • `!lbskip`',
                    inline: true
                },
                {
                    name: '👤 Profile',
                    value: '`!lbprofile` - View yours\n' +
                        '`!lbsetprofile`',
                    inline: true
                },
                {
                    name: '🃏 Wildcard Game',
                    value: '`!lbjoin` - Join lobby\n' +
                        '`!lbready` - Ready up\n' +
                        '`!lbpick` - Pick character\n' +
                        '`!lbgame` - Game status\n' +
                        '`!lbcharacters` - View all',
                    inline: true
                }
            )
            .setFooter({ text: '!lbmodhelp • !lbadmin • !lbgamehelp • !lbtwitch' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
