# LIVE BEACON - Discord Twitch Notification Bot

A custom Discord bot that monitors Twitch streamers and sends notifications when they go live. Built by COAST, free and open source - no paywalls!

## Features

- 🔴 Real-time Twitch stream monitoring
- 🌐 **Multi-server support** - Each Discord server has its own configuration
- 📺 Per-server streamer lists
- 📢 Customizable notification channels per server
- 👥 Configurable role mentions per server
- 🎨 Rich embed notifications with stream details and large preview images
- ⚡ Easy management with simple commands
- 📊 **Analytics tracking** - Track stream frequency, games, peak times, and viewer stats
- 🔐 **Permission-based commands** - Moderators control streamer list, everyone can view
- ⏱️ **Smart notifications** - 60-second delay to capture accurate viewer counts
- 🛡️ **Offline cooldown** - Prevents notification spam if streamers briefly disconnect
- 🔄 **Graceful restarts** - Won't re-notify for streams already live on bot restart
- 🎮 **Game change tracking** - Logs when streamers switch games mid-stream
- 💰 Completely free and open source

## Prerequisites

- Node.js 16.x or higher
- A Discord bot account
- Twitch Developer application

## Quick Start

### 1. Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "LIVE BEACON")
3. Go to the "Bot" section
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - **Message Content Intent** (required)
   - Server Members Intent (optional)
6. Click "Reset Token" and copy your bot token
7. Go to "OAuth2" > "URL Generator"
8. Select scopes: `bot`
9. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Mention Everyone
10. Copy the generated URL and invite the bot to your server

### 2. Twitch API Setup

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in:
   - Name: "LIVE BEACON" (or any name)
   - OAuth Redirect URLs: `http://localhost`
   - Category: Application Integration
4. Click "Create"
5. Click "Manage" and copy the "Client ID"
6. Click "New Secret" and copy the "Client Secret"

### 3. Install and Configure

1. Clone this repository:

**On Windows (PowerShell):**
```powershell
git clone https://github.com/foozinacci/coast-live-beacon-discord-bot.git
cd coast-live-beacon-discord-bot
```

**On Mac/Linux:**
```bash
git clone https://github.com/foozinacci/coast-live-beacon-discord-bot.git
cd coast-live-beacon-discord-bot
```

2. Install dependencies:
```powershell
npm install
```

3. Create a `.env` file:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Mac/Linux:**
```bash
cp .env.example .env
```

4. Edit the `.env` file with your credentials:

**On Windows:** Right-click `.env` → Open with Notepad

**On Mac/Linux:** `nano .env` or your preferred editor

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# Twitch Configuration
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

