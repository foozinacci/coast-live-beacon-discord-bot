const StreamerStorage = require('../utils/streamerStorage');
const AnalyticsStorage = require('../utils/analyticsStorage');
const BackupManager = require('../utils/backupManager');
const TwitchClient = require('../api/twitchClient');

module.exports = {
    name: 'lbaddstreamers',
    description: 'Add multiple Twitch streamers at once',
    async execute(message, args) {
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Only moderators can add streamers.');
        }

        if (args.length === 0) {
            return message.reply('❌ Usage: `!addstreamers USER1, USER2, USER3.`\n\n*End the list with a period `.`*');
        }

        // Join args and parse the list
        const input = args.join(' ');

        // Check if ends with period
        if (!input.endsWith('.')) {
            return message.reply('❌ End your list with a period `.`\n\nExample: `!addstreamers USER1, USER2, USER3.`');
        }

        // Remove the period and split by comma
        const rawList = input.slice(0, -1);
        const usernames = rawList.split(',').map(u => u.trim().toLowerCase()).filter(u => u.length > 0);

        if (usernames.length === 0) {
            return message.reply('❌ No usernames found. Use: `!addstreamers USER1, USER2, USER3.`');
        }

        if (usernames.length > 20) {
            return message.reply('❌ Maximum 20 streamers at once. You provided ' + usernames.length + '.');
        }

        const storage = new StreamerStorage();
        const analyticsStorage = new AnalyticsStorage();
        const twitchClient = new TwitchClient();
        const guildId = message.guild.id;

        await message.reply('🔍 Validating ' + usernames.length + ' username(s)...');

        const results = {
            added: [],
            addedLive: [],
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
                    // Check if they're currently live
                    const streams = await twitchClient.getStreams([userInfo.login]);
                    const isLive = streams && streams.length > 0;

                    if (isLive) {
                        // Pre-seed them to avoid spam notification
                        const stream = streams[0];
                        analyticsStorage.startSession(userInfo.login, {
                            title: stream.title,
                            gameName: stream.game_name,
                            viewerCount: stream.viewer_count,
                            startedAt: stream.started_at
                        });
                        results.addedLive.push(userInfo.display_name);
                    } else {
                        results.added.push(userInfo.display_name);
                    }
                } else {
                    results.alreadyExists.push(userInfo.display_name);
                }
            } catch (error) {
                results.notFound.push(username);
            }
        }

        // Backup if any were added
        const totalAdded = results.added.length + results.addedLive.length;
        if (totalAdded > 0) {
            const backupManager = new BackupManager();
            backupManager.createBackup('bulk-add-streamers');
        }

        // Build response
        let response = '';

        if (results.added.length > 0) {
            response += '✅ **Added (' + results.added.length + '):** ' + results.added.join(', ') + '\n';
        }

        if (results.addedLive.length > 0) {
            response += '🔴 **Added (already live):** ' + results.addedLive.join(', ') + '\n';
        }

        if (results.alreadyExists.length > 0) {
            response += '⚠️ **Already monitored:** ' + results.alreadyExists.join(', ') + '\n';
        }

        if (results.notFound.length > 0) {
            response += '❌ **Not found:** ' + results.notFound.join(', ') + '\n';
        }

        if (results.addedLive.length > 0) {
            response += '\n*Live streamers will not trigger spam notifications.*';
        }

        return message.channel.send(response);
    },
};
