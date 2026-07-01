"use strict";

const config = require("../utilities/config").config;
const Role = require("../models/Role");
const utils = require("../utilities/utils");
const { catchError } = utils;
const { incorrectSyntax, finished } = require("../utilities/emojis");
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

const price = 50;
const MULTIPLIER = 1.1;
let duration = 30; // seconds

module.exports = {
    aliases: ["nuke", "muteall"],
    event: "messageCreate",
};

const notInVC = "You need to be in a voice channel to use this command";

module.exports.command = async (message) => {
    let channel = await message.guild.members.fetch(message.author.id);
    channel = channel.voice.channel;

    if (!channel) {
        utils.sendDelete(message, notInVC);
    }

    let exceptions = [message.author.id];

    let _mentions = message.mentions.members;
    let members = channel.members;

    _mentions.map((mention) => {
        exceptions.push(mention.id);
    });

    members.map((member) => {
        if (member.bot) exceptions.push(member.id);
    });

    let numberOfMutes = members.size - exceptions.length;
    let fullPrice = 0;
    let _price = price;

    for (let i = 0; i < numberOfMutes; i++) {
        fullPrice += parseInt(_price);
        _price *= MULTIPLIER;
    }

    let yesButton = new MessageButton().setCustomId("yes").setEmoji(finished).setStyle("PRIMARY");
    let noButton = new MessageButton().setCustomId("no").setEmoji(incorrectSyntax).setStyle("PRIMARY");

    let parsedArgs = utils.parseArgs(message.content);
    let force = parsedArgs.f;

    if (force) {
        // force, just do it
        muteUsers(message, members, exceptions, fullPrice);
        return;
    }

    let embed = new MessageEmbed().setColor("DARK_BUT_NOT_BLACK").setTitle(`Mute everyone in your vc for 30 seconds?`).addField("Cost: ", `💵 ${fullPrice}`).setThumbnail(message.author.avatarURL());

    let row = new MessageActionRow().addComponents(yesButton, noButton);

    let initialMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const filter = (interaction) => interaction.user === message.author;

    const buttonCollector = initialMessage.createMessageComponentCollector({
        filter,
    });

    buttonCollector.on("collect", async (interaction) => {
        let selectedButton;

        switch (interaction.customId) {
            case "yes":
                selectedButton = yesButton;
                muteUsers(message, members, exceptions, fullPrice);
                break;
            case "no":
                selectedButton = noButton;
                break;
        }

        let row = new MessageActionRow().addComponents(selectedButton);

        await interaction.update({ components: [row] }).catch((err) => console.error(err));

        buttonCollector.stop(["Collected reaction"]);
    });
};

const muteUser = async (message, user_id, price) => {
    // Try to mute them
    let guildMember = await message.guild.members.fetch(user_id);
    let voiceState = guildMember.voice;
    voiceState.setMute(true, `Muted by ${message.member.displayName} for ${price}`).catch(catchError);
    utils.sendDelete(message, `Successfully muted ${guildMember.displayName}`);

    setTimeout(() => {
        console.log(`Unmuted ${guildMember.displayName} for ${price}`);
        voiceState.setMute(false, `Muted by ${message.member.displayName} for ${price}`);
    }, 1000 * duration);
    return true;
};

const muteUsers = async (message, members, exceptions, price) => {
    let success = await utils.takePoints(message.author.id, parseInt(price), message.guildId);

    if (success) {
        members.map((member) => {
            if (exceptions.includes(member.id)) return true;
            if (member.bot) return true; // This is redundant but I'll leave it in
            muteUser(message, member.id, parseInt(price));
        });
        utils.sendDelete(message, `Successfully muted user.\nNew balance is ${success}`);
    } else {
        utils.sendDelete(message, `Not enough balance.`);
        return false;
    }
};
