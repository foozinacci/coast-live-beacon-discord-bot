const fs = require('fs');
const path = require('path');

class CommandHandler {
  constructor(client) {
    this.client = client;
  }

  registerCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ('name' in command && 'execute' in command) {
        this.client.commands.set(command.name, command);
        console.log(`📝 Registered command: ${command.name}`);
      } else {
        console.warn(`⚠️  Command at ${filePath} is missing required properties`);
      }
    }
  }
}

module.exports = CommandHandler;
