# 🗼 LIVE BEACON - Discord Bot

A community-focused Discord bot for streamers with live notifications, music queue, XP/streaks, and Twitch chat integration.

---

## 📦 Installation

### Prerequisites
- **Node.js** 18+ (https://nodejs.org)
- **PM2** for process management: `npm install -g pm2`
- **Git** (optional, for cloning)

### 1. Clone or Download
```bash
git clone https://github.com/YOUR_REPO/coast-live-beacon-discord-bot.git
cd coast-live-beacon-discord-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env` File
Copy `.env.example` to `.env` and fill in your credentials:

```env
# Discord (Required)
DISCORD_TOKEN=your_discord_bot_token

# Twitch API (Required for stream notifications)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Spotify (Optional - for Spotify song requests)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Twitch Chat (Optional - for !lbsr in Twitch chat)
TWITCH_BOT_USERNAME=your_twitch_username
TWITCH_BOT_TOKEN=oauth:your_token_here
```

---

## 🔑 Getting API Credentials

### Discord Bot Token
1. Go to https://discord.com/developers/applications
2. Click "New Application" → name it → Create
3. Go to **Bot** → Click "Add Bot"
4. Click "Reset Token" → Copy the token
5. Enable these **Privileged Intents**:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
6. Go to **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Administrator` (or customize)
7. Copy the URL and invite bot to your server

### Twitch API (for stream notifications)
1. Go to https://dev.twitch.tv/console/apps
2. Click "Register Your Application"
3. Name: `LIVE BEACON`, OAuth Redirect: `http://localhost`
4. Category: Chat Bot
5. Click "Manage" → Copy **Client ID** and generate **Client Secret**

### Spotify API (optional)
1. Go to https://developer.spotify.com/dashboard
2. Create an app
3. Copy **Client ID** and **Client Secret**

### Twitch Chat Token (optional)
1. Go to https://twitchtokengenerator.com/
2. Select "Bot Chat Token" or custom scopes: `chat:read`, `chat:edit`
3. Authorize with your Twitch account
4. Copy the **Access Token** (add `oauth:` prefix)

---

## 🚀 Running the Bot

### Development
```bash
node src/index.js
```

### Production (PM2)
```bash
pm2 start src/index.js --name live-beacon
pm2 save
pm2 startup  # Auto-start on reboot
```

---

## ⚙️ First-Time Setup (in Discord)

Run these commands as a server **Administrator**:

```
!setup                           # Guided setup wizard
!setchannel                      # Set go-live notification channel
!setrole @StreamerRole           # Set role to ping for notifications
!addstreamer TwitchUsername      # Add streamers to monitor
!setmusicchannel                 # Set music updates channel
!linktwitchchat twitchusername   # Link Twitch chat for !lbsr
```

---

## 📋 Commands

### Public Commands
| Command | Description |
|---------|-------------|
| `!help` | Show all public commands |
| `!whoslive` | See who's currently streaming |
| `!addtrack [URL]` | Add YouTube/Spotify track |
| `!play` | Start music playback |
| `!queue` | View music queue |
| `!skip` | Vote to skip current track |
| `!level` | View your XP and level |
| `!streak` | View your engagement streaks |

### Twitch Chat Commands
| Command | Description |
|---------|-------------|
| `!lbsr [URL]` | Request a song |
| `!lbqueue` | View queue status |
| `!lbnp` | See what's playing |

### Mod Commands
| Command | Description |
|---------|-------------|
| `!modhelp` | Show all mod commands |
| `!forceskip` | Skip current track |
| `!pausemusic` / `!resumemusic` | Control playback |
| `!stop` | Stop music and disconnect |
| `!clearqueue confirm` | Clear all tracks |

### Admin Commands
| Command | Description |
|---------|-------------|
| `!config` | View all server settings |
| `!backup` | Manage data backups |
| `!musicstatus` | View player status |

---

## 📁 Data Storage

All data is stored in the `data/` folder:
- `streamers.json` - Monitored Twitch streamers
- `birthdays.json` - Birthday calendar
- `queue.json` - Music queue per server
- `xp.json` - User XP and levels
- `streaks.json` - User engagement streaks

---

## 🆘 Troubleshooting

### Bot not responding?
- Check `.env` has correct DISCORD_TOKEN
- Ensure Message Content Intent is enabled
- Restart: `pm2 restart live-beacon`

### No stream notifications?
- Verify Twitch credentials in `.env`
- Check `!liststreamer` shows your streamers
- Ensure `!setchannel` was run

### Music not playing?
- Bot needs voice channel permissions
- Try `!stop` then `!play` again
- Check logs: `pm2 logs live-beacon`

### Double responses?
- Only one instance should run: `pm2 list`
- Kill extras: `pm2 delete all` then restart

---

## 📜 License

MIT License - Feel free to modify and distribute!

---

**Made with ❤️ by COAST**
