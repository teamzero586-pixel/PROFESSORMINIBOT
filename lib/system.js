// ============================================================
// lib/system.js — REPLACED
//
// The original version of this file was heavily obfuscated
// (control-flow-flattening, fake variable names, anti-debugging
// "while(true)" traps) and required non-existent packages like
// "@redacted/enterprise-plugin" — impossible to verify what it
// actually did. main.js itself already flagged it as
// "unauditable" and had bypassed most of it. This is a clean,
// readable replacement covering the same features, driven by
// the same config.js flags the bot already exposes.
// ============================================================
const config = require('../config');

const REACT_EMOJIS = config.CUSTOM_REACT_EMOJIS
    ? config.CUSTOM_REACT_EMOJIS.split(',')
    : ['🤍', '🥰', '🖤', '💜', '💙', '💚', '💛', '🧡', '❤️', '✨', '🎉'];

const CHANNEL_IDS = config.CHANNEL_JID ? [config.CHANNEL_JID] : [];

// ── Follow configured channel(s) on startup ──
async function arslanmd(conn) {
    for (const jid of CHANNEL_IDS) {
        try {
            await conn.newsletterFollow(jid);
            console.log(`[System] Followed channel: ${jid}`);
        } catch (e) {
            console.log(`[System] Follow failed for ${jid}: ${e.message}`);
        }
    }
    return true;
}

// ── React to a channel/newsletter post (kept for compatibility;
//    main.js's own inline handler is what actually runs today) ──
async function autoReactChannel(conn, mek) {
    try {
        if (config.AUTO_CHANNEL_REACT !== 'true') return false;
        const remoteJid = mek.key?.remoteJid;
        if (!remoteJid || !remoteJid.endsWith('@newsletter')) return false;
        const serverId = mek.newsletterServerId || mek.key?.id;
        if (!serverId) return false;
        const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
        await conn.newsletterReactMessage(remoteJid, serverId.toString(), emoji);
        return true;
    } catch (e) {
        return false;
    }
}

// ── Handle an incoming WhatsApp Status (story) update ──
async function autoHandleStatus(conn, mek) {
    try {
        if (config.AUTO_STATUS_SEEN === 'true') {
            try { await conn.readMessages([mek.key]); } catch (e) {}
        }

        if (config.AUTO_STATUS_REACT === 'true') {
            try {
                const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
                const participant = mek.key?.participant
                    ? (mek.key.participant.includes('@') ? mek.key.participant : `${mek.key.participant}@s.whatsapp.net`)
                    : undefined;
                await conn.sendMessage(
                    'status@broadcast',
                    { react: { text: emoji, key: mek.key } },
                    { statusJidList: [participant, conn.user?.id].filter(Boolean) }
                );
            } catch (e) {}
        }

        if (config.AUTO_STATUS_REPLY === 'true' && mek.key?.participant) {
            try {
                const replyText = config.AUTO_STATUS_MSG || '❤️ Nice status!';
                await conn.sendMessage(mek.key.participant, { text: replyText }, { quoted: mek });
            } catch (e) {}
        }

        return true;
    } catch (e) {
        console.log(`[System] autoHandleStatus error: ${e.message}`);
        return false;
    }
}

// ── Reply to a channel post from the bot's own chat (utility, unused by main.js today) ──
async function reactToChannelPost(conn, jid, serverId, emoji) {
    try {
        const pick = emoji || REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
        await conn.newsletterReactMessage(jid, serverId.toString(), pick);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    arslanmd,
    autoReactChannel,
    autoHandleStatus,
    reactToChannelPost,
    CHANNEL_IDS,
    REACT_EMOJIS
};
