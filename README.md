# Coast Discord Bot

A custom Discord bot that monitors Twitch streamers and sends notifications when they go live, mentioning the @WIZARDS role.

## Features

- Real-time Twitch stream monitoring
- Automatic notifications when streamers go live
- Role mentions (@WIZARDS) for stream alerts
- Rich embed notifications with stream details
- Easy streamer management with commands
- No paywalls - completely free and open source

## Prerequisites

- Node.js 16.x or higher
- A Discord bot account
- Twitch Developer application

## Setup Instructions

### 1. Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
   - Server Members Intent (optional)
6. Click "Reset Token" and copy your bot token (you'll need this for the `.env` file)
7. Go to the "OAuth2" > "URL Generator" section
8. Select scopes:
   - `bot`
9. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Mention Everyone (to mention roles)
10. Copy the generated URL and open it in your browser to invite the bot to your server

### 2. Twitch API Setup

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click "Register Your Application"
3. Fill in:
   - Name: Any name you want
   - OAuth Redirect URLs: `http://localhost` (not used but required)
   - Category: Choose appropriate category
4. Click "Create"
5. Click "Manage" on your application
6. Copy the "Client ID"
7. Click "New Secret" and copy the "Client Secret"

### 3. Get Channel and Role IDs

**Get Notification Channel ID:**
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click the channel where you want notifications
3. Click "Copy Channel ID"

**Get Role ID:**
1. Right-click the @WIZARDS role in your server
2. Click "Copy Role ID"
3. Or use the provided ID: `1440689849744228443`

### 4. Install and Configure

1. Clone this repository:
```bash
git clone <your-repo-url>
cd coast-discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file by copying the example:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your credentials:
```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
NOTIFICATION_CHANNEL_ID=your_notification_channel_id_here
WIZARDS_ROLE_ID=1440689849744228443

TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

CHECK_INTERVAL=60000
```

### 5. Run the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Commands

All commands start with `!`:

- `!addstreamer <username>` - Add a Twitch streamer to monitor
- `!removestreamer <username>` - Remove a streamer from monitoring
- `!liststreamer` - List all monitored streamers
- `!help` - Show help message

### Examples

```
!addstreamer shroud
!addstreamer pokimane
!liststreamer
!removestreamer shroud
```

## Configuration

### Check Interval

The `CHECK_INTERVAL` environment variable controls how often the bot checks for live streams (in milliseconds).

- Default: `60000` (60 seconds / 1 minute)
- Minimum recommended: `30000` (30 seconds)
- To reduce API calls: `120000` (2 minutes)

Example:
```env
CHECK_INTERVAL=60000
```

## How It Works

1. The bot connects to Discord and starts monitoring
2. Every interval (default 60 seconds), it checks the Twitch API for all monitored streamers
3. When a streamer goes live, it sends a notification to the configured channel
4. The notification mentions the @WIZARDS role and includes:
   - Stream title
   - Game being played
   - Current viewer count
   - Thumbnail image
   - Direct link to the stream
5. The bot tracks which streams are live to avoid duplicate notifications

## Data Storage

The bot stores monitored streamers in `data/streamers.json`. This file is automatically created and managed by the bot.

## Troubleshooting

**Bot doesn't connect:**
- Check that your `DISCORD_TOKEN` is correct
- Ensure the bot has been invited to your server

**No notifications:**
- Verify `NOTIFICATION_CHANNEL_ID` is correct
- Check bot has permission to send messages in the channel
- Ensure `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are valid

**Role not mentioned:**
- Verify `WIZARDS_ROLE_ID` is correct
- Ensure bot has "Mention Everyone" permission

**Commands not working:**
- Make sure you enabled "Message Content Intent" in Discord Developer Portal
- Check bot has permission to read messages in the channel

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
