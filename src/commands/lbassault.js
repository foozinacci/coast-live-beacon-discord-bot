/**
 * !lbassault - Assault class information
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbassault',
    description: 'View Assault class stats and abilities',
    aliases: ['lbass'],

    execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔴 ASSAULT CLASS')
            .setDescription('*Aggressive fighter with high execute chance*')
            .addFields(
                {
                    name: '📊 STATS', value:
                        `**HP:** 89\n**Accuracy:** 95%\n**Evasion:** 8%\n**Execute:** 22%\n**Momentum:** 30\n**Hitbox:** 1.08`, inline: true
                },
                {
                    name: '⚔️ COMBAT ROLE', value:
                        `Assault is the ultimate aggressor with the highest accuracy and execute chance. Momentum fuels powerful damage bonuses.`, inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '✅ COUNTERS', value: '⚪ Support\n🔵 Recon', inline: true },
                { name: '❌ COUNTERED BY', value: '🟣 Controller\n🟢 Skirmisher', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '💡 PERKS', value:
                        `**Rampage** - +30% damage scaling with momentum\n**Execution** - 22% chance to instant-kill low HP targets`
                }
            )
            .setFooter({ text: 'Wildcard Class Guide | !lbcharacters for all classes' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
