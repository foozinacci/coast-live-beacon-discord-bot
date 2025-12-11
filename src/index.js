require('dotenv').config();
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const StreamMonitor = require('./services/streamMonitor');
const CommandHandler = require('./handlers/commandHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📺 Starting Twitch stream monitor...`);

  const streamMonitor = new StreamMonitor(client);
  await streamMonitor.start();
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
