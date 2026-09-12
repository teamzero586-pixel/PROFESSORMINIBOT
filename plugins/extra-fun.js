// ============================================
// 🎉 EXTRA FUN COMMANDS - ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀
// 👑 Owner: ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀
// .wife .husband .love .roast .fact .8ball .rate .simp .character
// (.ship, .joke, .truth, .dare already exist under ported-commands/fun)
// ============================================

const { cmd } = require('../arslan');

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function targetOf(m, args, mentionedJid, quoted) {
    if (mentionedJid && mentionedJid[0]) return mentionedJid[0];
    if (quoted && quoted.sender) return quoted.sender;
    return null;
}

// ─── .wife ───
const WIFE_LINES = [
    "Your WhatsApp wife today is *{name}* 💍 — congrats, be good to her!",
    "Match found! *{name}* is your wife for the next 24 hours 😘",
    "The algorithm has spoken: *{name}* is officially your wife 💒",
    "Breaking news: *{name}* said yes! You're married now 👰",
];

cmd({
    pattern: "wife",
    desc: "Randomly assigns a fun 'wife' from the group",
    category: "fun",
    react: "💍",
    filename: __filename
}, async (conn, mek, m, { from, reply, isGroup, participants, mentionedJid, quoted }) => {
    try {
        let name;
        const target = targetOf(m, [], mentionedJid, quoted);
        if (target) {
            name = '@' + target.split('@')[0];
        } else if (isGroup && Array.isArray(participants) && participants.length > 1) {
            const others = participants.filter(p => p.id !== m.sender);
            const chosen = pick(others.length ? others : participants);
            name = '@' + chosen.id.split('@')[0];
        } else {
            name = "someone mysterious 👀";
        }

        const text = pick(WIFE_LINES).replace('{name}', name);
        await conn.sendMessage(from, { text, mentions: target ? [target] : (isGroup ? participants?.map(p => p.id) : []) }, { quoted: mek });
    } catch (e) {
        console.error("wife error:", e.message);
        reply("❌ Couldn't find you a wife right now, try again.");
    }
});

// ─── .husband ───
const HUSBAND_LINES = [
    "Your WhatsApp husband today is *{name}* 🤵 — treat him well!",
    "It's official: *{name}* is your husband for the day 💍",
    "Congratulations, you're now married to *{name}* 👨‍❤️‍👨",
];

cmd({
    pattern: "husband",
    desc: "Randomly assigns a fun 'husband' from the group",
    category: "fun",
    react: "🤵",
    filename: __filename
}, async (conn, mek, m, { from, reply, isGroup, participants, mentionedJid, quoted }) => {
    try {
        let name;
        const target = targetOf(m, [], mentionedJid, quoted);
        if (target) {
            name = '@' + target.split('@')[0];
        } else if (isGroup && Array.isArray(participants) && participants.length > 1) {
            const others = participants.filter(p => p.id !== m.sender);
            const chosen = pick(others.length ? others : participants);
            name = '@' + chosen.id.split('@')[0];
        } else {
            name = "someone mysterious 👀";
        }

        const text = pick(HUSBAND_LINES).replace('{name}', name);
        await conn.sendMessage(from, { text, mentions: target ? [target] : (isGroup ? participants?.map(p => p.id) : []) }, { quoted: mek });
    } catch (e) {
        console.error("husband error:", e.message);
        reply("❌ Couldn't find you a husband right now, try again.");
    }
});

// ─── .love (compatibility between two people) ───
cmd({
    pattern: "love",
    desc: "Calculates a fun random love percentage between two people",
    category: "fun",
    react: "❤️",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, isGroup, mentionedJid, quoted, pushname }) => {
    try {
        let a = pushname || "You";
        let bJid = targetOf(m, args, mentionedJid, quoted);
        let b = bJid ? '@' + bJid.split('@')[0] : (args.join(' ').trim() || null);

        if (!b) {
            return reply("💌 Tag someone or give a name, e.g. `.love @someone`");
        }

        const percent = Math.floor(Math.random() * 101);
        const bar = "❤️".repeat(Math.round(percent / 10)) + "🤍".repeat(10 - Math.round(percent / 10));

        await conn.sendMessage(from, {
            text: `💘 *Love Calculator*\n\n*${a}* + *${b}*\n\n${bar}\n*${percent}%* match!`,
            mentions: bJid ? [bJid] : []
        }, { quoted: mek });
    } catch (e) {
        console.error("love error:", e.message);
        reply("❌ Love calculator glitched, try again.");
    }
});

// ─── .roast ───
const ROASTS = [
    "you're the reason the manual has a warning label.",
    "I'd explain it again, but I only have so many crayons.",
    "you bring everyone so much joy... when you leave the chat.",
    "if laziness were a sport, you'd still find a way to lose.",
    "you're not stupid, you just have bad luck thinking.",
    "I've seen better decisions made by a Magic 8-Ball.",
    "you're proof evolution can go in reverse.",
    "somewhere a village is missing its idiot.",
];

