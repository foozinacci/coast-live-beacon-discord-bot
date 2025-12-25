const { EmbedBuilder } = require('discord.js');
const StreakStorage = require('../utils/streakStorage');

module.exports = {
    name: 'lbstreaks',
    description: 'View streak leaderboard',
    async execute(message, args) {
        const storage = new StreakStorage();
        const leaderboard = storage.getLeaderboard(message.guild.id, 'dailyVisit', 10);

        if (leaderboard.length === 0) {
            return message.reply('📊 No streak data yet! Be active to build your streak.');
        }

        const lines = await Promise.all(leaderboard.map(async (entry, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
            let username = 'Unknown';
            try {
                const member = await message.guild.members.fetch(entry.userId);
                username = member.user.username;
            } catch (e) { }
            return medal + ' **' + username + '** — ' + entry.current + ' days (best: ' + entry.longest + ')';
        }));

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🔥 Streak Leaderboard')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Daily visit streaks • Use !streak to see yours' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
