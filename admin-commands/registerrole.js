"use strict";

const { config } = require("../utilities/config");
const Role = require("../models/Role");
const { sendDelete } = require("../utilities/utils");
const { incorrectSyntax } = require("../utilities/emojis");
const { MessageEmbed, MessageCollector } = require("discord.js");
const { pullModel } = require("../db/pull");

module.exports = {
  aliases: ["registerrole", "rr"],
  event: "messageCreate",
};

const missingArguments = "Invalid syntax. You need to pass in these arguments:";

module.exports.command = async (message) => {
  // guild_id, role_id, name, price, stock, multiplier, permissions;

  let embedColor = "DARK_BUT_NOT_BLACK";
  let guild_id = message.guildId;
  let role_id;
  let role;
  let name;
  let price;
  let stock;
  let multiplier;

  let embed = new MessageEmbed().setColor(embedColor).setTitle(`Register a new role`).addField("Role id", `Type in the ID of the role.`);
  let initialMessage = await message.channel.send({ embeds: [embed] });
  const filter = (m) => m.author === message.author;
  let messageCollector = new MessageCollector(message.channel, { filter, time: 60 * 1000 });

  messageCollector.on("collect", async (m) => {
    if (!role_id) {
      if (m.content.length == 18) {
        // Looks like it's good format, now try to find it in the cache
        role = await message.guild.roles.fetch(m.content).catch((err) => console.error(err));

        if (!role) {
          // failed, try again
          sendDelete(message, `Couldn't find the roles. The id must be incorrect.`);
        } else {
          name = role.name;
          embedColor = role.hexColor;
          role_id = m.content;
          embed = new MessageEmbed()
            .setColor(embedColor)
            .setTitle(`Register a new role`)
            .addField("Role id", role_id)
            .addField("Name", name)
            .addField("Price", `Type in the price of the role`);

          await initialMessage.delete();
          initialMessage = await message.channel.send({ embeds: [embed] });
        }
      } else {
        sendDelete(message, `Incorrect format, send the uuid of the role.`);
      }
    } else if (!price) {
      let tempPrice = parseInt(m.content);
      if (!isNaN(tempPrice)) {
        price = tempPrice;
        embed = new MessageEmbed()
          .setColor(embedColor)
          .setTitle(`Register a new role`)
          .addField("Role id", role_id)
          .addField("Name", name)
          .addField("Price", `💵 ${price}`)
          .addField("Stock", `Type in the stock of the role, -1 for infinite`);

        await initialMessage.delete();
        initialMessage = await message.channel.send({ embeds: [embed] });
      } else {
        sendDelete(message, `Price is not a valid integer`);
      }
    } else if (!stock) {
      let tempStock = parseInt(m.content);
      if (!isNaN(tempStock)) {
        stock = tempStock;
        embed = new MessageEmbed()
          .setColor(embedColor)
          .setTitle(`Register a new role`)
          .addField("Role id", role_id)
          .addField("Name", name)
          .addField("Price", `💵 ${price}`)
          .addField("Stock", `${stock} roles`)
          .addField("Multiplier", `Type in the multiplier of the role, 1 for default (obviously)`);

        await initialMessage.delete();
        initialMessage = await message.channel.send({ embeds: [embed] });
      } else {
        sendDelete(message, `Stock is not a valid integer`);
      }
    } else if (!multiplier) {
      let tempMultiplier = parseInt(m.content);
      if (!isNaN(tempMultiplier)) {
        multiplier = tempMultiplier;
        embed = new MessageEmbed()
          .setColor("GREEN")
          .setTitle(`Register a new role`)
          .addField("Role id", role_id)
          .addField("Name", name)
          .addField("Price", `💵 ${price}`)
          .addField("Stock", `${stock} roles`)
          .addField("Multiplier", `${multiplier}x`);

        await initialMessage.delete();
        initialMessage = await message.channel.send({ embeds: [embed] });

        messageCollector.stop("Finished collecting.");
      } else {
        sendDelete(message, `Multiplier is not a valid integer`);
      }
    }

    if (role_id && name && price && stock && multiplier) {
      messageCollector.stop("Finished collecting.");
    }
  });

  messageCollector.on("end", async (collected, reason) => {
    if (reason === "time") {
      await initialMessage.delete();
      sendDelete(message, `Ran out of time, try again and type faster this time, old man.`);
    } else {
      // Check if user is already in database
      let _role = await Role.findOne({ guild_id, role_id });

      // guild_id, role_id, name, price, stock, multiplier, permissions;
      if (!_role) {
        _role = new Role({
          guild_id,
          role_id,
          name,
          price,
          stock,
          multiplier,
        });
        sendDelete(message, `Creating role...`);
      } else {
        _role.guild_id = guild_id;
        _role.name = name;
        _role.price = price;
        _role.stock = stock;
        _role.multiplier = multiplier;
        sendDelete(message, `Updating role...`);
      }

      await _role.save().catch((err) => console.error(err));
      sendDelete(message, `Finished operation.`);
      // This here pulls all roles instead of appending the one that we just added, really inefficient but I'm lazy and this command won't be used often.
      const rolesFile = "./db/json/roles.json";
      pullModel(rolesFile, Role, "roles");
    }
  });
};
