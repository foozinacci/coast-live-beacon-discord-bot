const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'addmybirthday',
    description: 'Add your own birthday',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('❌ Usage: `!addmybirthday MM/DD/YYYY`\n\nExample: `!addmybirthday 03/15/1995`');
        }

        const dateInput = args[0];
        const dateMatch = dateInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

        if (!dateMatch) {
            return message.reply('❌ Invalid date format. Use `MM/DD/YYYY`\n\nExample: `!addmybirthday 03/15/1995`');
        }

        const [, month, day, year] = dateMatch.map(Number);

        // Validate date ranges
        if (month < 1 || month > 12) {
            return message.reply('❌ Invalid month. Must be 01-12.');
        }
        if (day < 1 || day > 31) {
            return message.reply('❌ Invalid day. Must be 01-31.');
        }
        if (year < 1900 || year > new Date().getFullYear()) {
            return message.reply('❌ Invalid year.');
        }

        // Format as ISO date
        const birthDate = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');

        // Get Discord join date
        const member = message.member;
        const discordJoinDate = member.joinedAt ? member.joinedAt.toISOString() : null;

        const storage = new AnnouncementStorage();
        storage.addBirthday(
            message.guild.id,
            message.author.id,
            message.author.username,
            birthDate,
            discordJoinDate
        );

        // Format display date
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const formattedDate = months[month - 1] + ' ' + day + ', ' + year;

        // Calculate next birthday
        const today = new Date();
        let nextBirthday = new Date(today.getFullYear(), month - 1, day);
        if (nextBirthday < today) {
            nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
        }
        const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        const turningAge = nextBirthday.getFullYear() - year;

        return message.reply('🎂 Your birthday has been added!\n\n' +
            '📅 **Birthday:** ' + formattedDate + '\n' +
            '🎈 **Next Birthday:** In ' + daysUntil + ' days (turning ' + turningAge + ')\n\n' +
            '*You\'ll get a personalized announcement on your special day!* 🎉');
    },
};
