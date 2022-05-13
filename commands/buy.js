'use strict';

const config = require('../utilities/config').config;
const Role = require('../models/Role');
const utils = require('../utilities/utils');
const { incorrectSyntax, finished } = require('../utilities/emojis');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const jsonfile = require('jsonfile');

module.exports = {
  aliases: ['buy'],
  event: 'messageCreate',
};

const ROLES_JSON_FILE = './db/json/roles.json';

module.exports.command = async (message) => {
  let yesButton = new MessageButton()
    .setCustomId('yes')
    .setEmoji(finished)
    .setStyle('PRIMARY');
  let noButton = new MessageButton()
    .setCustomId('no')
    .setEmoji(incorrectSyntax)
    .setStyle('PRIMARY');

  let guildId = message.guildId;
  let roleName = utils.parseArgs(message.content)._.join(' ');

  let roles = jsonfile.readFileSync(ROLES_JSON_FILE);
  let _role;
  let role;
  let roleIndex;
  do {
    roleIndex = roles.findIndex(
      ({ guild_id, name }) =>
        guild_id === guildId && name.toLowerCase() === roleName.toLowerCase()
    );
    if (roleIndex === -1) {
      utils.sendDelete(
        message,
        'Could not find role. Are you sure it is in the shop?'
      );
      return;
    }
    role = roles[roleIndex];
    if (role.stock !== -1 && role.stock < 1) {
      utils.sendDelete(message, 'Out of stock.');
      return;
    }
    _role = await message.guild.roles
      .fetch(role.role_id)
      .catch((err) => console.log(err));
    if (!_role) {
      // Role wasn't found but it's possible it's still in the shop. Let's find and remove it. Check if there's a new
      Role.deleteOne({ guild_id: guildId, role_id: role.role_id });
      roles.splice(roleIndex, 1);
      jsonfile.writeFileSync(ROLES_JSON_FILE, roles, { spaces: 2 });
    } else {
      break;
    }
  } while (true);

  let embed = new MessageEmbed()
    .setColor(_role.hexColor)
    .setTitle(`Buy ${_role.name}?`)
    .addField('Price', `💵  ${role.price}`)
    .addField('Stock', `${role.stock} role${role.stock > 1 ? 's' : ''}`)
    .addField('Multiplier', `${role.multiplier}x`);

  let row = new MessageActionRow().addComponents(yesButton, noButton);
  let initialMessage = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  const filter = (interaction) => interaction.user === message.author;

  const buttonCollector = initialMessage.createMessageComponentCollector({
    filter,
  });

  buttonCollector.on('collect', async (interaction) => {
    let selectedButton;

    switch (interaction.customId) {
      case 'yes':
        selectedButton = yesButton;
        buyRole(message, _role, roles, roleIndex);
        break;
      case 'no':
        selectedButton = noButton;
        break;
    }

    let row = new MessageActionRow().addComponents(selectedButton);

    await interaction
      .update({ components: [row] })
      .catch((err) => console.log(err));

    buttonCollector.stop(['Collected reaction']);
  });
};

const buyRole = async (message, role, jsonRoles, roleIndex) => {
  const price = jsonRoles[roleIndex].price;
  const stock = jsonRoles[roleIndex].stock;
  let user_id = message.author.id;
  let roleManager = message.member.roles;

  let roles = roleManager.cache;
  let alreadyHasRole = false;
  roles.map((_role) => {
    if (_role.id === role.id) {
      alreadyHasRole = true;
      return;
    }
  });

  if (alreadyHasRole) {
    utils.sendDelete(message, `You already have the ${role.name} role.`);
    return;
  }
  let success = await utils.takePoints(user_id, price, message.guildId);

  if (success) {
    let successfullyAddedRole = true;
    await roleManager.add(role, 'Bought with points').catch((err) => {
      successfullyAddedRole = false;
      console.log(err);
      utils.sendDelete(message, `ERR: `);
    });
    if (successfullyAddedRole) {
      utils.sendDelete(message, `Successfully bought ${role.name}.`);
      let _role = await Role.findOne({
        guild_id: message.guildId,
        role_id: role.id,
        price,
      });
      console.log(_role);
      if (_role && stock !== -1) {
        _role.stock--;
        _role.save();
        jsonRoles[roleIndex].stock--;
        jsonfile.writeFileSync(ROLES_JSON_FILE, jsonRoles, { spaces: 2 });
      }
    }
  } else {
    utils.sendDelete(message, `Not enough points.`);
  }
};
