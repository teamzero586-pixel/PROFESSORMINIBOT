const { cmd } = require('../arslan');

cmd({
    pattern: "count",
    alias: ["counting"],
    react: "🔢",
    desc: "Bot counts from 1 up to the number you give — each number as its own message",
    category: "fun",
    use: ".count <number>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const target = parseInt((q || "").trim(), 10);

        if (!target || isNaN(target)) {
            return reply("❌ Please give a valid number.\nExample: `.count 5`");
        }

        // Hard cap so this can't be used to flood the chat — sending many
        // messages back-to-back is what gets numbers rate-limited/flagged
        // by WhatsApp. Raise MAX_COUNT below if you really need more.
        const MAX_COUNT = 200;
        if (target < 1) return reply("❌ Number must be greater than 0.");
        if (target > MAX_COUNT) {
            return reply(`❌ Max allowed is ${MAX_COUNT} (to avoid spam/rate-limits). Try a smaller number.`);
        }

        for (let i = 1; i <= target; i++) {
            await conn.sendMessage(from, { text: `${i}` }, { quoted: mek });
            if (i < target) await new Promise(r => setTimeout(r, 600)); // small gap between messages
        }
    } catch (e) {
        console.error("Count Error:", e.message);
        reply(`❌ Error while counting: ${e.message}`);
    }
});
