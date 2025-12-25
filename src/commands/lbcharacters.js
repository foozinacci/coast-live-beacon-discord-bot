/**
 * !lbcharacters - View all available classes (updated for V2)
 */
const { CLASSES } = require('../services/wildcardGameV2');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lbcharacters',
    description: 'View all Wildcard classes',
    aliases: ['lbclasses', 'lbclass'],

    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🎭 WILDCARD - Classes')
            .setDescription('Classes are **randomly assigned** at game start based on team composition rules.\n\n*Use `!lb<classname>` for details (e.g., `!lbsupport`)*')
            .setTimestamp();

        // Pentagon overview
        embed.addFields({
            name: '⭐ PENTAGON BALANCE',
            value: '⚪ Support → 🟣 Controller → 🔴 Assault → 🔵 Recon → 🟢 Skirmisher → ⚪ Support\n*Each class counters 2 others and is countered by 2 others.*',
            inline: false
        });

        // Class summaries
        Object.entries(CLASSES).forEach(([key, cls]) => {
            embed.addFields({
                name: `${cls.emoji} ${cls.name}`,
                value: `**HP:** ${cls.hp} | **ACC:** ${Math.round(cls.accuracy * 100)}% | **EVA:** ${Math.round(cls.evasion * 100)}%\n**Execute:** ${Math.round(cls.execute * 100)}% | **Momentum:** ${cls.momentum}\n✅ ${cls.counters} | ❌ ${cls.counteredBy}`,
                inline: true
            });
        });

        embed.setFooter({ text: 'Wildcard Class Guide | !lbperks for perk info' });

        return message.reply({ embeds: [embed] });
    }
};
