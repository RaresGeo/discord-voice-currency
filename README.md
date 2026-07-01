# Discord Voice Currency Bot

A Discord Bot that rewards users with points for being active in voice channels.
Points can be used to play minigames, or spent on a variety of things such as roles or temporarily muting other users.

> This is an old hobby project (~2021, discord.js v13). It's shared here as-is, outdated.

## How it works

### Earning points

Assuming a server is tracked (see [`track`](#admin-commands)), the bot listens to voice state events and updates 
the user's balance as necessary. Users earn a default of `1` point per minute, but there are modifiers based on 
the user's state in the voice channel.

- **Camera on** → `+0.3` to the multiplier
- **Deafened** → `-0.3` to the multiplier

Points are recalculated whenever a user's voice state changes (joining, leaving,
muting, deafening, turning the camera on/off, etc.), as well as 
just before checking their balance using [`points`](#commands).

> Roles carry a `multiplier` field intended to further boost earnings, but wiring
> role multipliers into the point calculation was never finished (see the
> `TODO: INCORPORATE ROLES FOR POINT MULTIPLIERS` note in `utilities/utils.js`).

### Spending points

Points can be spent on mini-games (gambling points), buying roles from the shop, 
or muting people/an entire voice channel.

## Commands

Commands work in the old fashioned Discord Bot way, with a command prefix.
This `prefix` can be configured in the `.env` file.
Commands only work in the designated bot channel, which is set during initial setup of a server.
Admin users (see below) can use commands in any channel.

### Economy

| Command | Aliases | Description |
| --- | --- | --- |
| `points` | `balance`, `money`, `bal`, `currency`, `cash` | Show your balance, or another user's (mention them or pass their user ID). |
| `leaderboard` | `lb`, `leaderboards` | Top 10 richest members in the server. |
| `simp <amount> @user` | `donate` | Give some of your points to another user (`-f` to skip the confirmation prompt). |
| `rob @user` | | Start robbing a user. See [Robbing](#robbing) below. |

### Shop

| Command | Aliases | Description |
| --- | --- | --- |
| `shop` | | Browse the server's purchasable roles (paginated). |
| `buy <role name>` | | Buy a role from the shop with points. Respects stock limits. |

### Minigames

| Command | Aliases | Description |
| --- | --- | --- |
| `roulete <bid>` | `roulette`, `roullette`, `roullete` | Roulette. Post a bid, then everyone reacts to bet on a colour (🟢/🔴/⚫) or odd/even (1️⃣/2️⃣). Green pays 16×, colours and odd/even pay 1×. Resolves after 10 seconds. |
| `rps <bid>` | | Rock–paper–scissors against the bot. Win to double your bid, lose it on a loss, draw returns it. |

### Voice pranks

| Command | Aliases | Description |
| --- | --- | --- |
| `mute @user` | | Server-mute a user for 30 seconds. Costs 50 points. (`-f` to skip confirmation.) |
| `unmute @user` | | Un-mute a user. Costs 1 point. (`-f` to skip confirmation.) |
| `nuke` | `muteall` | Mute everyone in your current voice channel for 30 seconds. Cost scales per person (50 × 1.1ⁿ). Mention users to exclude them; you and bots are always excluded. |

### Fun / info

| Command | Aliases | Description |
| --- | --- | --- |
| `joined` | `members` | The 10 members who joined the server earliest. |

### Admin commands

These commands can only be used by Admin users. An Admin is anyone with the "Ban users" permission on the server.
This is not configurable, currently.

| Command | Aliases | Description |
| --- | --- | --- |
| `track` | | Enable point tracking for the current server and set the current channel as the bot channel. |
| `registerrole` | `rr` | Interactive wizard to add/update a shop role (role ID, price, stock, multiplier). |
| `givepoints -u <uid> -p <amount>` | `give`, `add`, `addpoints`, `givebal`, `givebalance`, `addbal`, `addbalance` | Grant points to a user. |
| `created` | | List the 10 oldest Discord accounts in the server. |
| `getdupes` | | Diagnostic: log any users with duplicate database entries. |
| `getemotes` | `emotes`, `emoji` | Diagnostic: log the raw form of any emoji you react with (useful for finding emoji IDs). |

### Robbing

`rob @user` was introduced as a mechanic to avoid people AFKing in voice channels for points.
User A can start robbing any user B, but the command involves mentioning them.
At any point, user A can "cash in" the robbing, which starts a 5 second delay during which User B can defend himself.
If user B does not defend, user A will steal all of the points that user B would have earned since the rob started
i.e. if user A starts robbing user B and stops it 10 minutes later, they will earn the 10 points user B should have earned in their stead.

If user B counters the rob by typing `rob @userA` at any point, it will counter the rob and the result from above is reversed
user B stealing from user A the same amount of points, essentially earning double points for the time period.

However, user B would be better served to wait, knowing they are being robbed, they can earn more points by waiting and countering later.

The other method of countering is to wait for the moment user A ends the rob and to type anything within the grace period.

This wait-and-see "gameplay" causes some fun interactions, especially with forgetful people or if busy while playing games.

Running `rob` with no mention tells you whether you are actively being robbed.

## Tech stack

- **[discord.js](https://discord.js.org/) v13** — Discord API client
- **[MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)** — persistent storage for users, servers, roles, and rob state
- **[jsonfile](https://www.npmjs.com/package/jsonfile)** — local JSON cache of servers/roles (mirrors MongoDB to reduce reads on hot paths)
- **Node.js 16.x**

### Data models

- **User** — `guild_id`, `user_id`, `points`, `is_active`, `is_active_since`. Point balances are per-user-per-guild.
- **Server** — a tracked guild: `guild_id`, `guild_name`, `is_enabled`, `bot_channel`.
- **Role** — a shop role: `price`, `stock` (`-1` = unlimited), `multiplier`, optional `permissions`.
- **Rob** / **RobCooldown** — in-progress robberies and per-robber cooldowns (cooldown auto-expires via a MongoDB TTL index).

On startup the bot connects to MongoDB and pulls the `Server` and `Role` collections
into `db/json/*.json` for fast local lookups.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a `.env` file** in the project root:

   ```env
   token=YOUR_DISCORD_BOT_TOKEN
   uri=YOUR_MONGODB_CONNECTION_STRING
   prefix=!
   message_life=10
   ```

   | Variable | Description |
   | --- | --- |
   | `token` | Your Discord bot token. |
   | `uri` | MongoDB connection string. |
   | `prefix` | Command prefix (e.g. `!`). |
   | `message_life` | How long (in seconds) temporary bot replies stay before auto-deleting. |

3. **Invite the bot** to your server with the permissions it needs (managing roles,
   muting members, sending messages, reacting). The bot uses the `GUILDS`,
   `GUILD_VOICE_STATES`, `GUILD_MESSAGES`, and `GUILD_MESSAGE_REACTIONS` intents.

4. **Run the bot**

   ```bash
   npm start
   ```

5. **In your server**, run `track` in the channel you want the bot to operate in.
   That enables point tracking and designates that channel as the bot channel.

## Notes & caveats

- This was written for discord.js v13, which is now outdated. Message-content-based
  commands and several APIs used here have since changed.
- The `bot_channel` restriction means non-admins can only use commands in the single
  channel set at `track` time.
- Role point multipliers are stored but not yet applied to earnings.
</content>
</invoke>
