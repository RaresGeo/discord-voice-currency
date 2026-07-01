"use strict";

const { MessageEmbed } = require("discord.js");

module.exports = {
    aliases: ["created"],
    event: "messageCreate",
};

module.exports.command = async (message) => {
    let people = [];
    let cache = await message.guild.members.fetch().catch((err) => console.error(err));

    console.debug("no. members is ", cache.size);

    cache.map((user) => {
        people.push({
            username: user.displayName,
            created: new Date(user.user.createdAt),
            id: user.id,
        });
    });

    let isSorted;

    do {
        isSorted = true;

        for (let i = 0; i < people.length - 1; i++) {
            if (people[i].created > people[i + 1].created) {
                isSorted = false;
                let temp = people[i];
                people[i] = people[i + 1];
                people[i + 1] = temp;
            }
        }
    } while (!isSorted);

    let bigField = [""];

    for (let index = 0; index < 10; index++) {
        let createdStamp = people[index].created.toString().split(" ").slice(0, 5).join(" ");
        bigField[index] = `**${index + 1}. ${people[index].username}** - ${createdStamp}`;
    }

    bigField = bigField.join("\n");

    // Construct embed
    let embed = new MessageEmbed().setColor("DARK_BUT_NOT_BLACK").setTitle(`${message.guild.name} oldest accounts.`).addField(`Top 10`, bigField);

    message.channel.send({ embeds: [embed] });
};
