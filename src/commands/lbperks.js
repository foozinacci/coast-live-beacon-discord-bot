/**
 * !lbperks - Perk system information
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbperks',
    description: 'View the Wildcard perk system',
    aliases: ['lbperk'],

    execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🃏 WILDCARD PERK SYSTEM')
            .setDescription('Between rounds, choose between **Game Changers** or **Rewards** perks!\n\nType `!lbperk1` or `!lbperk2` when prompted. **30 second timer!**')
            .addFields(
                {
                    name: '⚡ GAME CHANGERS (!lbperk1)', value:
                        `💫 **Second Life** - Respawn at 25% HP\n🎯 **Accuracy+** - +5% accuracy\n💨 **Evasion+** - +5% evasion\n⚔️ **Damage+** - +5% damage\n❤️ **Health+** - +5% max HP`, inline: true
                },
                {
                    name: '💰 REWARDS (!lbperk2)', value:
                        `📜 **CONTRACT** - XP for conditions met\n📈 **MOMENTUM** - +10% XP/round\n🎲 **ALL IN** - Bet all XP (2x or lose)\n👥 **TEAM XP** - Team +5% XP\n☠️ **XP PIRATE** - Damage → XP`, inline: true
                },
                { name: '\u200b', value: '\u200b', inline: false },
                {
                    name: '📋 RULES', value:
                        `• Perks are shown each round with !lbperk1 vs !lbperk2\n• Once a perk appears, it's removed from pool for that match\n• No response = **-10 HP penalty**\n• All perks reset each new match`
                }
            )
            .setFooter({ text: 'Wildcard Perk Guide | !lbgamehelp for full rules' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
