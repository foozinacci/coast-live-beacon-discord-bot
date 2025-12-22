const { EmbedBuilder } = require('discord.js');
const XPStorage = require('../utils/xpStorage');

module.exports = {
    name: 'level',
    description: 'View your level and XP',
    async execute(message, args) {
        const storage = new XPStorage();

        // Check for mod viewing another user
        let targetUser = message.author;
        if (args[0] && args[0].startsWith('<@')) {
            const isMod = message.member.permissions.has('ManageMessages') ||
                message.member.permissions.has('Administrator');
            if (!isMod) {
                return message.reply('❌ Only mods can view other users\' levels.');
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

        const user = storage.getUserXP(message.guild.id, targetUser.id);
        const unlocks = storage.getLevelUnlocks(user.level);
        const nextLevelXP = storage.getXPForNextLevel(user.level);
        const progress = Math.min(100, Math.round((user.totalXP / nextLevelXP) * 100));

        // Progress bar
        const filled = Math.round(progress / 10);
        const empty = 10 - filled;
        const progressBar = '▓'.repeat(filled) + '░'.repeat(empty);

        const embed = new EmbedBuilder()
            .setColor('#00D4AA')
            .setTitle('⭐ Level ' + user.level)
            .setDescription('**' + targetUser.username + '**')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '📊 XP Progress',
                    value: progressBar + ' ' + progress + '%\n' +
                        '**' + user.totalXP + '** / ' + nextLevelXP + ' XP',
                    inline: false
                }
            );

        if (unlocks.length > 0) {
            embed.addFields({
                name: '🏆 Unlocked Perks',
                value: unlocks.map(u => '• ' + u).join('\n'),
                inline: false
            });
        }

        // Next unlock
        const nextUnlocks = {
            5: '+1 ad slot',
            10: '+1 track slot',
            15: 'custom now playing',
            20: '2 swaps/hr',
            25: 'skip immunity',
            30: '+1 track slot',
            50: '🌟 badge'
        };

        const nextLevel = Object.keys(nextUnlocks).map(Number).find(l => l > user.level);
        if (nextLevel) {
            embed.addFields({
                name: '⏳ Next Unlock',
                value: 'Level ' + nextLevel + ' → ' + nextUnlocks[nextLevel],
                inline: false
            });
        }

        embed.setFooter({ text: 'Earn XP by chatting, watching streams, and more!' });
        embed.setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};
