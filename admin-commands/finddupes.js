'use strict';

const config = require('../utilities/config').config;
const User = require('../models/User');
const utils = require('../utilities/utils');
const { incorrectSyntax, finished } = require('../utilities/emojis');
const { MessageEmbed } = require('discord.js');

module.exports = {
  aliases: ['getdupes'],
  event: 'messageCreate',
};

/* module.exports.func = async (message) => {
  return;
}; */

module.exports.command = async (message) => {
  console.log('Started.');
  let allUsers = await User.find({});

  let promises = allUsers.map(async (user) => {
    let allOfThisUser = await User.find({ user_id: user.user_id }).sort({
      points: 'desc',
    });

    if (allOfThisUser.length > 1)
      console.log(
        `There's ${allOfThisUser.length} instances of ${user.user_id}`
      );
  });

  await Promise.all(promises);

  console.log('Finished.');
};
