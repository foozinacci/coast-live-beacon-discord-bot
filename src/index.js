require('dotenv').config();
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const StreamMonitor = require('./services/streamMonitor');
const BirthdayAnnouncer = require('./services/birthdayAnnouncer');
const AdScheduler = require('./services/adScheduler');
const BackupManager = require('./utils/backupManager');
const CommandHandler = require('./handlers/commandHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  // Auto-backup on startup
  console.log(`💾 Creating startup backup...`);
  const backupManager = new BackupManager();
  backupManager.createBackup('startup');

  console.log(`📺 Starting Twitch stream monitor...`);
  const streamMonitor = new StreamMonitor(client);
  await streamMonitor.start();

  console.log(`🎂 Starting birthday announcer...`);
  const birthdayAnnouncer = new BirthdayAnnouncer(client);
  await birthdayAnnouncer.start();

  console.log(`📢 Starting ad scheduler...`);
  const adScheduler = new AdScheduler(client);
  adScheduler.start();
});

const commandHandler = new CommandHandler(client);
commandHandler.registerCommands();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
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
