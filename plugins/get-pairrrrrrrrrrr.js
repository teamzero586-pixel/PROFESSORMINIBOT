const { cmd } = require('../arslan');

// Requests a pairing code using THIS deployment's own pairing logic —
// in-process, no phone number ever leaves this server.
function requestPairingCode(number) {
    return new Promise((resolve) => {
        const mockRes = {
            headersSent: false,
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { this.headersSent = true; resolve(payload); },
            send(payload) { this.headersSent = true; resolve(payload); }
        };
        try {
            require('../main').arslanPair(number, mockRes);
        } catch (e) {
            resolve({ error: e.message });
        }
        // Safety timeout in case arslanPair never responds
        setTimeout(() => { if (!mockRes.headersSent) resolve({ error: 'Timed out waiting for pairing code' }); }, 25000);
    });
}

cmd({
    pattern: "pair",
    alias: ["getpaijsksnsr", "pairing", "clonebnsjdndnznot"],
    react: "✅",
    desc: "Get pairing code for 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 bot",
    category: "download",
    use: ".pair 92323***",
    filename: __filename
}, async (conn, mek, m, { from, q, isGroup, senderNumber, reply }) => {
    try {
        const phoneNumber = q ? q.trim().replace(/[^0-9]/g, '') : senderNumber.replace(/[^0-9]/g, '');

        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            return await reply("❌ Please provide a valid phone number without `+`\nExample: `.pair 92323***`");
        }

        const result = await requestPairingCode(phoneNumber);

        if (!result || !result.code) {
            return await reply(`❌ ${result?.message || result?.error || 'Failed to retrieve pairing code. Please try again later.'}`);
        }

        const pairingCode = result.code;
        await reply(`> *PAIRING COMPLETED*\n\n*Your pairing code is:* ${pairingCode}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await reply(`${pairingCode}`);

    } catch (error) {
        console.error("Pair command error:", error.message);
        await reply("❌ An error occurred while getting pairing code. Please try again later.");
    }
});

cmd({
    pattern: "pair2",
    alias: ["getpair2", "reqpair", "clonebot2"],
    react: "📉",
    desc: "Get pairing code for 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 bot",
    category: "download",
    use: ".pair2 92323XXX",
    filename: __filename
}, async (conn, mek, m, { from, q, isGroup, senderNumber, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const phoneNumber = q ? q.trim().replace(/[^0-9]/g, '') : senderNumber.replace(/[^0-9]/g, '');

        if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
            return await reply("❌ Invalid phone number format!\n\nPlease use: `.pair2 92323000000000`\n(Without + sign)");
        }

        const result = await requestPairingCode(phoneNumber);

        if (!result || !result.code) {
            return await reply(`❌ ${result?.message || result?.error || 'Failed to get pairing code. Please try again later.'}`);
        }

        const pairingCode = result.code;

        await reply(`- *⍴ᥲіrіᥒg ᥴ᥆ძᥱ*\n\n Notification has been sent to your WhatsApp. Please check your phone and copy this code to pair it and get your session id.\n\n*🔢 Pairing Code*: *${pairingCode}*\n\n> *Copy it from below message 👇🏻*`);

        await reply(pairingCode);
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Pair2 command error:", error.message);
        await reply("❌ An error occurred. Please try again later.");
    }
});
