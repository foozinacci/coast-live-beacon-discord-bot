/**
 * !lbpick - Legacy character pick command (V2: classes are auto-assigned)
 */
const { CLASSES } = require('../services/wildcardGameV2');

module.exports = {
    name: 'lbpick',
    description: 'View class information (classes are auto-assigned in V2)',
    async execute(message, args) {
        if (args.length === 0) {
            // Show available classes
            let classList = '🎭 **Wildcard Classes:**\n\n';
            Object.entries(CLASSES).forEach(([key, cls]) => {
                classList += `${cls.emoji} **${cls.name}** - ${cls.description}\n`;
                classList += `   └ *Counters: ${cls.counters}*\n\n`;
            });
            classList += '\n⚠️ **Note:** Classes are now auto-assigned at game start!\n';
            classList += 'Use `!lb<classname>` for detailed info (e.g., `!lbsupport`)';
            return message.reply(classList);
        }

        // If they try to pick a specific class, explain the new system
        const classKey = args[0].toLowerCase();
        if (CLASSES[classKey]) {
            const cls = CLASSES[classKey];
            return message.reply(
                `${cls.emoji} **${cls.name}**\n\n` +
                `Classes are now **auto-assigned** at game start based on team composition rules.\n` +
                `Use \`!lb${classKey}\` for full details on this class!`
            );
        }

        return message.reply('❌ Unknown class! Use `!lbcharacters` to see all classes.');
    }
};
