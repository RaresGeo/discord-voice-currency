'use strict';

const { config } = require('./utilities/config');
const utils = require('./utilities/utils');
const { incorrectSyntax } = require('./utilities/emojis');
const { pullAll } = require('./db/pull');
// const { importFromCSV } = require("./csv")
const { Client, Intents } = require('discord.js');
const connectDB = require('./utilities/mongo');
const jsonfile = require('jsonfile');

const myIntents = new Intents();
myIntents.add(
  Intents.FLAGS.GUILD_VOICE_STATES,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILDS
);

const client = new Client({ intents: myIntents });

client.commands = {
  messageCreate: {},
};

client.modules = {
  messageCreate: {},
  voiceStateUpdate: {},
};

const registerCommand = (module, isAdminCommand = false) => {
  if (module.func && typeof module.func === 'function') {
    client.modules[module.event][module.aliases[0]] = module.func;
  }
  if (module.command && typeof module.command === 'function') {
    module.aliases.map((alias) => {
      client.commands['messageCreate'][alias] = {
        command: module.command,
        isAdminCommand,
      };
    });
  } else {
    module.aliases.map((alias) => {
      client.commands['messageCreate'][alias] = module;
    });
  }
};

const removeCommand = (module) => {
  if (module.func && typeof module.func === 'function') {
    client.modules[module.event][module.aliases[0]] = (message) => {
      return;
    };
  }
};

client.on('ready', () => {
  let _cmds = require('fs').readdirSync('./commands');
  for (let i = 0; i < _cmds.length; i++) {
    let cmd = require(`./commands/${_cmds[i]}`);
    registerCommand(cmd);
  }

  _cmds = require('fs').readdirSync('./admin-commands');
  for (let i = 0; i < _cmds.length; i++) {
    let cmd = require(`./admin-commands/${_cmds[i]}`);
    registerCommand(cmd, true);
  }

  console.log('Logged in as ' + client.user.tag + ' successfully.');
});

// Handle all commands
client.on('messageCreate', (message) => {
  /* if(message.content == "import csv" && utils.isTrusted(message)) {
    importFromCSV(message, "statbot_top_member_voice.csv")
  } */

  // Pass on message to all passive commands
  Object.keys(client.modules['messageCreate']).map((key) => {
    client.modules['messageCreate'][key](message);
  });

  // Handle actual commands

  if (message.content.startsWith(config.prefix)) {
    // Starts with prefix
    let split = message.content.toLowerCase().split(/\s+/);
    let command;
    if (split[0] === config.prefix) {
      command = split[1];
    } else {
      command = split[0].substr(1);
    }

    if (command !== 'track') {
      let guild_id = message.guildId;

      const servers = jsonfile.readFileSync('./db/json/servers.json');
      let currentServer = servers.find(
        (server) => server.guild_id === guild_id
      );
      if (
        currentServer &&
        !utils.isTrusted(message) &&
        message.channel.id !== currentServer.bot_channel
      ) {
        return;
      }
    }

    if (!client.commands['messageCreate'][command]) {
      // React to message with an emoji indicating the command does not exist
      return;
    }

    // Real command, verify if admin
    if (
      typeof client.commands['messageCreate'][command].command === 'function'
    ) {
      // User needs to be an admin
      if (
        client.commands['messageCreate'][command].isAdminCommand &&
        !utils.isTrusted(message)
      ) {
        message.react(incorrectSyntax);
        return;
      }
      // React to message with an emoji indicating the command is being executed
      client.commands['messageCreate'][command].command(message);
    }
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  // Pass on event to all commands of this type
  Object.keys(client.modules['voiceStateUpdate']).map((key) => {
    client.modules['voiceStateUpdate'][key](oldState, newState);
  });
});

// These are unnecessary for now.

/* client.on("messageDelete", async (message) => {
    Object.keys(client.modules['messageDelete']).map(key => {
        client.modules['messageDelete'][key](message)
    })
})

client.on("messageUpdate", async(oldMessage, newMessage) => {
    Object.keys(client.modules['messageUpdate']).map(key => {
        client.modules['messageUpdate'][key](oldMessage, newMessage)
    })
}) */

connectDB().then(async () => {
  await pullAll();
  client.login(config.token);
});
