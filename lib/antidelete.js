// lib/antidelete.js
const { getContentType } = require('@whiskeysockets/baileys');
const config = require('../config');
const { getUserConfigFromMongoDB } = require('./database');

// ── Duplicate-processing guard ──
// Baileys can emit the same deletion event more than once (retries,
// duplicate socket events). Without this, the same deleted message could
// get reported to the owner multiple times. Capped so it can't grow
// forever on a long-running bot.
const processedDeletes = new Set();
const MAX_PROCESSED = 2000;
function markProcessed(id) {
    if (processedDeletes.has(id)) return false;
    processedDeletes.add(id);
    if (processedDeletes.size > MAX_PROCESSED) {
        const oldest = processedDeletes.values().next().value;
        processedDeletes.delete(oldest);
    }
    return true;
}

async function handleAntidelete(conn, updates, store, botNumber) {
    try {
        // Respect THIS number's own on/off setting — previously this ran
        // unconditionally for every connected number regardless of whether
        // they had antidelete turned off.
        let userConfig = {};
        try {
            userConfig = await getUserConfigFromMongoDB(botNumber) || {};
        } catch (e) {
            userConfig = {};
        }
        const isEnabled = (userConfig.ANTIDELETE ?? 'true') === 'true';
        if (!isEnabled) return;

        // Deleted-message alerts go to THIS bot's own number (self-chat) —
        // not a single global owner. Previously every connected number's
        // deleted messages all funneled to config.OWNER_NUMBER, meaning
        // person A's private deleted messages would land on the admin's
        // phone instead of person A's own.
        const cleanBotNumber = String(botNumber).replace(/[^0-9]/g, '');
        const ownerJids = cleanBotNumber ? [`${cleanBotNumber}@s.whatsapp.net`] : [];
        if (!ownerJids.length) {
            console.log('[ANTIDELETE] No target number available');
            return;
        }

        for (const update of updates) {
            // Check if message is deleted
            if (update.update && update.update.message) {
                const message = update.update.message;
                const key = update.key;
                
                // Check if it's a protocol message (delete)
                if (message.protocolMessage && message.protocolMessage.type === 0) {
                    const deletedMessageKey = message.protocolMessage.key;

                    // Skip if we've already reported this exact deletion
                    const dedupeId = `${deletedMessageKey.remoteJid}:${deletedMessageKey.id}`;
                    if (!markProcessed(dedupeId)) continue;

                    // Get the deleted message from store
                    const deletedMsg = await store.loadMessage(
                        deletedMessageKey.remoteJid,
                        deletedMessageKey.id
                    );
                    
                    if (deletedMsg && deletedMsg.message) {
                        // Get sender info
                        const sender = deletedMsg.key.participant || deletedMsg.key.remoteJid;
                        const from = deletedMsg.key.remoteJid;
                        const isGroup = from.endsWith('@g.us');
                        
                        // Get message content
                        let content = '';
                        let msgType = getContentType(deletedMsg.message);
                        
                        // Handle ephemeral messages
                        if (msgType === 'ephemeralMessage') {
                            deletedMsg.message = deletedMsg.message.ephemeralMessage.message;
                            msgType = getContentType(deletedMsg.message);
                        }
                        
                        if (msgType === 'conversation') {
                            content = deletedMsg.message.conversation;
                        } else if (msgType === 'extendedTextMessage') {
                            content = deletedMsg.message.extendedTextMessage.text;
                        } else if (msgType === 'imageMessage') {
                            content = '🖼️ Image' + (deletedMsg.message.imageMessage.caption ? `\n📝 Caption: ${deletedMsg.message.imageMessage.caption}` : '');
                        } else if (msgType === 'videoMessage') {
                            content = '🎥 Video' + (deletedMsg.message.videoMessage.caption ? `\n📝 Caption: ${deletedMsg.message.videoMessage.caption}` : '');
                        } else if (msgType === 'audioMessage') {
                            content = '🎵 Audio';
                        } else if (msgType === 'stickerMessage') {
                            content = '🎨 Sticker';
                        } else if (msgType === 'documentMessage') {
                            content = '📄 Document' + (deletedMsg.message.documentMessage.fileName ? `\n📁 File: ${deletedMsg.message.documentMessage.fileName}` : '');
                        } else if (msgType === 'locationMessage') {
                            content = '📍 Location';
                        } else if (msgType === 'contactMessage') {
                            content = '👤 Contact';
                        } else if (msgType === 'buttonsMessage') {
                            content = '🔘 Buttons';
                        } else if (msgType === 'listMessage') {
                            content = '📋 List';
                        } else {
                            content = '📨 Media/Message';
                        }
                        
                        // Get chat name
                        let chatName = isGroup ? await getGroupName(conn, from) : 'Private Chat';
                        let senderName = deletedMsg.pushName || sender.split('@')[0];
                        
                        // Prepare antidelete message
                        const antidelMsg = `⚠️ *MESSAGE DELETED DETECTED!*\n\n` +
                                          `📱 *From:* ${senderName}\n` +
                                          `👤 *Number:* @${sender.split('@')[0]}\n` +
                                          `💬 *Chat:* ${chatName}\n` +
                                          `📝 *Message:* ${content}\n` +
                                          `🕐 *Time:* ${new Date().toLocaleString()}\n` +
                                          `📌 *Type:* ${isGroup ? 'Group' : 'Private'}`;
                        
                        // Send to ALL owners
                        for (const ownerJid of ownerJids) {
                            try {
                                await conn.sendMessage(ownerJid, {
                                    text: antidelMsg,
                                    mentions: [sender]
                                });
                                console.log(`[ANTIDELETE] Sent to owner: ${ownerJid}`);
                            } catch (err) {
                                console.error(`[ANTIDELETE] Failed to send to ${ownerJid}:`, err.message);
                            }
                        }
                        
                        console.log(`[ANTIDELETE] Deleted message from ${sender} in ${from}: ${content}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[ANTIDELETE ERROR]', error.message);
    }
}

// Helper function to get group name
async function getGroupName(conn, jid) {
    try {
        const metadata = await conn.groupMetadata(jid);
        return metadata.subject || 'Unknown Group';
    } catch (error) {
        return 'Unknown Group';
    }
}

module.exports = { handleAntidelete };
