const { cmd } = require("../arslan");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const { fakevCard } = require('../lib/fakevCard');
const config = require("../config");

let botStartTime = Date.now(); // Recording the start time of the bot
const ALIVE_IMG = config.IMAGE_PATH; // 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 branding image

cmd({
    pattern: "alive",
    desc: "Check if the bot is active.",
    category: "owner",
    react: "💡",
    filename: __filename
}, async (conn, mek, m, { reply, from }) => {
    try {
        const brand = conn.brand || null;
        const botDisplayName = (brand && brand.botName) || config.BOT_NAME || '𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱';
        const channelJid = (brand && brand.channelJid) || config.CHANNEL_JID;
        const channelName = botDisplayName;

        const pushname = m.pushName || "User"; // Username or default value
        const currentTime = moment().format("HH:mm:ss");
        const currentDate = moment().format("dddd, MMMM Do YYYY");

        const runtimeMilliseconds = Date.now() - botStartTime;
        const runtimeSeconds = Math.floor((runtimeMilliseconds / 1000) % 60);
        const runtimeMinutes = Math.floor((runtimeMilliseconds / (1000 * 60)) % 60);
        const runtimeHours = Math.floor(runtimeMilliseconds / (1000 * 60 * 60));

        const formattedInfo = `
╭┄┄┄┄[ *${botDisplayName} sᴛᴀᴛᴜs* ]┄┄┄┄
┊
┊     Hi 🫵🏽 ${pushname}
┊
┊🕒 *ᴛɪᴍᴇ*: ${currentTime}
┊📅 *ᴅᴀᴛᴇ*: ${currentDate}
┊⏳ *ᴜᴘᴛɪᴍᴇ*: ${runtimeHours} hours, ${runtimeMinutes} minutes, ${runtimeSeconds} seconds
╰───────────────

> 🤖 *Status*: *${botDisplayName} is Alive and Ready!*

🎉 *Enjoy the Service!*
        `.trim();

        // Check if the image is defined (local file, remote URL, or per-user custom image)
        const imgTarget = (brand && brand.botImage) || ALIVE_IMG;
        if (!imgTarget) {
            throw new Error("ALIVE_IMG not set. Please set config.IMAGE_PATH.");
        }
        let imageSource;
        if (typeof imgTarget === 'string' && imgTarget.startsWith('data:')) {
            imageSource = Buffer.from(imgTarget.split(',')[1] || '', 'base64');
        } else if (typeof imgTarget === 'string' && fs.existsSync(imgTarget)) {
            imageSource = fs.readFileSync(imgTarget);
        } else {
            imageSource = { url: imgTarget };
        }

        // Send the message with image and caption — forwarded from
        // the number's own channel if they set one, else the default channel.
        const msgPayload = {
            image: imageSource,
            caption: formattedInfo,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelJid,
                    newsletterName: channelName,
                    serverMessageId: 143
                }
            }
        };
        await conn.sendMessage(from, msgPayload, { quoted: fakevCard });

    } catch (error) {
        console.error("Error in alive command: ", error.message);
        
        // Respond with error details 
        const errorMessage = `
❌ An error occurred while processing the alive command.
🛠 *Error Details*:
${error.message}

Please report this issue or try again later.
        `.trim();
        return reply(errorMessage);
    }
});
