const { EmbedBuilder } = require('discord.js');
const StreakStorage = require('../utils/streakStorage');

module.exports = {
    name: 'lbstreak',
    description: 'View your streaks',
    async execute(message, args) {
        const storage = new StreakStorage();

        // Check for mod viewing another user
        let targetUser = message.author;
        if (args[0] && args[0].startsWith('<@')) {
            const isMod = message.member.permissions.has('ManageMessages') ||
                message.member.permissions.has('Administrator');
            if (!isMod) {
                return message.reply('❌ Only mods can view other users\' streaks.');
            }
            const match = args[0].match(/<@!?(\d+)>/);
            if (match) {
                try {
                    const member = await message.guild.members.fetch(match[1]);
                    targetUser = member.user;
                } catch (e) {
                    return message.reply('❌ User not found.');
                }
            }
        }

        const streaks = storage.getUserStreaks(message.guild.id, targetUser.id);
        const rewards = storage.getRewards(streaks.dailyVisit.current);

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🔥 ' + targetUser.username + '\'s Streaks')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '📅 Daily Visit',
                    value: '**' + streaks.dailyVisit.current + '** days\n' +
                        'Best: ' + streaks.dailyVisit.longest + ' days',
                    inline: true
                },
                {
                    name: '📺 Stream Watcher',
                    value: '**' + streaks.streamWatcher.current + '** streams\n' +
                        'Best: ' + streaks.streamWatcher.longest,
                    inline: true
                },
                {
                    name: '🎂 Birthday Wisher',
                    value: '**' + streaks.birthdayWisher.current + '**\n' +
                        'Best: ' + streaks.birthdayWisher.longest,
                    inline: true
                },
                {
                    name: '🎵 Queue Contributor',
                    value: '**' + streaks.queueContributor.current + '** plays\n' +
                        'Best: ' + streaks.queueContributor.longest,
                    inline: true
                }
            );

        if (rewards.length > 0) {
            embed.addFields({
                name: '🏆 Unlocked Rewards',
                value: rewards.map(r => '• ' + r).join('\n'),
                inline: false
            });
        }

        // Next reward
        const current = streaks.dailyVisit.current;
        let nextReward = null;
        if (current < 7) nextReward = { days: 7, reward: '+1 swap/hr' };
        else if (current < 30) nextReward = { days: 30, reward: '+1 track slot' };
        else if (current < 100) nextReward = { days: 100, reward: 'custom role color' };
        else if (current < 365) nextReward = { days: 365, reward: 'skip immunity' };

        if (nextReward) {
            embed.addFields({
                name: '⏳ Next Reward',
                value: nextReward.days + ' days → ' + nextReward.reward + ' (' + (nextReward.days - current) + ' to go)',
                inline: false
            });
        }

        embed.setFooter({ text: streaks.frozen ? '❄️ Streaks frozen' : '🔥 Keep the streak alive!' });
        embed.setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
