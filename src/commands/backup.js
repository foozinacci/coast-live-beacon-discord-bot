const { EmbedBuilder } = require('discord.js');
const BackupManager = require('../utils/backupManager');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'lbbackup',
    description: 'Manage bot data backups',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need Administrator permissions to manage backups.');
        }

        const backupManager = new BackupManager();
        const action = args[0]?.toLowerCase();

        if (!action || action === 'list') {
            // List backups
            const backups = backupManager.listBackups();

            if (backups.length === 0) {
                return message.reply('📂 No backups found.\n\nUse `!backup create` to create one.');
            }

            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle('💾 Available Backups')
                .setDescription(
                    backups.slice(0, 10).map((b, i) => {
                        const date = new Date(b.date).toLocaleString();
                        return '**' + (i + 1) + '.** `' + b.name + '`\n   📅 ' + date + ' • ' + b.files + ' files';
                    }).join('\n\n')
                )
                .addFields({
                    name: '📋 Commands',
                    value: '`!backup view NAME` - See what\'s in a backup\n' +
                        '`!backup restore NAME` - Restore (hot reload)\n' +
                        '`!backup create [reason]` - Create new backup',
                    inline: false
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } else if (action === 'create') {
            const reason = args[1] || 'manual';
            const backupName = backupManager.createBackup(reason);

            if (backupName) {
                return message.reply('✅ Backup created: `' + backupName + '`');
            } else {
                return message.reply('❌ Failed to create backup. Check console for errors.');
            }

        } else if (action === 'view') {
            const backupName = args[1];

            if (!backupName) {
                const latest = backupManager.getLatestBackup();
                if (latest) {
                    return message.reply('❌ Please specify a backup name.\n\n**Latest:** `' + latest.name + '`\n\nUsage: `!backup view ' + latest.name + '`');
                }
                return message.reply('❌ No backups available.');
            }

            const details = backupManager.getBackupDetails(backupName);

            if (!details) {
                return message.reply('❌ Backup not found: `' + backupName + '`');
            }

            const embed = new EmbedBuilder()
                .setColor('#9146FF')
                .setTitle('📦 Backup: ' + backupName)
                .addFields(
                    { name: '📅 Created', value: new Date(details.date).toLocaleString(), inline: true },
                    { name: '📁 Files', value: details.files + ' files', inline: true }
                );

            if (details.guilds) {
                let guildInfo = '';
                for (const [guildId, config] of Object.entries(details.guilds)) {
                    const streamers = config.streamers?.length || 0;
                    const notifChannel = config.notificationChannelId ? '<#' + config.notificationChannelId + '>' : 'Not set';
                    guildInfo += '**Streamers:** ' + streamers + '\n';
                    guildInfo += '**Go-live Channel:** ' + notifChannel + '\n';
                }
                embed.addFields({ name: '📺 Streamer Config', value: guildInfo || 'None', inline: false });
            }

            if (details.announcements) {
                let annInfo = '';
                for (const [guildId, config] of Object.entries(details.announcements)) {
                    const birthdays = Object.keys(config.birthdays || {}).length;
                    const userAds = Object.keys(config.userAds || {}).length;
                    const annChannel = config.announcementsChannelId ? '<#' + config.announcementsChannelId + '>' : 'Not set';
                    annInfo += '**Birthdays:** ' + birthdays + '\n';
                    annInfo += '**User Ads:** ' + userAds + '\n';
                    annInfo += '**Ann. Channel:** ' + annChannel + '\n';
                }
                embed.addFields({ name: '🎂 Announcements Config', value: annInfo || 'None', inline: false });
            }

            if (details.analytics) {
                const streamers = Object.keys(details.analytics.sessions || {}).length;
                const active = Object.keys(details.analytics.activeStreams || {}).length;
                embed.addFields({
                    name: '📊 Analytics',
                    value: '**Tracked Streamers:** ' + streamers + '\n**Active Sessions:** ' + active,
                    inline: false
                });
            }

            embed.setFooter({ text: 'Use !backup restore ' + backupName + ' to apply' });

            return message.reply({ embeds: [embed] });

        } else if (action === 'restore') {
            const backupName = args[1];

            if (!backupName) {
                const latest = backupManager.getLatestBackup();
                if (latest) {
                    return message.reply('❌ Please specify a backup name.\n\n**Latest:** `' + latest.name + '`\n\nUsage: `!backup restore ' + latest.name + '`');
                }
                return message.reply('❌ No backups available to restore.');
            }

            const success = backupManager.restoreBackup(backupName);

            if (success) {
                // Hot reload by clearing require cache for storage modules
                const modulesToReload = [
                    '../utils/streamerStorage',
                    '../utils/announcementStorage',
                    '../utils/analyticsStorage'
                ];

                for (const modulePath of modulesToReload) {
                    const fullPath = require.resolve(modulePath);
                    delete require.cache[fullPath];
                }

                return message.reply('✅ Restored from backup: `' + backupName + '`\n\n' +
                    '🔄 **Hot reloaded!** Changes are now active.\n\n' +
                    '*Note: Stream monitor may need bot restart for full effect.*');
            } else {
                return message.reply('❌ Failed to restore backup. Make sure the name is correct.');
            }

        } else {
            return message.reply('❌ Unknown action: `' + action + '`\n\n' +
                '**Usage:**\n' +
                '• `!backup` - List backups\n' +
                '• `!backup view NAME` - See backup contents\n' +
                '• `!backup create [reason]` - Create backup\n' +
                '• `!backup restore NAME` - Restore backup (hot reload)');
        }
    },
};
