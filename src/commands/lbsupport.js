/**
 * !lbsupport - Support class information
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbsupport',
    description: 'View Support class stats and abilities',
    aliases: ['lbsup'],

    execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setTitle('⚪ SUPPORT CLASS')
            .setDescription('*Team sustain specialist with Second Chance respawn*')
            .addFields(
                {
                    name: '📊 STATS', value:
                        `**HP:** 88\n**Accuracy:** 93%\n**Evasion:** 5%\n**Execute:** 0%\n**Momentum:** 10\n**Hitbox:** 1.00`, inline: true
                },
                {
                    name: '⚔️ COMBAT ROLE', value:
                        `Support excels at team sustain with the unique **Second Chance** ability - respawning once per match at 50% HP when eliminated.`, inline: true
                },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '✅ COUNTERS', value: '🟣 Controller\n🔵 Recon', inline: true },
                { name: '❌ COUNTERED BY', value: '🟢 Skirmisher\n🔴 Assault', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '💡 PERKS', value:
                        `**Second Chance** - Respawn once at 50% HP when eliminated\n**Team Aura** - Provides pentagon ally bonuses to teammates`
                }
            )
            .setFooter({ text: 'Wildcard Class Guide | !lbcharacters for all classes' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
