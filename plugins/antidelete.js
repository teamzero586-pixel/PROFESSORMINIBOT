// plugins/antidelete.js
const { cmd } = require("../arslan");
const { updateUserConfigInMongoDB, getUserConfigFromMongoDB } = require('../lib/database');

// Must match the exact key lib/antidelete.js reads from (getBotNumber(conn)
// there) — previously this saved under whoever typed the command instead,
// which can differ from the bot's own clean number (device suffix, LID,
// etc.), so the setting was never actually seen by the delete-detection
// handler and antidelete silently never worked.
function getBotNumber(sock) {
    return (sock?.user?.id || '').split(':')[0].split('@')[0];
}

cmd({
    pattern: "antidelete",
    alias: ["ad", "antidel"],
    desc: "Enable/Disable antidelete feature",
    category: "owner",
    react: "🛡️",
    filename: __filename
}, async (conn, mek, m, {
    from,
    reply,
    args,
    sender,
    isCreator
}) => {
    try {
        if (!isCreator) return reply("❌ Only bot owner can use this command.");
        
        const action = args[0]?.toLowerCase();
        if (!action || !['on', 'off', 'enable', 'disable'].includes(action)) {
            const botNumber = getBotNumber(conn);
            let current = 'ON';
            try {
                const cfg = await getUserConfigFromMongoDB(botNumber);
                current = (cfg?.ANTIDELETE ?? 'true') === 'true' ? 'ON' : 'OFF';
            } catch (e) {}
            return reply(`📋 *Antidelete Settings*\n\n` +
                        `Usage: .antidelete <on/off>\n` +
                        `Example: .antidelete on\n\n` +
                        `Current Status: ${current}\n\n` +
                        `⚠️ Deleted messages will be sent to owner's inbox only.`);
        }
        
        const status = action === 'on' || action === 'enable' ? 'true' : 'false';
        
        // Update in database — keyed by the bot's own number so
        // lib/antidelete.js (which reads by botNumber) actually sees it
        const botNumber = getBotNumber(conn);
        await updateUserConfigInMongoDB(botNumber, { ANTIDELETE: status });
        
        reply(`✅ Antidelete ${status === 'true' ? 'enabled' : 'disabled'} successfully!\n\n` +
              `📩 Deleted messages will be sent to owner's inbox only.`);
        
    } catch (error) {
        console.error("Antidelete command error:", error.message);
        reply("❌ Failed to update antidelete settings.");
    }
});

// Command to check antidelete status
cmd({
    pattern: "antidelstatus",
    alias: ["adstatus", "checkad"],
    desc: "Check antidelete status",
    category: "owner",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, {
    from,
    reply,
    sender,
    isCreator
}) => {
    try {
        if (!isCreator) return reply("❌ Only bot owner can use this command.");
        
        const botNumber = getBotNumber(conn);
        const config = await getUserConfigFromMongoDB(botNumber);
        const status = config.ANTIDELETE || 'true';
        
        reply(`📊 *Antidelete Status*\n\n` +
              `🔹 Status: ${status === 'true' ? '✅ ENABLED' : '❌ DISABLED'}\n` +
              `📩 Delivery: Owner's Inbox Only\n` +
              `👤 Owner: @${sender.split('@')[0]}\n\n` +
              `To change: .antidelete on/off`);
              
    } catch (error) {
        console.error("Status check error:", error.message);
        reply("❌ Failed to check status.");
    }
});
