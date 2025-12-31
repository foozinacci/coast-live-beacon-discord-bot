require('dotenv').config();
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const StreamMonitor = require('./services/streamMonitor');
const BirthdayAnnouncer = require('./services/birthdayAnnouncer');
const AdScheduler = require('./services/adScheduler');
const BackupManager = require('./utils/backupManager');
const CommandHandler = require('./handlers/commandHandler');
const XPStorage = require('./utils/xpStorage');
const StreakStorage = require('./utils/streakStorage');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
const xpStorage = new XPStorage();
const streakStorage = new StreakStorage();

client.once(Events.ClientReady, async (c) => {
  console.log('✅ Logged in as ' + c.user.tag);

  // Auto-backup on startup
  console.log('💾 Creating startup backup...');
  const backupManager = new BackupManager();
  backupManager.createBackup('startup');

  console.log('📺 Starting Twitch stream monitor...');
  const streamMonitor = new StreamMonitor(client);
  await streamMonitor.start();

  console.log('🎂 Starting birthday announcer...');
  const birthdayAnnouncer = new BirthdayAnnouncer(client);
  await birthdayAnnouncer.start();

  console.log('📢 Starting ad scheduler...');
  const adScheduler = new AdScheduler(client);
  adScheduler.start();

  console.log('🎵 Initializing music player...');
  const MusicPlayer = require('./services/musicPlayer');
  client.musicPlayer = new MusicPlayer(client);

  console.log('📺 Loading Twitch chat connections...');
  const TwitchChat = require('./services/twitchChat');
  client.twitchChat = new TwitchChat(client);
  await client.twitchChat.loadSavedConfigs();

  // Token expiry reminders
  const TokenExpiryChecker = require('./services/tokenExpiryChecker');
  const tokenChecker = new TokenExpiryChecker(client);
  tokenChecker.start();

  // Initialize Wildcard game and Spectator API
  console.log('🃏 Initializing Wildcard game...');
  const WildcardGame = require('./services/wildcardGameV2');
  client.wildcardGame = new WildcardGame(client);

  // Start API server immediately (Railway needs it fast)
  // Skip if health server is already running (we'll upgrade it later)
  if (!global.healthServer) {
    try {
      console.log('🌐 Starting Wildcard Spectator API...');
      const WildcardAPI = require('./api/wildcardAPI');
      const apiPort = process.env.PORT || 3005;
      client.wildcardAPI = new WildcardAPI(client.wildcardGame, apiPort);
      client.wildcardAPI.start();
    } catch (err) {
      console.error('❌ Failed to start Spectator API:', err.message);
    }
  } else {
    console.log('🌐 Health server running, skipping full API for now');
    // TODO: In production, we'd upgrade the health server to serve static files
  }

  console.log('⭐ XP and streak tracking active');

  // Initialize account linker
  console.log('🔗 Initializing account linker...');
  const AccountLinker = require('./services/accountLinker');
  client.accountLinker = new AccountLinker(client);
});

