const StreamerStorage = require('../utils/streamerStorage');
const BackupManager = require('../utils/backupManager');
const TwitchClient = require('../api/twitchClient');

module.exports = {
    name: 'addstreamers',
    description: 'Add multiple Twitch streamers at once',
    async execute(message, args) {
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Only moderators can add streamers.');
        }

        if (args.length === 0) {
            return message.reply('❌ Usage: `!addstreamers user1, user2, user3.`\n\n*End the list with a period `.`*');
        }

        // Join args and parse the list
        const input = args.join(' ');

        // Check if ends with period
        if (!input.endsWith('.')) {
            return message.reply('❌ End your list with a period `.`\n\nExample: `!addstreamers ninja, shroud, pokimane.`');
        }

        // Remove the period and split by comma
        const rawList = input.slice(0, -1);
        const usernames = rawList.split(',').map(u => u.trim().toLowerCase()).filter(u => u.length > 0);

        if (usernames.length === 0) {
            return message.reply('❌ No usernames found. Use: `!addstreamers user1, user2, user3.`');
        }

        if (usernames.length > 20) {
            return message.reply('❌ Maximum 20 streamers at once. You provided ' + usernames.length + '.');
        }

        const storage = new StreamerStorage();
        const twitchClient = new TwitchClient();
        const guildId = message.guild.id;

        await message.reply('🔍 Validating ' + usernames.length + ' username(s) on Twitch...');

        const results = {
            added: [],
            alreadyExists: [],
            notFound: []
        };

        for (const username of usernames) {
            try {
                const userInfo = await twitchClient.getUserInfo(username);

                if (!userInfo) {
                    results.notFound.push(username);
                    continue;
                }

                const added = storage.addStreamer(guildId, userInfo.login);

                if (added) {
                    results.added.push(userInfo.display_name);
                } else {
                    results.alreadyExists.push(userInfo.display_name);
                }
            } catch (error) {
                results.notFound.push(username);
            }
        }

        // Backup if any were added
        if (results.added.length > 0) {
            const backupManager = new BackupManager();
            backupManager.createBackup('bulk-add-streamers');
        }

        // Build response
        let response = '';

        if (results.added.length > 0) {
            response += '✅ **Added (' + results.added.length + '):** ' + results.added.join(', ') + '\n';
        }

        if (results.alreadyExists.length > 0) {
            response += '⚠️ **Already monitored (' + results.alreadyExists.length + '):** ' + results.alreadyExists.join(', ') + '\n';
        }

        if (results.notFound.length > 0) {
            response += '❌ **Not found on Twitch (' + results.notFound.length + '):** ' + results.notFound.join(', ') + '\n';
        }

        return message.channel.send(response);
    },
};
