'use strict';

const config = require('../utilities/config').config;
const User = require('../models/User');
const utils = require('../utilities/utils');
const { incorrectSyntax, finished } = require('../utilities/emojis');
const { MessageEmbed } = require('discord.js');

module.exports = {
  aliases: ['lb', 'leaderboard', 'leaderboards'],
  event: 'messageCreate',
};

/* module.exports.func = async (message) => {
  return;
}; */

module.exports.command = async (message) => {
  let topTen = await User.find({ guild_id: message.guildId })
    .limit(10)
    .sort({ points: 'desc' });

  let bigField = [''];

  let promises = topTen.map(async (user, index) => {
    let _user = await utils.getUser(message, user.user_id);
    return (bigField[index] = `**${index + 1}.** ${_user.tag}  -  💵 ${
      Math.round((user.points + Number.EPSILON) * 100) / 100
    }`);
  });

  await Promise.all(promises);

  if (bigField.length === 1) {
    bigField.push('Nobody has points.');
  }

  bigField = bigField.join('\n');

  // Construct embed
  let embed = new MessageEmbed()
    .setColor('DARK_BUT_NOT_BLACK')
    .setTitle(`${message.guild.name} leaderboard`)
    .addField(`Top ${topTen.length}`, bigField);

  message.channel.send({ embeds: [embed] });
};
