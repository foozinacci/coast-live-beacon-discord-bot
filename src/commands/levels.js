const { EmbedBuilder } = require('discord.js');
const XPStorage = require('../utils/xpStorage');

module.exports = {
    name: 'levels',
    description: 'View XP leaderboard',
    async execute(message, args) {
        const storage = new XPStorage();
        const leaderboard = storage.getLeaderboard(message.guild.id, 10);

        if (leaderboard.length === 0) {
            return message.reply('📊 No XP data yet! Be active to earn XP.');
        }

        const lines = await Promise.all(leaderboard.map(async (entry, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
            let username = 'Unknown';
            try {
                const member = await message.guild.members.fetch(entry.userId);
                username = member.user.username;
            } catch (e) { }
            return medal + ' **' + username + '** — Lvl ' + entry.level + ' (' + entry.totalXP + ' XP)';
        }));

        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('⭐ XP Leaderboard')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Use !level to see your progress' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
