// ============================================
// 👥 GROUP METADATA COMMANDS - ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀
// .setname .setdesc .open .close
// ============================================

const { cmd } = require('../arslan');

cmd({
    pattern: "setname",
    alias: ["gname", "changename"],
    desc: "Change the group's name",
    category: "group",
    react: "✏️",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, args, reply, isAdmins, isBotAdmins }) => {
    try {
        if (!isGroup) return reply("⚠️ This command only works in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to change the group name.");

        const newName = args.join(' ').trim();
        if (!newName) return reply("❓ Give me a new name.\nExample: .setname My Cool Group");
        if (newName.length > 100) return reply("❌ Group names must be 100 characters or fewer.");

        await conn.groupUpdateSubject(from, newName);
        reply(`✅ Group name updated to *${newName}*`);
    } catch (e) {
        console.error("setname error:", e.message);
        reply("❌ Failed to update group name: " + e.message);
    }
});

cmd({
    pattern: "setdesc",
    alias: ["gdesc", "changedesc"],
    desc: "Change the group's description",
    category: "group",
    react: "📝",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, args, reply, isAdmins, isBotAdmins }) => {
    try {
        if (!isGroup) return reply("⚠️ This command only works in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin to change the group description.");

        const newDesc = args.join(' ').trim();
        if (!newDesc) return reply("❓ Give me a new description.\nExample: .setdesc Welcome to our group!");

        await conn.groupUpdateDescription(from, newDesc);
        reply("✅ Group description updated.");
    } catch (e) {
        console.error("setdesc error:", e.message);
        reply("❌ Failed to update group description: " + e.message);
    }
});

// NOTE: .open / .close (lock/unlock the group to non-admins) already exist
// as aliases of .unmute / .mute in plugins/ported-commands/group/{mute,unmute}.js
// — not duplicated here.

