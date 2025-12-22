const { EmbedBuilder } = require('discord.js');
const AnnouncementStorage = require('../utils/announcementStorage');

module.exports = {
    name: 'listbirthdays',
    description: 'View upcoming birthdays',
    async execute(message, args) {
        const storage = new AnnouncementStorage();
        const upcoming = storage.getUpcomingBirthdays(message.guild.id, 60); // Next 60 days

        if (upcoming.length === 0) {
            return message.reply('📅 No upcoming birthdays in the next 60 days!\n\nUse `!addbirthday @USER MM/DD/YYYY` to add birthdays.');
        }

        // Group birthdays
        const today = [];
        const thisWeek = [];
        const thisMonth = [];
        const later = [];

        for (const bday of upcoming) {
            if (bday.daysUntil === 0) {
                today.push(bday);
            } else if (bday.daysUntil <= 7) {
                thisWeek.push(bday);
            } else if (bday.daysUntil <= 30) {
                thisMonth.push(bday);
            } else {
                later.push(bday);
            }
        }

        const formatBirthday = (bday) => {
            const [year, month, day] = bday.birthDate.split('-').map(Number);
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            if (bday.daysUntil === 0) {
                return `🎂 **${bday.username}** - Turning **${bday.turningAge}** TODAY!`;
            } else if (bday.daysUntil === 1) {
                return `🎈 **${bday.username}** - Tomorrow (${monthNames[month - 1]} ${day}) - Turning ${bday.turningAge}`;
            } else {
                return `📅 **${bday.username}** - ${monthNames[month - 1]} ${day} (${bday.daysUntil} days) - Turning ${bday.turningAge}`;
            }
        };

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('🎂 Upcoming Birthdays')
            .setTimestamp();

        if (today.length > 0) {
            embed.addFields({
                name: '🎉 TODAY!',
                value: today.map(formatBirthday).join('\n'),
                inline: false
            });
        }

        if (thisWeek.length > 0) {
            embed.addFields({
                name: '📆 This Week',
                value: thisWeek.map(formatBirthday).join('\n'),
                inline: false
            });
        }

        if (thisMonth.length > 0) {
            embed.addFields({
                name: '📅 This Month',
                value: thisMonth.map(formatBirthday).join('\n'),
                inline: false
            });
        }

        if (later.length > 0) {
            embed.addFields({
                name: '🗓️ Coming Up',
                value: later.map(formatBirthday).join('\n'),
                inline: false
            });
        }

        embed.setFooter({ text: `${upcoming.length} birthday${upcoming.length === 1 ? '' : 's'} in the next 60 days` });

        return message.reply({ embeds: [embed] });
    },
};
