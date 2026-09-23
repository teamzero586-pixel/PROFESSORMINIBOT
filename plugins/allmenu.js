const { cmd, commands } = require("../arslan");
const moment = require("moment-timezone");
const fs = require("fs");
const { fakevCard } = require('../lib/fakevCard');
const config = require("../config");

const categoryIcons = {
    system: "⚙️", general: "🌐", owner: "👑", group: "👥",
    admin: "🛡️", download: "📥", downloader: "📥", fun: "🎉",
    search: "🔍", tools: "🧰", sticker: "🖼️", ai: "🤖",
    convert: "🔄", nsfw: "🔞", anti: "🚫", other: "✨"
};

// ============================================================
// 10 DIFFERENT MENU DESIGNS — one is picked at random every time
// someone runs .menu, so it doesn't look the same twice in a row.
// ============================================================
const THEMES = [
    // 1. Classic sharp box
    {
        header: (n, o, c, t, d) => `╭━━━❰ *${n}* ❱━━━┈⊷\n┃\n┃ 👑 *Owner*    : ${o}\n┃ 📦 *Commands* : *${c}*\n┃ ⏰ *Time*     : ${t}\n┃ 📅 *Date*     : ${d}\n┃ 🚀 *Platform* : ${n}\n┃\n╰━━━━━━━━━━━━━━━━━━━┈⊷`,
        cat: (icon, cat) => `\n╭─❖ ${icon} *${cat}* ❖─╮`,
        bullet: c => `│ ➤ ${c}`,
        catEnd: `╰────────────────╯`,
        footer: n => `━━━━━━━━━━━━━━━━━━━\n   *Powered By ${n}*\n━━━━━━━━━━━━━━━━━━━`
    },
    // 2. Double-line formal box
    {
        header: (n, o, c, t, d) => `╔══════════════════╗\n║  *${n}*\n╠══════════════════╣\n║ 👑 Owner    : ${o}\n║ 📦 Commands : *${c}*\n║ ⏰ Time     : ${t}\n║ 📅 Date     : ${d}\n╚══════════════════╝`,
        cat: (icon, cat) => `\n▓▒░ ${icon} *${cat}* ░▒▓`,
        bullet: c => `  ▸ ${c}`,
        catEnd: ``,
        footer: n => `╔══════════════════╗\n║  *${n}* — Powered\n╚══════════════════╝`
    },
    // 3. Rounded dotted style
    {
        header: (n, o, c, t, d) => `╭┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈╮\n┊ 🌸 *${n}* 🌸\n┊ 👑 ${o}\n┊ 📦 ${c} Commands\n┊ ⏰ ${t} • 📅 ${d}\n╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈╯`,
        cat: (icon, cat) => `\n✧───「 ${icon} *${cat}* 」───✧`,
        bullet: c => `   ✧ ${c}`,
        catEnd: ``,
        footer: n => `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n   made with 🌸 ${n}\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`
    },
    // 4. Star themed
    {
        header: (n, o, c, t, d) => `★═══════════════★\n   *${n}*\n★═══════════════★\n⋆ Owner: ${o}\n⋆ Commands: *${c}*\n⋆ ${t} | ${d}\n★═══════════════★`,
        cat: (icon, cat) => `\n☆彡 ${icon} *${cat}* 彡☆`,
        bullet: c => `  ⋆ ${c}`,
        catEnd: ``,
        footer: n => `★═══════════════★\n  *${n}* ⭐\n★═══════════════★`
    },
    // 5. Neon bracket style
    {
        header: (n, o, c, t, d) => `『 *${n}* 』\n\n⟡ Owner    : ${o}\n⟡ Commands : *${c}*\n⟡ Time     : ${t}\n⟡ Date     : ${d}`,
        cat: (icon, cat) => `\n『 ${icon} *${cat}* 』`,
        bullet: c => `  ⟡ ${c}`,
        catEnd: ``,
        footer: n => `『 *${n}* 』`
    },
    // 6. Minimalist clean lines
    {
        header: (n, o, c, t, d) => `── *${n}* ──\n\nOwner    : ${o}\nCommands : *${c}*\nTime     : ${t}\nDate     : ${d}`,
        cat: (icon, cat) => `\n── ${icon} ${cat} ──`,
        bullet: c => `• ${c}`,
        catEnd: ``,
        footer: n => `── Powered by ${n} ──`
    },
    // 7. Emoji-heavy fun style
    {
        header: (n, o, c, t, d) => `🌟━━━━━━━━━━━━🌟\n✨ *${n}* ✨\n🌟━━━━━━━━━━━━🌟\n👑 ${o}\n📦 ${c} commands loaded!\n⏰ ${t} 📅 ${d}`,
        cat: (icon, cat) => `\n🎈 ${icon} *${cat}* 🎈`,
        bullet: c => `   🌟 ${c}`,
        catEnd: ``,
        footer: n => `🎉 *${n}* 🎉\n🌟━━━━━━━━━━━━🌟`
    },
    // 8. Retro terminal style
    {
        header: (n, o, c, t, d) => `[ ${n} ]\n----------------\n> owner    : ${o}\n> commands : ${c}\n> time     : ${t}\n> date     : ${d}\n----------------`,
        cat: (icon, cat) => `\n[ ${cat.toLowerCase()} ]`,
        bullet: c => `  >> ${c}`,
        catEnd: ``,
        footer: n => `----------------\n[ powered by ${n} ]`
    },
    // 9. Elegant floral
    {
        header: (n, o, c, t, d) => `❦───────────────❦\n   *${n}*\n❦───────────────❦\n❧ Owner: ${o}\n❧ Commands: *${c}*\n❧ ${t} · ${d}`,
        cat: (icon, cat) => `\n❦ ${icon} *${cat}*`,
        bullet: c => `   ❧ ${c}`,
        catEnd: ``,
        footer: n => `❦───────────────❦\n   ${n}\n❦───────────────❦`
    },
    // 10. Futuristic block style
    {
        header: (n, o, c, t, d) => `▓▒░━━━━━━━━━━░▒▓\n  *${n}*\n▓▒░━━━━━━━━━━░▒▓\n▹ Owner: ${o}\n▹ Commands: *${c}*\n▹ ${t} | ${d}`,
        cat: (icon, cat) => `\n▓▒░ ${icon} *${cat}*`,
        bullet: c => `   ▹ ${c}`,
        catEnd: ``,
        footer: n => `▓▒░━━━━━━━━━━░▒▓\n   ${n}\n▓▒░━━━━━━━━━━░▒▓`
    }
];

