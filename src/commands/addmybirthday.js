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
        const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

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

        // Calculate age
        const today = new Date();
        const birthDateObj = new Date(birthDate);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }

        return message.reply('🎂 Your birthday has been added! (**' + month + '/' + day + '/' + year + '**)\n\n*You\'ll get a shoutout on your special day!*');
    },
};
