# AHMADSHAHZAD MD-BOT — AI Command-Writing Prompt (v2)

Copy everything below this line and send it to any AI (ChatGPT, Claude, Gemini, etc.)
along with what command you want. The AI will write a command file that works
directly in this bot — just paste the file into the right folder, no other
file needs to be touched.

---

## PROMPT (copy from here)

You are writing a command (plugin) for a WhatsApp bot called **AHMADSHAHZAD MD-BOT**
(powered by ✌︎︎𝑨𝑯𝑴𝑨𝑫☠︎︎𝑺𝑯𝑨𝑯𝒁𝑨𝑫✌︎︎), built on Node.js + Baileys. Follow this EXACT contract —
do not invent a different structure.

### File location
Save the command inside:
```
plugins/ported-commands/<category>/<commandname>.js
```
Pick `<category>` from: `ai`, `anime`, `dev`, `fun`, `general`, `group`, `media`,
`textmaker`, `utility` (use an existing one that fits — only create a new
category folder if none fit).

### Required structure

```js
module.exports = {
    name: 'commandname',          // the word after the prefix, lowercase, no spaces
    aliases: ['alias1'],          // optional
    category: 'fun',
    description: 'What this command does',
    usage: '.commandname <args>',

    // optional guards — only include the ones you need
    ownerOnly: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,

    async execute(sock, msg, args, extra) {
        try {
            await extra.reply('Hello!');
        } catch (error) {
            await extra.reply(`❌ ${error.message}`);
        }
    }
};
```

### The `extra` object (4th argument) — fields you can use

| Field | Type | Meaning |
|---|---|---|
| `extra.from` | string | Chat JID to reply in |
| `extra.sender` | string | Sender's JID |
| `extra.isGroup` | boolean | True if message is from a group |
| `extra.groupMetadata` | object | Group info (if in a group) |
| `extra.isOwner` | boolean | True if sender is the bot owner |
| `extra.isAdmin` | boolean | True if sender is a group admin |
| `extra.isBotAdmin` | boolean | True if the bot itself is a group admin |
| `extra.config` | object | Bot config (`prefix`, `botName`, `ownerName`, `ownerNumber`, `newsletterJid`, `social.*`) |
| `extra.reply(text)` | function | Send a text reply — the correct branding image + channel-forward tag is attached **automatically** (per-number custom branding if the connected number set one, otherwise the default). Never attach your own image for a plain text reply. |
| `extra.react(emoji)` | function | React to the triggering message with an emoji |

### Other function arguments
- `sock` — the live Baileys socket. Use `sock.sendMessage(extra.from, {...})`
  directly only when you need to send your OWN media (a downloaded video,
  a generated sticker, etc.) — for plain text, always prefer `extra.reply()`.
- `msg` — the raw incoming message object (`msg.key`, `msg.message`).
- `args` — array of words typed after the command.

### Sending your own media (example)
Prefer sending a **Buffer** over a raw `{ url }` — it's more reliable, since
some hosts block hotlinking or expire links quickly:
```js
const axios = require('axios');
const resp = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
await sock.sendMessage(extra.from, {
    video: Buffer.from(resp.data),
    mimetype: 'video/mp4',
    caption: "Here you go!"
}, { quoted: msg });
```

### YouTube / media downloads
Use the **`ytdl-core`** package (already installed) instead of unverified
third-party download APIs — those tend to go down or rate-limit without
warning:
```js
const ytdl = require('ytdl-core');
const yts = require('yt-search');

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}
// search with yts(query) if the input isn't already a YouTube URL,
// then ytdl.getBasicInfo(url) + ytdl.downloadFromInfo(info, { filter, quality })
```
Always cap duration (e.g. reject anything over 10–15 minutes) to avoid huge
in-memory buffers on a small server.

### Rules the AI must follow
1. Always wrap the command logic in `try/catch` and reply with a friendly
   error message on failure — never let it crash silently.
2. Never hardcode the bot owner's name/number/prefix — read from `extra.config`.
3. Keep `name` short, lowercase, no spaces, and **different from any command
   that might already exist**. Do not reuse any of these existing names:
   `menu`, `ping`, `alive`, `owner`, `pair`, `pair2`, `kick`, `kickall`,
   `promote`, `demote`, `tagall`, `hidetag`, `welcome`, `goodbye`, `mode`,
   `setprefix`, `unblock`, `antilink`, `antidelete`, `antidelstatus`,
   `anticall`, `anti-call`, `antibad`, `apk`, `attp`, `song`, `video`, `add`,
   `online`, `autobio`, `autoread`, `autotyping`, `autorecording`,
   `autolikestatus`, `autoviewsview`, `fb`, `igdl`, `igdl2`, `igdl4`, `ig3`,
   `yts`, `vv`, `screenshot`, `leave`, `end`, `botadmin`, `admincheck`,
   `groupstatus`, `removeadmins`, `acceptall`, `rejectall`, `requestlist`.
4. Pick the most fitting existing category folder.
5. If the command needs a paid/external API key that isn't something a free
   public API already covers, say so clearly instead of pretending it will work.
6. Return ONLY the finished `.js` file content, ready to paste directly, with
   no explanation mixed into the code.
7. Never write anything sexual/adult, or content aimed at or sexualizing minors,
   under any framing.

### My request
Now write a command that does the following:

> _(describe here exactly what you want the command to do — e.g. "a `.quote`
> command that sends a random motivational quote", or "a `.sticker` command
> that converts a replied image into a sticker")_

---

## PROMPT (copy up to here)

### How to add the finished command to your bot
1. The AI will give you back a full `.js` file.
2. Save it as `plugins/ported-commands/<category>/<commandname>.js`.
3. Upload/paste that file into the repo at that exact path.
4. Restart the bot (or redeploy) — it loads automatically on boot via
   `plugins/zzz-ported-commands-loader.js`. Nothing else needs to change.

### Branding image & channel forward
Every command reply now automatically goes out with the correct branding
image attached AND a "forwarded from channel" tag — using that number's own
custom name/image/channel if they set one via the pairing page's "Customize
My Bot" section, otherwise the default AHMADSHAHZAD MD-BOT branding/channel. This is
handled centrally in `main.js` (`brandedReply`) — you never need to attach it
yourself in a new command unless you're sending custom media directly via `sock`.

### Admin panel
`/admin` (passcode-protected) lets the deployer see all connected numbers,
add/remove channels from the react/follow list, and bulk-join all connected
numbers into a WhatsApp group. This isn't something a new command needs to
touch.

### Advanced: the native `cmd()` format
A smaller set of core commands (`.menu`, `.ping`, `.alive`, `.pair`, group
admin tools, etc.) live directly in `plugins/*.js` using a different, lower-level
contract built on `require("../arslan")`'s `cmd()` function, with a callback
shaped `(conn, mek, m, ctx) => {}`. You generally don't need this for new
commands — the ported format above is simpler and is the default for
anything new. Only ask for the native format if you're modifying one of
those existing core files.
