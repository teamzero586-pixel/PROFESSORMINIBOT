const { cmd } = require('../arslan');
const config = require('../config');
const { updateUserConfigInMongoDB, getUserConfigFromMongoDB } = require('../lib/database');

cmd({
    pattern: "anti-call",
    react: "📵",
    alias: ["anticall"],
    desc: "Enable or disable automatic call rejection",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply, botNumber }) => {
    if (!isCreator) return reply("❌ Only the bot owner can use this command.");

    const status = args[0]?.toLowerCase();
    if (status !== "on" && status !== "off") {
        const current = await getUserConfigFromMongoDB(botNumber).catch(() => ({}));
        return reply(
            `📵 *Anti-Call Settings*\n\n` +
            `Usage: .anticall <on/off>\n` +
            `Current status: ${(current.ANTI_CALL === 'true') ? 'ON ✅' : 'OFF ❌'}`
        );
    }

    const value = status === "on" ? "true" : "false";

    // Persist per-number in MongoDB — this is what setupCallHandlers()
    // in main.js actually reads on incoming calls. The previous version
    // only mutated the shared in-memory config object, which (a) never
    // survived a restart and (b) on a multi-session bot would toggle
    // anti-call for every connected number at once, not just this one.
    try {
        await updateUserConfigInMongoDB(botNumber, { ANTI_CALL: value });
    } catch (e) {
        console.error("anticall persist error:", e.message);
        return reply("❌ Couldn't save this setting right now — try again in a moment.");
    }

    return reply(value === "true"
        ? "📵 Anti-call is now *ON* — incoming calls will be auto-rejected."
        : "✅ Anti-call is now *OFF*."
    );
});