cmd({
    pattern: "menu",
    alias: ["commandlist", "allmenu", "help"],
    desc: "Fetch and display all available bot commands",
    category: "system",
    filename: __filename,
}, async (conn, mek, m, { reply }) => {
    try {
        const brand = conn.brand || null;
        const botDisplayName = (brand && brand.botName) || config.BOT_NAME || '𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱';
        const channelJid = (brand && brand.channelJid) || config.CHANNEL_JID;

        let grouped = {};
        for (const cmd of commands) {
            if (!cmd.pattern || !cmd.category) continue;
            if (!grouped[cmd.category]) grouped[cmd.category] = [];
            grouped[cmd.category].push(cmd.pattern);
        }

        const totalCommands = 611; // displayed branding figure
        const theme = THEMES[Math.floor(Math.random() * THEMES.length)];

        let menuText = "";
        const sortedCats = Object.keys(grouped).sort();
        for (const cat of sortedCats) {
            const icon = categoryIcons[cat.toLowerCase()] || "🔸";
            menuText += theme.cat(icon, cat.toUpperCase()) + "\n";
            menuText += grouped[cat].map(theme.bullet).join("\n");
            if (theme.catEnd) menuText += `\n${theme.catEnd}`;
            menuText += "\n";
        }

        const time = moment().tz("Africa/Kampala").format("HH:mm:ss");
        const date = moment().tz("Africa/Kampala").format("dddd, MMMM Do YYYY");
        const ownerText = config.OWNER_NAME || 'Owner';

        const caption = `${theme.header(botDisplayName, ownerText, totalCommands, time, date)}

*✨ Type .help <command> for details ✨*
${menuText}
${theme.footer(botDisplayName)}`.trim();

        const { getBotImage } = require('../lib/botSettings');
        const resolvedImage = getBotImage(brand);
        const menuImageSource = Buffer.isBuffer(resolvedImage) ? resolvedImage : (resolvedImage || { url: "https://files.catbox.moe/prkkzj.png" });

        const menuPayload = {
            image: menuImageSource,
            caption,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelJid,
                    newsletterName: botDisplayName,
                    serverMessageId: 2,
                }
            }
        };
        await conn.sendMessage(m.chat, menuPayload, { quoted: fakevCard });

    } catch (err) {
        console.error("AllMenu Error:", err.message);
        reply("❌ Error while generating menu.");
    }
});
