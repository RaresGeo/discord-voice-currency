const config = require("./config").config;
const { finished, incorrectSyntax } = require("./emojis");
const User = require("../models/User");

module.exports.sendDelete = async (message, string, time = config.message_life * 1000) => {
    let _msg = await message.channel.send(string);

    setTimeout(() => {
        _msg.delete();
    }, time);
};

module.exports.edit = async (message, string) => {
    if (message.editable) {
        return message
            .edit(string)
            .then((msg) => {
                msg.edit(string);
                return msg.fetch();
            })
            .catch(console.error);
    } else {
        return message.channel
            .send(`...`)
            .then((msg) => {
                msg.edit(string);
                return msg.fetch();
            })
            .catch(console.error);
    }
};

module.exports.isTrusted = (message) => {
    let member = message.member;
    if (member) {
        let { permissions } = member;
        return permissions.has("BAN_MEMBERS", true);
    } else return false;
};

module.exports.react = (message, reaction = finished) => {
    let { reactions } = message;
    reactions.removeAll();
    message.react(reaction);
};

const isFlag = (string) => {
    return isNaN(parseInt(string)) && string.startsWith("-");
};

module.exports.parseArgs = (string) => {
    let parsedArgs = {
        _: [],
    };

    let split = string.toLowerCase().split(/\s+/);
    if (split[0] === config.prefix) {
        args = split.slice(2);
    } else {
        args = split.slice(1);
    }

    for (let i = 0; i < args.length; i++) {
        if (isFlag(args[i])) {
            args[i] = args[i].substr(1);
            // If the next one is not a flag, set this one's value to it
            if (args[i + 1] && !isFlag(args[i + 1])) {
                parsedArgs[args[i]] = args[i + 1];
                i++;
            } else {
                parsedArgs[args[i]] = true;
            }
        } else {
            parsedArgs._.push(args[i]);
        }
    }

    return parsedArgs;
};

module.exports.getUser = async (message, id) => {
    return message.client.users.fetch(id);
};

module.exports.getPoints = async (message, user_id, guild_id) => {
    // Look for the user with the given uid

    let _user = await User.findOne({ user_id, guild_id });

    if (!_user) {
        _user = new User({
            guild_id,
            user_id: user_id,
            points: 0,
            is_active: false,
            is_active_since: Date.now(),
        });
    }

    return _user.points;
};

module.exports.givePoints = async (user_id, points, guild_id) => {
    let finishReaction;
    // Look for the user with the given uid

    let _user = await User.findOne({ user_id, guild_id });

    if (!_user) {
        _user = new User({
            guild_id,
            user_id: user_id,
            points: parseInt(points),
            is_active: false,
            is_active_since: Date.now(),
        });
    } else {
        // They already exist, so just give them the points.
        _user.points += parseInt(points);
    }

    try {
        finishReaction = finished;
        await _user.save();
    } catch (err) {
        finishReaction = incorrectSyntax;
        console.error(err);
    }

    //message.channel.send(`New balance is ${_user.points}`);

    return _user.points;
};

module.exports.takePoints = async (user_id, points, guild_id) => {
    let _user = await User.findOne({ user_id, guild_id });

    // If they do not exist, based on the fact that they have 0 points they probably can't afford it
    if (!_user) {
        return false;
    } else {
        // They exist, check if they have enough points.
        if (_user.points > parseInt(points)) {
            _user.points -= parseInt(points);
        } else {
            return false;
        }
    }

    try {
        await _user.save();
        return _user.points;
    } catch (err) {
        console.error(err);
        return false;
    }
};

module.exports.updatePoints = async (user_id, guild, oldState = null) => {
    let points = 0;
    let guild_id = guild.id;
    let _user = await User.findOne({ user_id, guild_id });
    let voiceState = await guild.members.fetch(user_id);
    voiceState = voiceState.voice;
    if (!oldState) oldState = voiceState;

    // If they are not, create a new database and give them 0 points
    if (!_user) {
        _user = new User({
            guild_id,
            user_id,
            points,
            is_active: !!voiceState.channel,
            is_active_since: Date.now(),
        });
        await _user.save().catch((err) => console.error(err));
        return Math.round((points + Number.EPSILON) * 100) / 100;
    } else {
        // They already are in db
        // Assign points if they were previously active
        if (_user.is_active) {
            let multiplier = 1;

            multiplier += oldState.selfVideo ? 0.3 : 0;
            multiplier -= oldState.deaf ? 0.3 : 0;
            let newPoints = multiplier * this.differenceInMinutes(_user.is_active_since, Date.now());
            _user.points += newPoints;
        }
        // TODO: INCORPORATE ROLES FOR POINT MULTIPLIERS

        // Reassign active value
        _user.is_active = !!voiceState.channel;
        _user.is_active_since = Date.now();
        points = _user.points;
    }
    await _user.save().catch((err) => console.error(err));
    return Math.round((points + Number.EPSILON) * 100) / 100;
};

module.exports.differenceInMinutes = (oldDate, newDate) => {
    const difference = Math.abs(newDate - oldDate);
    let points = difference / 1000 / 60;
    return Math.round((points + Number.EPSILON) * 100) / 100;
};

module.exports.catchError = (err) => {
    console.error(err);
};
