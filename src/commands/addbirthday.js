const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'lbaddbday',
    description: 'Add a birthday to track for a user',
    async execute(message, args) {
        // Check moderator permissions
        const isModerator = message.member.permissions.has('ManageMessages') ||
            message.member.permissions.has('ModerateMembers') ||
            message.member.permissions.has('Administrator');

        if (!isModerator) {
            return message.reply('❌ Only moderators can add birthdays.');
        }

        if (args.length < 2) {
            return message.reply(`❌ Usage: \`!addbirthday @User MM/DD/YYYY\`

**Examples:**
• \`!addbirthday @JohnDoe 03/15/1995\`
• \`!addbirthday @StreamerName 12/25/2000\``);
        }

        // Parse user mention or ID
        let targetUser;
        const userArg = args[0];

        // Check if it's a mention
        const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            try {
                targetUser = await message.guild.members.fetch(mentionMatch[1]);
            } catch (error) {
                return message.reply('❌ Could not find that user in this server.');
            }
        } else {
            // Try to find by username
            const members = await message.guild.members.fetch({ query: userArg, limit: 1 });
            targetUser = members.first();

            if (!targetUser) {
                return message.reply(`❌ Could not find user "${userArg}". Try mentioning them with @.`);
            }
        }

        // Parse date (MM/DD/YYYY)
        const dateArg = args[1];
        const dateMatch = dateArg.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

        if (!dateMatch) {
            return message.reply('❌ Invalid date format. Use `MM/DD/YYYY` (e.g., `03/15/1995`)');
        }

        const month = parseInt(dateMatch[1], 10);
        const day = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);

        // Validate date
        if (month < 1 || month > 12) {
            return message.reply('❌ Invalid month. Must be between 1 and 12.');
        }
        if (day < 1 || day > 31) {
            return message.reply('❌ Invalid day. Must be between 1 and 31.');
        }
        if (year < 1900 || year > new Date().getFullYear()) {
            return message.reply(`❌ Invalid year. Must be between 1900 and ${new Date().getFullYear()}.`);
        }

        // Create ISO date string
        const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Calculate age
        const today = new Date();
        let age = today.getFullYear() - year;
        const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
        if (today < birthdayThisYear) {
            age--;
        }

        // Get Discord join date
        const discordJoinDate = targetUser.joinedAt.toISOString();

        const storage = new AnnouncementStorage();

        // Check if birthday already exists
        const existing = storage.getBirthday(message.guild.id, targetUser.id);
        if (existing) {
            const [eYear, eMonth, eDay] = existing.birthDate.split('-').map(Number);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            return message.reply('⚠️ **' + targetUser.user.username + '** already has a birthday set: **' +
                monthNames[eMonth - 1] + ' ' + eDay + ', ' + eYear + '**\n\n' +
                'Use `!removebirthday @USER` first to change it.');
        }

        storage.addBirthday(
            message.guild.id,
            targetUser.id,
            targetUser.user.username,
            birthDate,
            discordJoinDate
        );

        // Calculate days until next birthday
        let nextBirthday = new Date(today.getFullYear(), month - 1, day);
        if (nextBirthday < today) {
            nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
        }
        const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        return message.reply(`🎂 Birthday added for **${targetUser.user.username}**!

📅 **Birthday:** ${monthNames[month - 1]} ${day}, ${year}
🎈 **Current Age:** ${age} years old
⏳ **Next Birthday:** In ${daysUntil} day${daysUntil === 1 ? '' : 's'} (turning ${age + 1})

They'll get a personalized announcement when their birthday arrives! 🎉`);
    },
};
