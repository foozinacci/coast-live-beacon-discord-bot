/**
 * !lbgamestats / !lbstats - Wildcard game stats and class overview
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbgamestats',
    description: 'View Wildcard game stats and class relationships',
    aliases: ['lbstats', 'lbwildcardstats'],

    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🃏 WILDCARD - Game Stats & Class Guide')
            .setDescription('**Pentagon Balance System** - Each class counters 2 and is countered by 2.\n\n```\n⚪ Support → 🟣 Controller → 🔴 Assault\n     ↑                              ↓\n🟢 Skirmisher ← 🔵 Recon ←─────────┘\n```')
            .addFields(
                {
                    name: '⚪ SUPPORT',
                    value: '**HP 88** | Dmg 35-38 | Acc 93%\nSecond Chance respawn\n✅ 🟣🔵 | ❌ 🟢🔴',
                    inline: true
                },
                {
                    name: '🟣 CONTROLLER',
                    value: '**HP 67** | Dmg 35-37 | Acc 80%\nSuppress + Anchor\n✅ 🔴🟢 | ❌ ⚪🔵',
                    inline: true
                },
                {
                    name: '🔴 ASSAULT',
                    value: '**HP 89** | Dmg 35-40 | Acc 95%\n22% Execute + Rampage\n✅ ⚪🔵 | ❌ 🟣🟢',
                    inline: true
                },
                {
                    name: '🔵 RECON',
                    value: '**HP 87** | Dmg 35-38 | Acc 91%\nDisrupt + Precision\n✅ 🟣🟢 | ❌ ⚪🔴',
                    inline: true
                },
                {
                    name: '🟢 SKIRMISHER',
                    value: '**HP 83** | Dmg 35-50 | Acc 87%\nBleed + Counter (+30%)\n✅ ⚪🔴 | ❌ 🟣🔵',
                    inline: true
                },
                {
                    name: '📊 KEY STATS',
                    value: '**Accuracy** = Hit chance\n**Evasion** = Dodge chance\n**Execute** = Instakill % on low HP\n**Momentum** = Damage scaling\n**Hitbox** = Size multiplier',
                    inline: true
                },
                {
                    name: '🃏 PERKS (Each Round)',
                    value: '**!lbperk1** = Game Changers (Second Life, +5% stats)\n**!lbperk2** = Rewards (XP bonuses, ALL IN bets)\n*30 seconds to choose, -10 HP if no pick!*',
                    inline: false
                },
                {
                    name: '⚔️ COMBAT RULES',
                    value: '• 3-5 teams of 3 players\n• Classes assigned randomly at game start\n• Max 1 of each class per team\n• Max 3 of each class per lobby\n• 3-team mode: Support+Skirmisher can\'t be on same team',
                    inline: false
                }
            )
            .setFooter({ text: 'Use !lb<class> for detailed stats (e.g., !lbsupport)' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
