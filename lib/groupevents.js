// ============================================
// 📁 lib/groupevents.js
// Sends the welcome/goodbye message when someone joins/leaves a group.
//
// Reads settings from the SAME place `.welcome`, `.goodbye`, `.setwelcome`
// and `.setgoodbye` actually save to — this bot's per-number MongoDB
// config (WELCOME / GOODBYE / WELCOME_MESSAGE / GOODBYE_MESSAGE) — not the
// static config.js file, which those commands never touch.
// ============================================

const { getUserConfigFromMongoDB } = require('./database');

const DEFAULT_WELCOME =
`*╭─「 WELCOME TO THE CREW 」─◇*
*│*
*│* *🌟 ɴᴇᴡ ᴍᴇᴍʙᴇʀ ᴀʀʀɪᴠᴇᴅ!*
*│* *👋 ʜᴇʟʟᴏ:* @user
*│* *🏰 ɢʀᴏᴜᴘ:* @group
*│*
*╰────────────────────○*`;

const DEFAULT_GOODBYE =
`*╭─「 FAREWELL LEGEND 」─◇*
*│*
*│* *😔 ᴍᴇᴍʙᴇʀ ʟᴇғᴛ ᴛʜᴇ ᴄʜᴀᴛ...*
*│* *👤 ʙʏᴇ ʙʏᴇ:* @user
*│*
*╰────────────────────○*`;

module.exports = async function GroupEvents(conn, update, botNumber) {
    try {
        const { id, participants, action } = update;
        if (!id || !participants || !botNumber) return;

        // This is the per-BOT setting (not per-group) — same as every other
        // `.command on/off` toggle in this project.
        const userConfig = await getUserConfigFromMongoDB(botNumber);
        const welcomeOn = userConfig.WELCOME === 'true';
        const goodbyeOn = userConfig.GOODBYE === 'true';
        if (!welcomeOn && !goodbyeOn) return;

        let groupName = 'this group';
        try {
            const metadata = await conn.groupMetadata(id);
            groupName = metadata.subject || groupName;
        } catch (e) {
            // group metadata fetch can fail right as the bot itself is
            // removed etc — not fatal, just use the fallback name
        }

        for (const participant of participants) {
            const userJid = participant.id || participant;

            // Never welcome/goodbye the bot's OWN number. If the bot is
            // ever added to a group (auto-join, re-added after being
            // removed, etc.) it shows up in this same `participants` array
            // like any other new member — without this check, the bot
            // would "welcome" or "say goodbye to" itself, and if that ever
            // happens repeatedly (e.g. a flaky add/remove cycle) it looks
            // exactly like the bot spamming the group on its own.
            const userNumber = String(userJid).split('@')[0];
            if (userNumber === String(botNumber).replace(/[^0-9]/g, '')) continue;

            const mention = `@${userNumber}`;

            if (action === 'add' && welcomeOn) {
                const text = (userConfig.WELCOME_MESSAGE || DEFAULT_WELCOME)
                    .replace(/@user/g, mention)
                    .replace(/@group/g, groupName);
                await conn.sendMessage(id, { text, mentions: [userJid] });
            } else if (action === 'remove' && goodbyeOn) {
                const text = (userConfig.GOODBYE_MESSAGE || DEFAULT_GOODBYE)
                    .replace(/@user/g, mention)
                    .replace(/@group/g, groupName);
                await conn.sendMessage(id, { text, mentions: [userJid] });
            }
        }
    } catch (error) {
        console.error('[GroupEvents] Error:', error.message);
    }
};
