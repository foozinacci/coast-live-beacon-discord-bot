const { EmbedBuilder } = require('discord.js');
const BackupManager = require('../utils/backupManager');

module.exports = {
    name: 'backup',
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
                        return `**${i + 1}.** \`${b.name}\`\n   📅 ${date} • ${b.files} files`;
                    }).join('\n\n')
                )
                .setFooter({ text: 'Use !backup restore <name> to restore' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } else if (action === 'create') {
            const reason = args[1] || 'manual';
            const backupName = backupManager.createBackup(reason);

            if (backupName) {
                return message.reply(`✅ Backup created: \`${backupName}\``);
            } else {
                return message.reply('❌ Failed to create backup. Check console for errors.');
            }

        } else if (action === 'restore') {
            const backupName = args[1];

            if (!backupName) {
                const latest = backupManager.getLatestBackup();
                if (latest) {
                    return message.reply(`❌ Please specify a backup name.\n\n**Latest backup:** \`${latest.name}\`\n\nUsage: \`!backup restore ${latest.name}\``);
                }
                return message.reply('❌ No backups available to restore.');
            }

            const success = backupManager.restoreBackup(backupName);

            if (success) {
                return message.reply(`✅ Restored from backup: \`${backupName}\`\n\n⚠️ **Restart the bot** for changes to take effect.`);
            } else {
                return message.reply(`❌ Failed to restore backup. Make sure the name is correct.`);
            }

        } else {
            return message.reply(`❌ Unknown action: \`${action}\`\n\n**Usage:**\n• \`!backup\` - List backups\n• \`!backup create [reason]\` - Create backup\n• \`!backup restore <name>\` - Restore backup`);
        }
    },
};
