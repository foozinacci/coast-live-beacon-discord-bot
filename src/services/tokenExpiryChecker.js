/**
 * Twitch Token Expiry Checker
 * Checks saved tokens and reminds users before they expire
 */

const fs = require('fs');
const path = require('path');

class TokenExpiryChecker {
    constructor(client) {
        this.client = client;
        this.configPath = path.join(__dirname, '../../data/twitchLinks.json');
        this.TOKEN_LIFETIME_DAYS = 60; // Twitch tokens expire after ~60 days
        this.REMINDER_DAYS = [7, 3, 1]; // Remind at 7, 3, and 1 day before expiry
    }

    start() {
        console.log('🔔 Token expiry checker starting...');

        // Check once on startup (after 30 seconds to let bot fully initialize)
        setTimeout(() => this.checkAllTokens(), 30000);

        // Then check daily at midnight
        this.scheduleDaily();
    }

    scheduleDaily() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const msUntilMidnight = tomorrow - now;

        setTimeout(() => {
            this.checkAllTokens();
            // Then repeat every 24 hours
            setInterval(() => this.checkAllTokens(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    async checkAllTokens() {
        let config = {};
        try {
            if (fs.existsSync(this.configPath)) {
                config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (e) {
            return;
        }

        const now = Date.now();

        for (const [guildId, data] of Object.entries(config)) {
            if (!data.linkedAt || !data.linkedBy) continue;

            const expiryDate = data.linkedAt + (this.TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
            const daysUntilExpiry = Math.floor((expiryDate - now) / (24 * 60 * 60 * 1000));

            // Check if we should remind
            if (this.REMINDER_DAYS.includes(daysUntilExpiry)) {
                await this.sendReminder(guildId, data, daysUntilExpiry);
            }

            // Mark as expired if past due
            if (daysUntilExpiry < 0 && !data.expiredNotified) {
                await this.sendExpiredNotice(guildId, data);
                data.expiredNotified = true;
                fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            }
        }
    }

    async sendReminder(guildId, data, daysLeft) {
        try {
            const user = await this.client.users.fetch(data.linkedBy);
            const guild = await this.client.guilds.fetch(guildId);

            const urgency = daysLeft === 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '🔔';
            const plural = daysLeft === 1 ? '' : 's';

            await user.send(
                `${urgency} **Twitch Token Expiring Soon!**\n\n` +
                `Your Twitch connection for **${guild.name}** (channel: \`${data.channel}\`) ` +
                `will expire in **${daysLeft} day${plural}**.\n\n` +
                `**To renew:**\n` +
                `1. Go to your Discord server\n` +
                `2. Run \`!lbunlinktwitch\`\n` +
                `3. Run \`!lblinktwitch ${data.channel}\`\n` +
                `4. Get a fresh token from twitchtokengenerator.com\n\n` +
                `*This keeps Twitch chat commands working!*`
            );

            console.log(`🔔 Sent token reminder to ${user.tag} for ${guild.name} (${daysLeft} days left)`);
        } catch (error) {
            console.error('Failed to send token reminder:', error.message);
        }
    }

    async sendExpiredNotice(guildId, data) {
        try {
            const user = await this.client.users.fetch(data.linkedBy);
            const guild = await this.client.guilds.fetch(guildId);

            await user.send(
                `❌ **Twitch Token Expired**\n\n` +
                `Your Twitch connection for **${guild.name}** (channel: \`${data.channel}\`) has expired.\n\n` +
                `Twitch chat commands like \`!lbsr\` won't work until you renew:\n` +
                `1. Run \`!lbunlinktwitch\` in ${guild.name}\n` +
                `2. Run \`!lblinktwitch ${data.channel}\`\n` +
                `3. Provide a fresh OAuth token\n\n` +
                `*Get a new token at: https://twitchtokengenerator.com/*`
            );

            console.log(`❌ Sent token expired notice to ${user.tag} for ${guild.name}`);
        } catch (error) {
            console.error('Failed to send expired notice:', error.message);
        }
    }
}

module.exports = TokenExpiryChecker;