cmd({
    pattern: "roast",
    desc: "Sends a lighthearted, silly roast",
    category: "fun",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, mentionedJid, quoted }) => {
    try {
        const target = targetOf(m, args, mentionedJid, quoted);
        const who = target ? '@' + target.split('@')[0] : (args.join(' ').trim() || "you");
        const text = `🔥 *Roast time!*\n\n${who}, ${pick(ROASTS)}\n\n_(all in good fun 😄)_`;
        await conn.sendMessage(from, { text, mentions: target ? [target] : [] }, { quoted: mek });
    } catch (e) {
        console.error("roast error:", e.message);
        reply("❌ Roast failed to fire, try again.");
    }
});

// ─── .fact ───
const FACTS = [
    "Honey never spoils — archaeologists have found 3000-year-old honey that's still edible.",
    "Octopuses have three hearts and blue blood.",
    "Bananas are berries, but strawberries aren't.",
    "A day on Venus is longer than a year on Venus.",
    "Sharks existed before trees.",
    "Wombat poop is cube-shaped.",
    "The Eiffel Tower can grow taller in summer due to heat expansion.",
];

cmd({
    pattern: "fact",
    desc: "Sends a random fun fact",
    category: "fun",
    react: "📚",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { text: `📚 *Random Fact*\n\n${pick(FACTS)}` }, { quoted: mek });
    } catch (e) {
        console.error("fact error:", e.message);
        reply("❌ Couldn't fetch a fact, try again.");
    }
});

// ─── .8ball ───
const EIGHTBALL = [
    "Yes, definitely.", "It is certain.", "Without a doubt.", "Ask again later.",
    "Cannot predict now.", "Don't count on it.", "My reply is no.",
    "Outlook not so good.", "Very doubtful.", "Signs point to yes.",
];

cmd({
    pattern: "8ball",
    desc: "Ask the magic 8-ball a question",
    category: "fun",
    react: "🎱",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        const question = args.join(' ').trim();
        if (!question) return reply("🎱 Ask a question, e.g. `.8ball will I win today?`");
        await conn.sendMessage(from, { text: `🎱 *Question:* ${question}\n*Answer:* ${pick(EIGHTBALL)}` }, { quoted: mek });
    } catch (e) {
        console.error("8ball error:", e.message);
        reply("❌ The 8-ball is cloudy, try again.");
    }
});

// ─── .rate ───
cmd({
    pattern: "rate",
    desc: "Rates a person or thing out of 100",
    category: "fun",
    react: "⭐",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, mentionedJid, quoted }) => {
    try {
        const target = targetOf(m, args, mentionedJid, quoted);
        const thing = target ? '@' + target.split('@')[0] : (args.join(' ').trim());
        if (!thing) return reply("⭐ Tag someone or give something to rate, e.g. `.rate pizza`");

        const score = Math.floor(Math.random() * 101);
        const stars = "⭐".repeat(Math.round(score / 20)) + "☆".repeat(5 - Math.round(score / 20));
        await conn.sendMessage(from, {
            text: `⭐ *Rating*\n\n${thing}: *${score}/100*\n${stars}`,
            mentions: target ? [target] : []
        }, { quoted: mek });
    } catch (e) {
        console.error("rate error:", e.message);
        reply("❌ Rating failed, try again.");
    }
});

// ─── .simp ───
cmd({
    pattern: "simp",
    desc: "Gives a random 'simp percentage' reading",
    category: "fun",
    react: "🥺",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, mentionedJid, quoted, pushname }) => {
    try {
        const target = targetOf(m, args, mentionedJid, quoted);
        const who = target ? '@' + target.split('@')[0] : (pushname || "You");
        const percent = Math.floor(Math.random() * 101);
        await conn.sendMessage(from, {
            text: `🥺 *Simp Meter*\n\n${who} is *${percent}%* simp today.`,
            mentions: target ? [target] : []
        }, { quoted: mek });
    } catch (e) {
        console.error("simp error:", e.message);
        reply("❌ Simp meter broke, try again.");
    }
});

// ─── .character ───
const CHARACTERS = [
    "Naruto Uzumaki 🍥", "Luffy 🏴‍☠️", "Goku 🐉", "Levi Ackerman ⚔️",
    "Saitama 👊", "Light Yagami 📓", "Gojo Satoru 👁️", "Tanjiro Kamado 🔥",
    "Itachi Uchiha 🌙", "Eren Yeager 🗡️",
];

cmd({
    pattern: "character",
    alias: ["char"],
    desc: "Assigns a random anime character to you",
    category: "fun",
    react: "🎭",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    try {
        const who = pushname || "You";
        await conn.sendMessage(from, { text: `🎭 *Character Match*\n\n${who}, your anime character today is *${pick(CHARACTERS)}*` }, { quoted: mek });
    } catch (e) {
        console.error("character error:", e.message);
        reply("❌ Couldn't assign a character, try again.");
    }
});
