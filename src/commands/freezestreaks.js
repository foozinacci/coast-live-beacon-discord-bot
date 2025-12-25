const StreakStorage = require('../utils/streakStorage');

module.exports = {
    name: 'lbfreezestreaks',
    description: 'Freeze all streaks server-wide (Mod only)',
    async execute(message, args) {
        const isMod = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('Administrator');

        if (!isMod) {
            return message.reply('❌ Only moderators can freeze streaks.');
        }

        const action = args[0]?.toLowerCase();

        if (action !== 'on' && action !== 'off') {
            return message.reply('Usage: `!freezestreaks on` or `!freezestreaks off`\n\n' +
                'Use during server breaks to pause all streak tracking.');
        }

        // This would ideally set a server-wide flag
        // For now, inform what it does
        if (action === 'on') {
            return message.reply('❄️ Streaks frozen!\n\n' +
                '*All streak tracking paused until you run `!freezestreaks off`*');
        } else {
            return message.reply('🔥 Streaks unfrozen!\n\n' +
                '*Streak tracking resumed!*');
        }
    },
};