const commandHandler = new CommandHandler(client);
commandHandler.registerCommands();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // Handle DMs
  if (!message.guild) {
    // Check for account linking first
    if (client.accountLinker?.handleDMReply(message)) {
      return; // Was a link reply
    }

    // Handle invite/help/setup/uninstall requests in DMs
    const dmContent = message.content.toLowerCase().trim();
    if (['invite', 'add', 'help', 'setup', 'install', 'uninstall', 'remove', 'start'].includes(dmContent) ||
      dmContent.startsWith('!invite') || dmContent.startsWith('!help') || dmContent.startsWith('!setup')) {

      // Get bot client ID for invite link
      const clientId = process.env.DISCORD_CLIENT_ID || client.user?.id;
      const inviteUrl = clientId
        ? `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=3088&scope=bot`
        : '(Invite link unavailable - contact bot owner)';

      const helpEmbed = {
        color: 0x00ccff,
        title: '🤖 Coast Live Beacon Bot',
        description: 'Your community engagement and gaming companion!',
        fields: [
          {
            name: '📥 Add to Your Server',
            value: `[Click here to invite me](${inviteUrl})\n\n` +
              `**Requirements:**\n` +
              `• You need **Manage Server** permission\n` +
              `• Grant the requested permissions when prompted`,
            inline: false
          },
          {
            name: '⚙️ Recommended Setup',
            value: `**1.** Create a private \`#bot-config\` channel (admins only)\n` +
              `**2.** Create a \`#bot-commands\` channel for users\n` +
              `**3.** Use \`!help\` in your server to see all commands\n` +
              `**4.** Configure with \`!config\` in your private channel`,
            inline: false
          },
          {
            name: '🗑️ Uninstall / Remove Bot',
            value: `**To remove from your server:**\n` +
              `1. Go to Server Settings → Integrations\n` +
              `2. Find "Coast Live Beacon"\n` +
              `3. Click "Manage" → "Remove Integration"\n\n` +
              `*This removes the bot but keeps your data safe.*`,
            inline: false
          },
          {
            name: '📚 Quick Commands',
            value: `\`!help\` - Full command list\n` +
              `\`!config\` - Bot configuration\n` +
              `\`!lbg\` - Wildcard game commands`,
            inline: false
          }
        ],
        footer: {
          text: 'DM me anytime with "help" or "invite" for this message!'
        }
      };

      await message.reply({ embeds: [helpEmbed] });
      return;
    }

    // Unknown DM - send a hint
    await message.reply('👋 Hi! Type **help** or **invite** to learn how to add me to your server!');
    return;
  }

  // Award XP for messages (even non-commands)
  if (!message.content.startsWith('!')) {
    xpStorage.addXP(message.guild.id, message.author.id, 1, 'message');
    streakStorage.incrementStreak(message.guild.id, message.author.id, 'dailyVisit');
    return;
  }

  // Command handling
  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
    // Award XP for using commands too
    xpStorage.addXP(message.guild.id, message.author.id, 1, 'message');
    streakStorage.incrementStreak(message.guild.id, message.author.id, 'dailyVisit');
  } catch (error) {
    console.error('Error executing command ' + commandName + ':', error);
    await message.reply('There was an error executing that command.');
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  // Don't crash - keep running
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't crash - keep running
});

// Ignore SIGTERM for debugging (Railway sends this)
process.on('SIGTERM', () => {
  console.log('⚠️ Received SIGTERM - ignoring to debug');
  // Don't exit - we want to see why Railway is killing us
});

// === ABSOLUTE MINIMUM HEALTH SERVER (before ANY other code) ===
// Using raw http - no express, no static, nothing else
const http = require('http');
const fs = require('fs');
const path = require('path');
const apiPort = process.env.PORT || 3005;

const publicDir = path.join(__dirname, 'public');

const healthServer = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`);

  // Health check - respond instantly
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    console.log('✅ Health check responded OK');
    return;
  }

  // API health
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Beacon routes
  if (req.url === '/beacon' || req.url === '/arena') {
    const beaconPath = path.join(publicDir, 'beacon.html');
    fs.readFile(beaconPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('beacon.html not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Serve static files from public directory
  let filePath = path.join(publicDir, req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Default: return OK for root, 404 for others
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Coast Live Beacon Bot - Visit /beacon for the overlay');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }
    // Determine content type
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.json': 'application/json'
    };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

console.log(`🔍 PORT env = "${process.env.PORT}" | Using port: ${apiPort}`);

healthServer.on('error', (err) => {
  console.error('❌ Health server error:', err.message);
});

healthServer.listen(apiPort, '0.0.0.0', () => {
  console.log(`🌐 Health server running on http://0.0.0.0:${apiPort}`);
  console.log('✅ Server is LISTENING and ready for requests');
});

// WebSocket server for beacon overlay
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server: healthServer });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');

  // Send initial state
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Beacon Arena server'
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 WebSocket message:', message.type);
    } catch (e) {
      console.log('📨 WebSocket raw message:', data.toString());
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Expose WebSocket server globally for game updates
global.wss = wss;
global.broadcastGameState = (state) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(state));
    }
  });
};

console.log('🔌 WebSocket server attached to health server');

// Keepalive logging every 5 seconds
setInterval(() => {
  console.log(`💓 Alive - uptime: ${Math.floor(process.uptime())}s`);
}, 5000);

global.healthServer = healthServer;

// Login to Discord with error handling
console.log('🔑 Attempting Discord login...');
console.log(`🔑 Token starts with: ${process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('✅ Discord login initiated successfully');
  })
  .catch(err => {
    console.error('❌ Discord login failed:', err.message);
    console.error('❌ Full error:', err);
    console.error('⚠️ Bot features disabled, but API still running');
  });
