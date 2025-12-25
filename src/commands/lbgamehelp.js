/**
 * !lbgamehelp - Comprehensive Wildcard game help (V2)
 */
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbgamehelp',
    description: 'View Wildcard game commands and rules',
    aliases: ['lbwildcardhelp'],

    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🃏 WILDCARD - Game Guide')
            .setDescription(
                'A mini battle royale where Twitch and Discord players compete!\n' +
                '**3-5 Teams of 3** • **Pentagon Class System** • **Perk Draft** • **XP Rewards**'
            )
            .addFields(
                {
                    name: '🎮 HOW TO PLAY',
                    value: '1️⃣ `!lbjoin` - Enter the lobby\n' +
                        '2️⃣ 9+ players starts 60s countdown\n' +
                        '3️⃣ Classes auto-assigned at game start\n' +
                        '4️⃣ Each round: `!lbperk1` or `!lbperk2` (30s)\n' +
                        '5️⃣ Combat resolves, teams eliminated\n' +
                        '6️⃣ Last team standing wins!',
                    inline: false
                },
                {
                    name: '📋 COMMANDS',
                    value: '`!lbjoin` - Join lobby\n' +
                        '`!lbleave` - Leave lobby\n' +
                        '`!lbgame` - Game status\n' +
                        '`!lbperk1` - Game changer perk\n' +
                        '`!lbperk2` - Rewards perk\n' +
                        '`!lbcharacters` - View classes\n' +
                        '`!lbperks` - View perk system',
                    inline: true
                },
                {
                    name: '🎭 CLASSES',
                    value: '⚪ **Support** - 88 HP - Second Chance\n' +
                        '🟣 **Controller** - 67 HP - Suppress\n' +
                        '🔴 **Assault** - 89 HP - Execute\n' +
                        '🔵 **Recon** - 87 HP - Disrupt\n' +
                        '🟢 **Skirmisher** - 83 HP - Bleed\n' +
                        '*Use `!lb<class>` for details*',
                    inline: true
                },
                {
                    name: '⭐ PENTAGON BALANCE',
                    value: '```\n⚪ Support → 🟣 Controller → 🔴 Assault\n     ↑                              ↓\n🟢 Skirmisher ← 🔵 Recon ←─────────┘\n```\nEach class counters 2 and is countered by 2.',
                    inline: false
                },
                {
                    name: '🃏 PERKS (Each Round)',
                    value: '**!lbperk1 (Game Changers):** Second Life, +5% stats\n' +
                        '**!lbperk2 (Rewards):** XP bonuses, ALL IN bets\n' +
                        '*No response = -10 HP penalty!*',
                    inline: true
                },
                {
                    name: '⭐ XP REWARDS',
                    value: '🏆 **Winners:** +100 XP\n' +
                        '🎮 **Participants:** +25 XP\n' +
                        '📈 **Perk bonuses apply!**',
                    inline: true
                },
                {
                    name: '📝 RULES',
                    value: '• Max 1 of each class per team\n' +
                        '• Max 3 of each class per lobby\n' +
                        '• 3-team mode: Support+Skirmisher banned together\n' +
                        '• Seat order: 123123123 444 555',
                    inline: false
                }
            )
            .setFooter({ text: 'Mods: !lbreset • Admins: !lbstartgame' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
