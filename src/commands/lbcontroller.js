/**
 * !lbcontroller - Controller class information
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbcontroller',
    description: 'View Controller class stats and abilities',
    aliases: ['lbctrl', 'lbcon'],

    execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#9146FF')
            .setTitle('🟣 CONTROLLER CLASS')
            .setDescription('*Area denial expert with momentum suppression*')
            .addFields(
                {
                    name: '📊 STATS', value:
                        `**HP:** 67\n**Accuracy:** 80%\n**Evasion:** 0%\n**Execute:** 5%\n**Momentum:** 0\n**Hitbox:** 1.05`, inline: true
                },
                {
                    name: '⚔️ COMBAT ROLE', value:
                        `Controller suppresses high-momentum attackers and is immune to Recon's Disruption ability. Low HP but strong area control.`, inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '✅ COUNTERS', value: '🔴 Assault\n🟢 Skirmisher', inline: true },
                { name: '❌ COUNTERED BY', value: '⚪ Support\n🔵 Recon', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '💡 PERKS', value:
                        `**Suppress** - Enemies suffer momentum penalty when attacking you\n**Anchor** - Immune to Recon Disruption`
                }
            )
            .setFooter({ text: 'Wildcard Class Guide | !lbcharacters for all classes' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
