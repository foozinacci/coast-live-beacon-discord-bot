const fs = require('fs');
const path = require('path');

class BackupManager {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.backupDir = path.join(__dirname, '../../data/backups');
        this.maxBackups = 10; // Keep last 10 backups
        this.ensureBackupDir();
    }

    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Creates a timestamped backup of all data files
     */
    createBackup(reason = 'manual') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `backup_${timestamp}_${reason}`;
            const backupPath = path.join(this.backupDir, backupName);

            fs.mkdirSync(backupPath, { recursive: true });

            // Files to backup
            const files = ['guilds.json', 'analytics.json', 'announcements.json'];

            let backedUp = 0;
            for (const file of files) {
                const sourcePath = path.join(this.dataDir, file);
                if (fs.existsSync(sourcePath)) {
                    const destPath = path.join(backupPath, file);
                    fs.copyFileSync(sourcePath, destPath);
                    backedUp++;
                }
            }

            console.log(`💾 Backup created: ${backupName} (${backedUp} files)`);

            // Cleanup old backups
            this.cleanupOldBackups();

            return backupName;
        } catch (error) {
            console.error('❌ Error creating backup:', error.message);
            return null;
        }
    }

    /**
     * Restores from a backup
     */
    restoreBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);

            if (!fs.existsSync(backupPath)) {
                console.error(`❌ Backup not found: ${backupName}`);
                return false;
            }

            // Create a pre-restore backup first
            this.createBackup('pre-restore');

            const files = fs.readdirSync(backupPath);
            for (const file of files) {
                const sourcePath = path.join(backupPath, file);
                const destPath = path.join(this.dataDir, file);
                fs.copyFileSync(sourcePath, destPath);
            }

            console.log(`✅ Restored from backup: ${backupName}`);
            return true;
        } catch (error) {
            console.error('❌ Error restoring backup:', error.message);
            return false;
        }
    }

    /**
     * Lists available backups
     */
    listBackups() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return [];
            }

            const backups = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('backup_'))
                .map(name => {
                    const backupPath = path.join(this.backupDir, name);
                    const stats = fs.statSync(backupPath);
                    return {
                        name,
                        date: stats.mtime,
                        files: fs.readdirSync(backupPath).length
                    };
                })
                .sort((a, b) => b.date - a.date);

            return backups;
        } catch (error) {
            console.error('❌ Error listing backups:', error.message);
            return [];
        }
    }

    /**
     * Gets details about a specific backup
     */
    getBackupDetails(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);

            if (!fs.existsSync(backupPath)) {
                return null;
            }

            const stats = fs.statSync(backupPath);
            const files = fs.readdirSync(backupPath);

            const details = {
                name: backupName,
                date: stats.mtime,
                files: files.length
            };

            // Read each file to get details
            for (const file of files) {
                const filePath = path.join(backupPath, file);
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                    if (file === 'guilds.json') {
                        details.guilds = content.guilds || content;
                    } else if (file === 'announcements.json') {
                        details.announcements = content.guilds || content;
                    } else if (file === 'analytics.json') {
                        details.analytics = content;
                    }
                } catch (e) {
                    // Skip unreadable files
                }
            }

            return details;
        } catch (error) {
            console.error('Error getting backup details:', error.message);
            return null;
        }
    }

    /**
     * Gets the latest backup
     */
    getLatestBackup() {
        const backups = this.listBackups();
        return backups.length > 0 ? backups[0] : null;
    }

    /**
     * Cleanup old backups, keeping only the most recent ones
     */
    cleanupOldBackups() {
        try {
            const backups = this.listBackups();

            if (backups.length > this.maxBackups) {
                const toDelete = backups.slice(this.maxBackups);
                for (const backup of toDelete) {
                    const backupPath = path.join(this.backupDir, backup.name);
                    fs.rmSync(backupPath, { recursive: true });
                    console.log(`🗑️  Cleaned up old backup: ${backup.name}`);
                }
            }
        } catch (error) {
            console.error('⚠️  Error cleaning up backups:', error.message);
        }
    }
}

module.exports = BackupManager;
