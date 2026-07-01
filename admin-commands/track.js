"use strict";

const { config } = require("../utilities/config");
const Server = require("../models/Server");
const utils = require("../utilities/utils");
const { incorrectSyntax, finished } = require("../utilities/emojis");

module.exports = {
    aliases: ["track"],
    event: "voiceStateUpdate",
};

// TODO: DANIEL: Either add untrack or remove this comment.
const alreadyIsTracked = `This server is already being tracked, run \`${config.prefix}untrack\` to untrack.`;

module.exports.func = async (oldState, newState) => {
    // New voice event, here's what we need to do
    // First of all check if the guild the event happened in is being tracked.
    let guild_id = newState.guild.id;
    let _server = await Server.findOne({ guild_id });

    if (!(_server && _server.is_enabled)) {
        return;
    }

    let user_id = newState.id;

    utils.updatePoints(user_id, newState.guild, oldState);
};

module.exports.command = async (message) => {
    let finishReaction;
    let guild_id = message.guildId;
    let _server = await Server.findOne({ guild_id });

    // We did not find the _server, create the model.
    if (!_server) {
        let guild_name = message.guild.name;
        _server = new Server({
            guild_id,
            guild_name,
            is_enabled: true,
            bot_channel: message.channel.id,
        });
    } // Server already exists, enable or send message
    else {
        if (!_server.is_enabled) {
            _server.is_enabled = true;
            _server.bot_channel = message.channel.id;
        } else {
            message.channel.send(alreadyIsTracked);
        }
    }

    try {
        finishReaction = finished;
        await _server.save();
    } catch (err) {
        finishReaction = incorrectSyntax;
        console.error(err);
    }

    utils.react(message, finishReaction);
};
