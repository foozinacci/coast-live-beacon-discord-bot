/**
 * !lbskirmisher - Skirmisher class information
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbskirmisher',
    description: 'View Skirmisher class stats and abilities',
    aliases: ['lbskirm', 'lbsk'],

    execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🟢 SKIRMISHER CLASS')
            .setDescription('*High mobility fighter with bleed effects*')
            .addFields(
                {
                    name: '📊 STATS', value:
                        `**HP:** 83\n**Accuracy:** 87%\n**Evasion:** 8%\n**Execute:** 5%\n**Momentum:** 40\n**Hitbox:** 1.03`, inline: true
                },
                {
                    name: '⚔️ COMBAT ROLE', value:
                        `Skirmisher has the highest momentum for sustained combat. Bleed reduces enemy healing and counter bonus shreds high-accuracy targets.`, inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '✅ COUNTERS', value: '⚪ Support\n🔴 Assault', inline: true },
                { name: '❌ COUNTERED BY', value: '🟣 Controller\n🔵 Recon', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '💡 PERKS', value:
                        `**Bleed** - Attacks reduce enemy healing by 50%\n**Counter** - +30% damage vs high-accuracy targets (≥95%)`
                }
            )
            .setFooter({ text: 'Wildcard Class Guide | !lbcharacters for all classes' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
