const UserProfileStorage = require('../utils/userProfileStorage');

module.exports = {
    name: 'lbclearprofile',
    description: 'Clear all your social links',
    async execute(message, args) {
        const storage = new UserProfileStorage();
        const cleared = storage.clearProfile(message.guild.id, message.author.id);

        if (cleared) {
            return message.reply('✅ Your profile links have been cleared.');
        } else {
            return message.reply('ℹ️ No profile to clear.');
        }
    },
};
