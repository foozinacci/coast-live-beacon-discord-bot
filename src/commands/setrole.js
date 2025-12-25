const StreamerStorage = require('../utils/streamerStorage');

module.exports = {
  name: 'lbsetrole',
  description: 'Set the role to mention when streams go live',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You need Administrator permissions to use this command.');
    }

    if (args.length === 0) {
      return message.reply('Please mention a role or provide a role ID. Usage: `!setrole @RoleName` or `!setrole 123456789`');
    }

    const storage = new StreamerStorage();
    const guildId = message.guild.id;

    let roleId;

    if (message.mentions.roles.size > 0) {
      roleId = message.mentions.roles.first().id;
    } else {
      roleId = args[0];
      const role = message.guild.roles.cache.get(roleId);
      if (!role) {
        return message.reply('❌ Invalid role ID. Please mention a role or provide a valid role ID.');
      }
    }

    storage.setRole(guildId, roleId);

    return message.reply(`✅ Notification role set to <@&${roleId}>! This role will be mentioned when streams go live.`);
  },
};
