/**
 * !lbrecon - Recon class information
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbrecon',
    description: 'View Recon class stats and abilities',
    aliases: ['lbrec'],

    execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#0066FF')
            .setTitle('🔵 RECON CLASS')
            .setDescription('*Precision specialist with disruption abilities*')
            .addFields(
                {
                    name: '📊 STATS', value:
                        `**HP:** 87\n**Accuracy:** 91%\n**Evasion:** 4%\n**Execute:** 16%\n**Momentum:** 5\n**Hitbox:** 1.02`, inline: true
                },
                {
                    name: '⚔️ COMBAT ROLE', value:
                        `Recon excels at picking off enemies with precision shots and disrupting targets with low execute chance. Gains evasion when attacking.`, inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '✅ COUNTERS', value: '🟣 Controller\n🟢 Skirmisher', inline: true },
                { name: '❌ COUNTERED BY', value: '⚪ Support\n🔴 Assault', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '💡 PERKS', value:
                        `**Disrupt** - Chance to stun targets with low execute chance\n**Precision** - +4% evasion bonus when attacking`
                }
            )
            .setFooter({ text: 'Wildcard Class Guide | !lbcharacters for all classes' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