# Bot Configuration
CHECK_INTERVAL=60000
NOTIFICATION_DELAY=60000
OFFLINE_COOLDOWN=120000
```

**Important:**
- Never commit your `.env` file to git (it's already in `.gitignore`)
- Notification channels and roles are configured per-server using Discord commands (not in `.env`)

### 4. Run the Bot

**On Windows (PowerShell):**
```powershell
npm start
```

**Keep it running 24/7 on Windows with PM2:**
```powershell
npm install -g pm2
pm2 start src/index.js --name live-beacon
pm2 save
pm2 startup
```

**On Mac/Linux:**
```bash
npm start
# Or with PM2:
pm2 start src/index.js --name live-beacon
pm2 save
```

## Server Configuration

Each Discord server needs to be configured independently. Use these commands:

### Initial Setup (Admin Only)

1. **Set the notification channel:**
   - Go to the channel where you want notifications
   - Run: `!setchannel`

2. **Set the role to mention:**
   - Run: `!setrole @YourRole`
   - Or: `!setrole 1440689849744228443` (using role ID)

3. **Check your configuration:**
   - Run: `!config`

### Add Streamers (Moderators Only)

**Moderators** add streamers:
```
!addstreamer shroud
!addstreamer pokimane
```

**Anyone** can view the list:
```
!liststreamer
```

**Note:** Regular members should DM or ask moderators to add their Twitch username.

## Commands

### Everyone Can Use
- `!liststreamer` - View all monitored streamers for this server
- `!help` - Show help message with all commands
- `!config` - View current server configuration

### Moderators Only
Requires **Manage Messages**, **Moderate Members**, or **Administrator** permission:
- `!addstreamer <username>` - Add any Twitch streamer to monitor
- `!removestreamer <username>` - Remove a streamer from monitoring
- `!stats <username>` - View detailed analytics for a streamer (total streams, peak viewers, top games, peak hours)
- `!leaderboard [metric]` - View top streamers leaderboard
  - Metrics: `peakviewers`, `avgviewers`, `streams`, `duration`
  - Example: `!leaderboard peakviewers`

### Administrators Only
Requires **Administrator** permission:
- `!setchannel` - Set notification channel (run in the desired channel)
- `!setrole @Role` - Set role to mention when streams go live

## Multi-Server Support

**LIVE BEACON** supports multiple Discord servers with independent configurations:

- ✅ Each server has its own streamer list
- ✅ Each server sets its own notification channel
- ✅ Each server chooses which role to mention
- ✅ One bot instance serves all servers
- ✅ Streamers monitored by multiple servers are checked once and notifications sent to all

## How It Works

1. The bot connects to Discord and authenticates with Twitch
2. Every 60 seconds (configurable), it checks all monitored streamers across all servers
3. When a streamer goes live:
   - The bot finds all servers monitoring that streamer
   - Sends a notification to each server's configured channel
   - Mentions each server's configured role
   - Includes stream title, game, viewer count, and thumbnail
4. Tracks which streams are live to avoid duplicate notifications

## Configuration Options

### Check Interval

The `CHECK_INTERVAL` in `.env` controls how often the bot checks for live streams (in milliseconds):

- Default: `60000` (60 seconds / 1 minute)
- Minimum recommended: `30000` (30 seconds)
- Less frequent: `120000` (2 minutes)

Lower values = faster notifications but more API calls.

### Notification Delay

The `NOTIFICATION_DELAY` in `.env` controls how long to wait before sending a go-live notification (in milliseconds):

- Default: `60000` (60 seconds / 1 minute)
- Why: Allows viewers to join before the notification is sent, so the viewer count in the embed is accurate
- Set to `0` to disable the delay and notify immediately

### Offline Cooldown

The `OFFLINE_COOLDOWN` in `.env` prevents rapid notifications if a streamer briefly disconnects (in milliseconds):

- Default: `120000` (2 minutes)
- If a streamer goes offline and back online within this period, no new notification is sent
- Prevents spam from connection issues

## Sharing Your Bot

Want to let others use your bot?

1. Generate an invite link from the Discord Developer Portal (OAuth2 > URL Generator)
2. Share the link - anyone can add the bot to their server
3. Each server configures it independently
4. Your bot serves all servers from one instance

**Important:** Your bot needs to be running 24/7 to serve multiple servers. Consider using:
- pm2 on your PC (free but PC must stay on)
- Cloud hosting like Render, Railway, or Fly.io

## Data Storage

Bot data is stored in the `data/` directory:

**`data/guilds.json`** - Server configurations:
```json
{
  "guilds": {
    "server_id_1": {
      "streamers": ["streamer1", "streamer2"],
      "notificationChannelId": "channel_id",
      "roleId": "role_id"
    },
    "server_id_2": { ... }
  }
}
```

**`data/analytics.json`** - Stream analytics:
```json
{
  "sessions": {
    "streamer1": [
      {
        "sessionId": "streamer1_1234567890",
        "startTime": 1234567890,
        "endTime": 1234578900,
        "game": "Just Chatting",
        "title": "Stream Title",
        "peakViewers": 150,
        "viewerSnapshots": [...]
      }
    ]
  },
  "activeStreams": {}
}
```

These files are automatically created and managed. Each server's configuration is isolated.

## Troubleshooting

**Bot doesn't respond to commands:**
- Verify "Message Content Intent" is enabled in Discord Developer Portal
- Check bot has "Send Messages" permission in the channel
- Make sure you're using `!` prefix (e.g., `!help`)

**No notifications:**
- Run `!config` to verify channel and role are set
- Ensure bot has permission to send messages in notification channel
- Check bot has "Mention Everyone" permission
- Verify streamers are added with `!liststreamer`

**Commands say "Only moderators can...":**
- `!addstreamer`, `!removestreamer`, `!stats`, `!leaderboard` require moderator permissions
- Regular users should ask a moderator to add their Twitch username
- Anyone can use `!liststreamer`, `!help`, and `!config`

**Commands say "You need Administrator permissions...":**
- Only server administrators can run `!setchannel` and `!setrole`

**Bot offline after PC restart:**
- If using pm2: Run `pm2 resurrect` or `pm2 start live-beacon`
- Consider setting up cloud hosting for 24/7 uptime

## License

MIT

## Credits

Built by **COAST** - Free and open source Twitch notification bot for Discord.

---

**Enjoy your LIVE BEACON! 🗼**
