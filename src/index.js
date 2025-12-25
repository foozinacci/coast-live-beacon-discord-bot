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

  // Start API server after a delay (so bot finishes loading first)
  setTimeout(() => {
    try {
      console.log('🌐 Starting Wildcard Spectator API...');
      const WildcardAPI = require('./api/wildcardAPI');
      client.wildcardAPI = new WildcardAPI(client.wildcardGame, 3005);
      client.wildcardAPI.start();
    } catch (err) {
      console.error('❌ Failed to start Spectator API:', err.message);
    }
  }, 3000);

  console.log('⭐ XP and streak tracking active');
});

const commandHandler = new CommandHandler(client);
commandHandler.registerCommands();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

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
});

client.login(process.env.DISCORD_TOKEN);
