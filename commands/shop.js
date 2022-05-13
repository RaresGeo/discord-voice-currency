'use strict';

const config = require('../utilities/config').config;
const User = require('../models/User');
const utils = require('../utilities/utils');
const { leftArrow, rightArrow } = require('../utilities/emojis');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const jsonfile = require('jsonfile');

const ROLES_PER_PAGE = 6;
const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

module.exports = {
  aliases: ['shop'],
  event: 'messageCreate',
};

module.exports.command = async (message) => {
  let leftButton = new MessageButton()
    .setCustomId('left')
    .setEmoji(leftArrow)
    .setStyle('PRIMARY');
  let rightButton = new MessageButton()
    .setCustomId('right')
    .setEmoji(rightArrow)
    .setStyle('PRIMARY');
  let _roles = jsonfile
    .readFileSync('./db/json/roles.json')
    .filter(({ guild_id }) => guild_id === message.guildId);
  // Construct embed

  let indexStart = 0;

  let roles = _roles.slice(indexStart, indexStart + ROLES_PER_PAGE);
  let embed = generateEmbed(message, roles, indexStart, _roles.length);

  let row = new MessageActionRow().addComponents(
    leftButton,
    rightButton,
    new MessageButton()
      .setCustomId('number')
      .setEmoji(numbers[0])
      .setStyle('SECONDARY')
  );
  let initialMessage = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  const filter = (interaction) => interaction.user === message.author;

  const buttonCollector = initialMessage.createMessageComponentCollector({
    filter,
  });

  buttonCollector.on('collect', async (interaction) => {
    switch (interaction.customId) {
      case 'left':
        indexStart -= ROLES_PER_PAGE;
        if (indexStart < 0) indexStart = 0;
        break;
      case 'right':
        indexStart += ROLES_PER_PAGE;
        if (indexStart + ROLES_PER_PAGE >= _roles.length)
          indexStart = _roles.length - ROLES_PER_PAGE;
        break;
    }

    roles = _roles.slice(indexStart, indexStart + ROLES_PER_PAGE);
    embed = generateEmbed(message, roles, indexStart, _roles.length);
    await initialMessage
      .edit({ embeds: [embed] })
      .catch((err) => console.log(err));
    row = new MessageActionRow().addComponents(
      leftButton,
      rightButton,
      new MessageButton()
        .setCustomId('number')
        .setEmoji(numbers[Math.ceil(indexStart / ROLES_PER_PAGE)])
        .setStyle('SECONDARY')
    );
    await interaction
      .update({ components: [row] })
      .catch((err) => console.log(err));
  });
};

const generateEmbed = (message, roles, indexStart, rolesLength) => {
  let embed = new MessageEmbed()
    .setColor('DARK_BUT_NOT_BLACK')
    .setTitle(`${message.guild.name} shop`)
    .setFooter(
      `Showing ${indexStart + 1} to ${
        indexStart + ROLES_PER_PAGE
      } out of ${rolesLength} roles`
    );

  roles.forEach(({ guild_id, role_id, name, price, stock, multiplier }) => {
    if (guild_id === message.guildId) {
      let bigString = `Price: 💵  ${price}`;
      if (stock >= 0) bigString += `\nStock: ${stock}`;
      if (multiplier != 1) bigString += `\nMultiplier: ${multiplier}x`;

      embed.addField(name, bigString, true);
    }
  });

  return embed;
};
