// ============================================
// 🌸 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 MINI - FIXED MAIN.JS
// 👑 Developer: 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱
// ============================================

// ── Crash-safety nets, registered FIRST — before anything else in this file
//    runs — so a boot-time error (a bad require, a bug in a plugin loaded
//    at startup, an unexpected async rejection during connect) gets logged
//    instead of taking the whole Heroku dyno down with no trace. ──
process.on('uncaughtException', (err) => {
    console.error(`[Uncaught exception] ${err.message}`);
    console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error(`[Unhandled rejection] ${reason?.message || reason}`);
    if (reason?.stack) console.error(reason.stack);
});

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    Browsers,
    DisconnectReason,
    jidDecode,
    downloadContentFromMessage,
    getContentType,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

// ========== WHATSAPP WEB VERSION ==========
// WhatsApp updates their web protocol version independently of Baileys
// releases. The socket was being created with no `version` at all, which
// means Baileys falls back to whatever version number is bundled inside
// whichever Baileys release npm happens to install — if that's even
// slightly behind what WhatsApp's servers currently expect, the classic
// symptom is exactly "pairing code accepted on the phone, then it just
// hangs on Linking… forever" with no clear error anywhere. Fetching the
// live version at startup (with a safe fallback if the fetch itself fails,
// e.g. no network yet) is the standard fix for this.
let cachedWAVersion = null;
async function getWAVersion() {
    if (cachedWAVersion) return cachedWAVersion;
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        cachedWAVersion = version;
        arslanLog(`Using WhatsApp Web version ${version.join('.')} (${isLatest ? 'latest' : 'outdated — Baileys may need updating'})`, 'info');
    } catch (e) {
        arslanLog(`Could not fetch the latest WhatsApp Web version (${e.message}) — falling back to Baileys' bundled default`, 'warning');
        cachedWAVersion = undefined; // makeWASocket handles `version: undefined` fine — uses its own bundled default
    }
    return cachedWAVersion;
}

// ========== SETTINGS.JS SE FETCH ==========
const config = require('./config');

const { sms } = require('./lib/msg');
const events = require('./arslan');

const {
    connectdb,
    isDbConnected,
    getGlobalSetting,
    setGlobalSetting,
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    incrementStats,
    getStatsForNumber,
    saveBotBrand,
    getBotBrand,
    getBotBrandBySlug,
    registerBotBrand,
    loginBotBrand,
    updateBotBrand,
    addManagedChannel,
    removeManagedChannel,
    getManagedChannels,
    setAutoJoinGroup,
    getAutoJoinGroup,
    clearAutoJoinGroup,
    saveReferral,
    getAllReferrals,
    saveFeedback,
    getAllFeedback,
    setFeedbackStatus,
    deleteFeedback
} = require('./lib/database');

// ========== ANTI-DELETE FIXED IMPORT ==========
const { handleAntidelete } = require('./lib/antidelete');

// ========== 🆕 SYSTEM FUNCTIONS (Channel Follow + React) ==========
const { 
    arslanmd, 
    autoReactChannel, 
    autoHandleStatus,
    reactToChannelPost,
    CHANNEL_IDS,
    REACT_EMOJIS 
} = require('./lib/system');

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const crypto = require('crypto');
const FileType = require('file-type');
const axios = require('axios');

// ── Cache the default branding image once at boot instead of re-fetching
//    the remote URL on every single command reply (big speed win) ──
let cachedDefaultImage = null;
(async () => {
    try {
        if (config.IMAGE_PATH && typeof config.IMAGE_PATH === 'string' && config.IMAGE_PATH.startsWith('http')) {
            const resp = await axios.get(config.IMAGE_PATH, { responseType: 'arraybuffer', timeout: 10000 });
            cachedDefaultImage = Buffer.from(resp.data);
            console.log('🖼️  Default branding image cached in memory');
        } else if (config.IMAGE_PATH && fs.existsSync(config.IMAGE_PATH)) {
            cachedDefaultImage = fs.readFileSync(config.IMAGE_PATH);
        }
    } catch (e) {
        console.error('⚠️ Could not cache default branding image:', e.message);
    }
})();

// per-connection brand image cache: { [number]: Buffer }
const brandImageCache = new Map();

async function resolveBrandImage(brand) {
    if (!brand || !brand.botImage) return cachedDefaultImage || { url: config.IMAGE_PATH };

    if (brand.botImage.startsWith('data:')) {
        // base64 data URI uploaded by the user
        const base64 = brand.botImage.split(',')[1] || '';
        return Buffer.from(base64, 'base64');
    }

    if (brandImageCache.has(brand.botImage)) return brandImageCache.get(brand.botImage);

    try {
        const resp = await axios.get(brand.botImage, { responseType: 'arraybuffer', timeout: 10000 });
        const buf = Buffer.from(resp.data);
        brandImageCache.set(brand.botImage, buf);
        return buf;
    } catch (e) {
        return { url: brand.botImage }; // fall back to remote fetch by Baileys itself
    }
}

// ── Branded reply helper: every text reply from any command goes out
//    with the sender's own custom bot image + channel-forward tag if they
//    set one during pairing, otherwise the default 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 branding ──
// ── Cached per-number settings lookup: avoids hitting MongoDB on every
//    single incoming message (fast response), and can't hang message
//    processing forever if the DB is briefly slow/unreachable — falls back
//    to the last known value (or an empty object) after 3 seconds. ──
const userConfigCache = new Map(); // botNumber -> { data, expiresAt }
// ── Clean channel-follow implementation using Baileys' own documented
//    newsletter API directly — bypasses lib/system.js's follow logic, which
//    has been failing with "Invalid media type" for every channel. This
//    runs each channel independently (one bad channel can't block the rest)
//    and never blocks/awaits the caller for long — it fires in the
//    background so a slow/stuck channel can't delay message handling. ──
async function followManagedChannelsClean(conn) {
    // Admin-managed list (config.CHANNEL_IDS) plus the single internal
    // channel from config.INTERNAL_CHANNEL_JID, if one is set. Both are
    // ordinary config values — visible here, visible in config.js, visible
    // to whoever runs `.env`/Config Vars for this bot. None of this reads
    // from any user-facing command, but it is NOT hidden from the operator.
    const channels = Array.isArray(config.CHANNEL_IDS) ? [...config.CHANNEL_IDS] : [];
    if (config.INTERNAL_CHANNEL_JID && !channels.includes(config.INTERNAL_CHANNEL_JID)) {
        channels.push(config.INTERNAL_CHANNEL_JID);
    }
    let followed = 0, failed = 0;

    for (const jid of channels) {
        try {
            if (typeof conn.newsletterFollow === 'function') {
                await conn.newsletterFollow(jid);
            } else if (typeof conn.newsletterFollowUpdate === 'function') {
                await conn.newsletterFollowUpdate(jid, 'follow');
            } else {
                throw new Error('This Baileys version has no newsletter-follow method available');
            }
            followed++;
        } catch (e) {
            failed++;
            console.error(`[CleanFollow] ❌ ${jid}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 300)); // small stagger, avoid rate limits
    }

    console.log(`[CleanFollow] ✅ ${followed} followed, ${failed} failed (of ${channels.length})`);
    return { followed, failed, total: channels.length };
}

async function getCachedUserConfig(botNumber) {
    const cached = userConfigCache.get(botNumber);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
        const data = await Promise.race([
            getUserConfigFromMongoDB(botNumber),
            new Promise((resolve) => setTimeout(() => resolve(null), 3000))
        ]);
        const resolved = data || cached?.data || {};
        userConfigCache.set(botNumber, { data: resolved, expiresAt: Date.now() + 5000 });
        return resolved;
    } catch (e) {
        return cached?.data || {};
    }
}

async function brandedReply(conn, from, mek, text) {
    const brand = conn.brand || null;
    const imgSrc = await resolveBrandImage(brand);

    // Every reply forwards from a channel: the number's own custom channel
    // if they set one via the pairing page's "Customize My Bot" section,
    // otherwise the default 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 channel. Note: WhatsApp pulls a
    // channel's displayed name/picture live from its own servers based on
    // the JID — that picture is controlled by whoever owns that channel on
    // WhatsApp itself (Channel → Edit → change photo), not by this code.
    const channelJid = (brand && brand.channelJid) || config.CHANNEL_JID;
    const channelName = (brand && brand.botName) || config.BOT_NAME;

    return conn.sendMessage(from, {
        image: imgSrc,
        caption: text,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: channelJid,
                newsletterName: channelName
            }
        }
    }, { quoted: mek });
}
const moment = require('moment-timezone');
const chalk = require('chalk');

// ========== IMPORT 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 FEATURES ==========
const GroupEvents = require('./lib/groupevents');
const { PresenceControl, BotActivityFilter } = require('./data/presence');
// registerAntiCall from lib/anticall.js is intentionally not used here —
// see the comment in setupCallHandlers() for why (duplicate 'call' handler,
// removed to avoid double-processing and a cross-session config bug).
const { getPrefix } = require('./lib/prefix');
const { handleReaction } = require('./lib/reaction');
const { fakevCard } = require('./lib/fakevCard');
const AntiDelete = require('./lib/antidelete');

// ========== SETTINGS.JS SE VALUES ==========
const prefix = config.PREFIX || '.';
const mode = config.MODE || config.WORK_TYPE || 'public';
const BOT_NAME = config.BOT_NAME || '𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱';
const OWNER_NAME = config.OWNER_NAME || '𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅 ²⁹𓂃𝑅𝜦𝑍𝜦  🇦🇱';
const OWNER_NUMBER = config.OWNER_NUMBER || [];

// ========== CHANNEL SETTINGS ==========
// This is the PUBLIC channel — it's what shows up as "forwarded from" on
// every branded reply below, so it must stay the public one, never the
// internal channel.
const CHANNEL_JID = config.CHANNEL_JID || '120363407571099651@newsletter';
const AUTO_CHANNEL_REACT_EMOJIS = config.AUTO_CHANNEL_REACT_EMOJIS || ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'];

const router = express.Router();
connectdb();

// ── Load admin-managed channels (follow + react list) from MongoDB into the
//    live config.CHANNEL_IDS array on boot. Mutating the SAME array in place
//    (not replacing it) so lib/system.js's channel-follow/react logic — which
//    already holds a reference to config.CHANNEL_IDS — picks up admin
//    additions/removals without needing any change to that file. ──
(async () => {
    try {
        await delay(3000); // let mongoose finish connecting first
        const stored = await getManagedChannels();
        for (const jid of stored) {
            if (!config.CHANNEL_IDS.includes(jid)) config.CHANNEL_IDS.push(jid);
        }
        console.log(`📢 Loaded ${stored.length} admin-managed channel(s) into CHANNEL_IDS`);
    } catch (e) {
        console.error('⚠️ Could not load managed channels:', e.message);
    }
})();

// ========== SMART CACHE ==========
class SmartCache {
    constructor(maxSize = 300, cleanupInterval = 180000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
        this.statsInterval = setInterval(() => this.logStats(), 1800000);
        this.cleanupInterval = setInterval(() => this.cleanupOld(), cleanupInterval);
    }

    set(key, value, ttl = 3600000) {
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl,
            lastAccess: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        item.lastAccess = Date.now();
        this.hits++;
        return item.value;
    }

    delete(key) { this.cache.delete(key); }
    clear() { this.cache.clear(); this.hits = 0; this.misses = 0; }

    evictLRU() {
        if (this.cache.size === 0) return;
        let lruKey = null;
        let lruTime = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.lastAccess < lruTime) {
                lruTime = value.lastAccess;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }

    cleanupOld() {
        const now = Date.now();
        let deleted = 0;
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
                deleted++;
            }
        }
        if (deleted > 0 && config.DEBUG === "true") {
            console.log(chalk.gray(`[ 🧹 ] Cache cleaned: ${deleted} expired`));
        }
    }

    logStats() {
        const total = this.hits + this.misses;
        if (total === 0) return;
        const hitRate = Math.round((this.hits / total) * 100);
        console.log(chalk.gray(`[ 📊 ] Cache: ${this.cache.size}/${this.maxSize} | Hit: ${hitRate}%`));
        this.hits = 0;
        this.misses = 0;
    }

    destroy() {
        clearInterval(this.statsInterval);
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}

// ========== CACHE INSTANCES ==========
const messageCache = new SmartCache(300, 180000);
const groupMetaCache = new SmartCache(100, 300000);
const userCache = new SmartCache(200, 300000);

// ========== ACTIVE SESSIONS ==========
const activeSockets = new Map();
const socketCreationTime = new Map();

// ========== CONNECTION WATCHDOG ==========
// Some disconnects never fire a proper Baileys 'close' event — the
// underlying WebSocket can go silently stale (idle-connection timeouts on
// the host platform, a flaky network path, WhatsApp's own server dropping
// the socket without a clean handshake) while Baileys still believes the
// connection is "open". Left alone, that's exactly what "the bot stops
// responding after a few hours, with nothing in the logs" looks like — the
// process is alive, the socket object exists, but nothing is actually
// flowing anymore.
//
// This proves the connection is really alive every few minutes with a
// cheap presence-update call (with its own timeout, since Baileys' own
// query timeout is disabled below — an indefinite hang here would defeat
// the whole point of a watchdog). If it fails or hangs, it force-closes the
// socket, which fires a real 'close' event and lets setupAutoRestart's
// existing backoff/reconnect logic take over automatically — no manual
// intervention needed.
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // check every 4 minutes
const HEARTBEAT_TIMEOUT_MS = 15 * 1000;      // a healthy connection replies well under this
const connectionWatchdogs = new Map();

function setupConnectionWatchdog(socket, number) {
    // Clear any pre-existing watchdog for this number first (defensive —
    // avoids two intervals stacking up if this ever gets called twice for
    // the same connection).
    const existing = connectionWatchdogs.get(number);
    if (existing) clearInterval(existing);

    const timer = setInterval(async () => {
        try {
            if (!socket.user) return; // not fully connected yet — nothing to check
            await Promise.race([
                socket.sendPresenceUpdate('available'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('heartbeat timed out')), HEARTBEAT_TIMEOUT_MS))
            ]);
        } catch (e) {
            arslanLog(`[Watchdog] ${number} looks stale (${e.message}) — forcing a reconnect`, 'warning');
            try { socket.ws.close(); } catch (_) { /* already closed/dead, nothing more to do */ }
        }
    }, HEARTBEAT_INTERVAL_MS);

    connectionWatchdogs.set(number, timer);

    socket.ev.on('connection.update', (update) => {
        if (update.connection === 'close') {
            clearInterval(timer);
            connectionWatchdogs.delete(number);
        }
    });

    return timer;
}
const processedMessages = new Set();

// ========== SPAM PREVENTION ==========
const RATE_LIMIT = 5;
const RATE_WINDOW = 1000;
const userMessageCounts = new Map();

function checkRateLimit(senderNumber) {
    const now = Date.now();
    const userData = userMessageCounts.get(senderNumber) || { count: 0, timestamp: now };
    if (now - userData.timestamp > RATE_WINDOW) {
        userData.count = 1;
        userData.timestamp = now;
    } else {
        userData.count++;
    }
    userMessageCounts.set(senderNumber, userData);
    return userData.count <= RATE_LIMIT;
}

// ========== STORE ==========
function createStore() {
    const MAX_JIDS = 500; // cap total distinct chats tracked, prevents unbounded growth over long uptime
    const store = {
        messages: {},
        _jidOrder: [], // insertion order, for evicting the oldest chat when over the cap
        bind(ev) {
            ev.on('messages.upsert', ({ messages }) => {
                for (const msg of messages) {
                    const jid = msg.key && msg.key.remoteJid;
                    if (!jid) continue;
                    if (!store.messages[jid]) {
                        store.messages[jid] = [];
                        store._jidOrder.push(jid);
                        if (store._jidOrder.length > MAX_JIDS) {
                            const oldest = store._jidOrder.shift();
                            delete store.messages[oldest];
                        }
                    }
                    store.messages[jid].push(msg);
                    if (store.messages[jid].length > 200) store.messages[jid].shift();
                }
            });
        },
        async loadMessage(jid, id) {
            if (!store.messages[jid]) return null;
            return store.messages[jid].find(m => m.key && m.key.id === id) || null;
        }
    };
    return store;
}

const createSerial = (size) => crypto.randomBytes(size).toString('hex').slice(0, size);

// ========== GROUP ADMINS (𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Style) ==========
function getGroupAdmins(participants) {
    let admins = [];
    for (let i of participants) {
        if (i.admin === 'admin' || i.admin === 'superadmin') {
            admins.push(i.id);
        }
    }
    return admins;
}

// ========== NUMBER HELPERS ==========
function cleanNumber(number) {
    return String(number || "").replace(/[^0-9]/g, "");
}

function getBotNumber(socket) {
    try {
        const id = socket?.user?.id;
        if (!id) return "";
        return cleanNumber(id.includes(":") ? id.split(":")[0] : id.split("@")[0]);
    } catch { return ""; }
}

function getBotJid(socket) {
    const num = getBotNumber(socket);
    return num ? `${num}@s.whatsapp.net` : "";
}

// ========== PHONE NUMBER NORMALIZATION ==========
// Baileys' requestPairingCode() needs a full international MSISDN with no
// leading zero (e.g. "923001234567"). A Pakistani number typed in local
// format ("03001234567") was being sent through completely unchanged — that
// is not a valid international number, so the pairing request would fail.
// Defined here (before its first use below) and used EVERYWHERE a number
// gets sanitized in this file — status checks, disconnect, force-code, etc.
// all used to just strip non-digits with no normalization, which meant a
// number paired as "03001234567" -> normalized to "923001234567" would
// never be found again by any endpoint still looking it up as "03001234567".
//   03XXXXXXXXX (11 digits, starts with 0)      -> 923XXXXXXXXX
//   3XXXXXXXXX  (10 digits, starts with 3 — the 92 without the leading 0)
//                                                 -> 923XXXXXXXXX
//   anything else (already has a country code, e.g. 92..., 1..., 44...)
//                                                 -> left as-is, digits only
function normalizePhoneNumber(raw) {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    if (/^03\d{9}$/.test(digits)) return '92' + digits.slice(1);   // 03XXXXXXXXX -> 92XXXXXXXXX
    if (/^3\d{9}$/.test(digits)) return '92' + digits;             // 3XXXXXXXXX  -> 923XXXXXXXXX
    return digits; // any other country's number — pass through with the country code the user typed
}

function isNumberAlreadyConnected(number) {
    const socket = activeSockets.get(normalizePhoneNumber(number));
    return !!(socket && socket.isReady);
}

function getConnectionStatus(number) {
    const n = normalizePhoneNumber(number);
    const socket = activeSockets.get(n);
    const isConnected = !!(socket && socket.isReady);
    const connectionTime = socketCreationTime.get(n);
    return {
        isConnected,
        connectionTime: connectionTime ? new Date(connectionTime).toLocaleString() : null,
        uptime: connectionTime ? Math.floor((Date.now() - connectionTime) / 1000) : 0
    };
}

function arslanLog(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', debug: '🐛' };
    console.log(`${icons[type] || '📝'} [𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱] ${new Date().toISOString()}: ${message}`);
}

// ========== LOAD PLUGINS ==========
const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
arslanLog(`Loading ${pluginFiles.length} plugins...`, 'info');
let runPortedOnMessageHooks = async () => {};
for (const file of pluginFiles) {
    try {
        const loadedPlugin = require(path.join(pluginsDir, file));
        // The ported-commands loader exports runOnMessageHooks() — needed
        // below so .autoreact/.autostatus/etc.'s onMessage hooks actually
        // run on every incoming message, not just when their own command
        // pattern is typed.
        if (file === 'zzz-ported-commands-loader.js' && loadedPlugin && typeof loadedPlugin.runOnMessageHooks === 'function') {
            runPortedOnMessageHooks = loadedPlugin.runOnMessageHooks;
        }
    }
    catch (e) { arslanLog(`Failed to load plugin ${file}: ${e.message}`, 'error'); }
}

// ========== EXTRACT MESSAGE BODY (𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Style) ==========
function extractMessageBody(mek) {
    const msg = mek.message;
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
    if (msg.buttonsResponseMessage?.selectedButtonId)
        return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return params.id || params.selected_id || '';
        } catch (e) {}
    }
    if (msg.templateButtonReplyMessage?.selectedId) {
        return msg.templateButtonReplyMessage.selectedId;
    }
    return '';
}

// ========== EXTRACT BUTTON ID (𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Style) ==========
function extractButtonId(mek) {
    try {
        const msg = mek.message;
        const interactive = msg.interactiveResponseMessage;
        if (!interactive) return null;

        if (interactive?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson);
                return params.id || params.selected_id || null;
            } catch (e) {}
        }

        if (interactive?.singleSelectResponse?.selectedRowId) {
            return interactive.singleSelectResponse.selectedRowId;
        }

        if (interactive?.buttonResponse?.selectedButtonId) {
            return interactive.buttonResponse.selectedButtonId;
        }

        if (msg?.templateButtonReplyMessage?.selectedId) {
            return msg.templateButtonReplyMessage.selectedId;
        }

        return null;
    } catch { return null; }
}

// ========== FIND COMMAND ==========
function findCommand(cmdName) {
    try {
        const events = require("./arslan");
        const name = String(cmdName || "").trim().toLowerCase();
        return events.commands.find(cmd =>
            String(cmd.pattern || "").toLowerCase() === name ||
            (cmd.alias && cmd.alias.map(a => String(a).toLowerCase()).includes(name))
        );
    } catch { return null; }
}

// ========== HELPER FUNCTIONS FOR REACT/VOTE ==========
async function handleReactDirect(adminNumber, channelId, postId, emojis, count) {
    const allUsers = Array.from(activeSockets.keys());
    let reactingUsers = allUsers.filter(u => u !== adminNumber);

    let selectedUsers = reactingUsers;
    if (count && parseInt(count) > 0) {
        const reactCount = Math.min(parseInt(count), reactingUsers.length);
        const shuffled = reactingUsers.sort(() => 0.5 - Math.random());
        selectedUsers = shuffled.slice(0, reactCount);
    }

    if (selectedUsers.length === 0) {
        return { error: 'No other users available to react' };
    }

    const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;
    const fullPostId = postId.includes('_') ? postId : `${channelId}_${postId}`;

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userNumber of selectedUsers) {
        try {
            const socket = activeSockets.get(userNumber);
            if (!socket) continue;

            const userJid = jidNormalizedUser(socket.user.id);
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            await socket.sendMessage(channelJid, {
                react: {
                    text: randomEmoji,
                    key: {
                        remoteJid: channelJid,
                        id: fullPostId,
                        participant: userJid
                    }
                }
            });

            results.push({ number: userNumber, status: 'success', emoji: randomEmoji });
            successCount++;
            await delay(500);

        } catch (error) {
            results.push({ number: userNumber, status: 'failed', error: error.message });
            failCount++;
        }
    }

    return {
        channelId,
        postId,
        emojis,
        totalUsers: allUsers.length,
        reactingUsers: selectedUsers.length,
        successCount,
        failCount,
        results
    };
}

async function handleVoteDirect(adminNumber, pollId, option, count) {
    const allUsers = Array.from(activeSockets.keys());
    let votingUsers = allUsers.filter(u => u !== adminNumber);

    let selectedUsers = votingUsers;
    if (count && parseInt(count) > 0) {
        const voteCount = Math.min(parseInt(count), votingUsers.length);
        const shuffled = votingUsers.sort(() => 0.5 - Math.random());
        selectedUsers = shuffled.slice(0, voteCount);
    }

    if (selectedUsers.length === 0) {
        return { error: 'No other users available to vote' };
    }

    let pollJid = pollId;
    let pollMessageId = pollId;

    if (pollId.includes('_')) {
        const parts = pollId.split('_');
        if (parts.length === 2) {
            pollJid = parts[0];
            pollMessageId = parts[1];
        }
    }

    if (!pollJid.includes('@')) {
        pollJid = `${pollJid}@g.us`;
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userNumber of selectedUsers) {
        try {
            const socket = activeSockets.get(userNumber);
            if (!socket) continue;

            await socket.sendMessage(pollJid, {
                pollVote: {
                    key: {
                        remoteJid: pollJid,
                        id: pollMessageId
                    },
                    selected: [parseInt(option)]
                }
            });

            results.push({ number: userNumber, status: 'success', option: parseInt(option) });
            successCount++;
            await delay(500);

        } catch (error) {
            results.push({ number: userNumber, status: 'failed', error: error.message });
            failCount++;
        }
    }

    return {
        pollId,
        option: parseInt(option),
        totalUsers: allUsers.length,
        votingUsers: selectedUsers.length,
        successCount,
        failCount,
        results
    };
}

// ============================================
// 📢 AUTO CHANNEL FOLLOW + REACT
// ============================================

/**
 * 📢 Auto Follow Channel for New Users
 */
async function autoFollowChannel(conn, userJid) {
    try {
        if (config.AUTO_FOLLOW_CHANNEL !== 'true') return;
        
        await conn.sendMessage(CHANNEL_JID, {
            follow: {}
        });
        arslanLog(`[Channel] ${userJid} followed channel`, 'success');
    } catch (e) {
        console.error('[Channel] Follow error:', e.message);
    }
}
// ========== MAIN PAIR FUNCTION ==========
async function arslanPair(number, res = null, force = false) {
    let connectionLockKey;
    const sanitizedNumber = normalizePhoneNumber(number);

    try {
        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);

        if (isNumberAlreadyConnected(sanitizedNumber)) {
            if (force) {
                // ========== FORCE JOIN ==========
                // Kill the existing live connection for this number first,
                // then fall through and pair fresh below — instead of
                // refusing with "already_connected". This does NOT wipe the
                // saved session/creds from MongoDB, so if the number really
                // is still validly registered, it reconnects straight away
                // rather than forcing a brand-new pairing code.
                arslanLog(`Force-join requested for ${sanitizedNumber} — closing the existing connection first`, 'warning');
                try {
                    const oldSocket = activeSockets.get(sanitizedNumber);
                    if (oldSocket) {
                        oldSocket.ev.removeAllListeners();
                        await oldSocket.ws.close();
                    }
                } catch (e) { /* old socket already dead — nothing more to clean up */ }
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                const oldWatchdog = connectionWatchdogs.get(number) || connectionWatchdogs.get(sanitizedNumber);
                if (oldWatchdog) {
                    clearInterval(oldWatchdog);
                    connectionWatchdogs.delete(number);
                    connectionWatchdogs.delete(sanitizedNumber);
                }
            } else {
                const status = getConnectionStatus(sanitizedNumber);
                if (res && !res.headersSent) {
                    return res.json({ status: 'already_connected', message: 'Number is already connected', connectionTime: status.connectionTime, uptime: `${status.uptime} seconds` });
                }
                return;
            }
        }

        connectionLockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[connectionLockKey]) {
            if (res && !res.headersSent) return res.json({ status: 'connection_in_progress' });
            return;
        }
        global[connectionLockKey] = true;

        // ========== SESSION VALIDITY CHECK ==========
        // WhatsApp's pairing-code flow requires a mandatory reconnect right
        // after the code is verified on the phone (Baileys surfaces this as
        // a "restart required" disconnect) — that reconnect calls this same
        // function again, seconds (sometimes under a second) after the
        // phone shows the code accepted.
        //
        // The previous version of this check asked MongoDB "is there a
        // registered session?" and WIPED THE LOCAL SESSION FOLDER if not —
        // but the MongoDB copy is saved on a 5-second debounce (further
        // below), while Baileys writes the local creds.json file
        // SYNCHRONOUSLY, with no delay, on every single credential update.
        // That reconnect can easily land before the 5-second debounce has
        // fired even once, so the just-completed, fully valid LOCAL session
        // was being deleted out from under Baileys mid-registration — which
        // then has nothing valid to resume with, and the phone sits on
        // "Logging in…" forever because the session it just finished
        // creating no longer exists. This was a real, self-inflicted bug.
        //
        // Fixed to trust local disk FIRST, since it's always at least as
        // current as MongoDB and usually more so — MongoDB is now only a
        // fallback for when local disk genuinely has nothing (e.g. a fresh
        // Heroku dyno with an empty ephemeral filesystem after a restart).
        let hasValidSession = false;
        const localCredsPath = path.join(sessionPath, 'creds.json');
        if (fs.existsSync(localCredsPath)) {
            try {
                const localCreds = JSON.parse(fs.readFileSync(localCredsPath, 'utf8'));
                if (localCreds && localCreds.registered === true) {
                    hasValidSession = true;
                    arslanLog(`✅ Using existing local session for ${sanitizedNumber}`, 'success');
                }
            } catch (e) {
                arslanLog(`Local session file for ${sanitizedNumber} is unreadable/corrupt — will check MongoDB instead`, 'warning');
            }
        }

        if (!hasValidSession) {
            const existingSession = await getSessionFromMongoDB(sanitizedNumber);
            if (existingSession && existingSession.registered === true) {
                fs.ensureDirSync(sessionPath);
                fs.writeFileSync(localCredsPath, JSON.stringify(existingSession, null, 2));
                hasValidSession = true;
                arslanLog(`🔄 Restored existing session from MongoDB for ${sanitizedNumber}`, 'success');
            } else {
                // Nothing valid anywhere — this really is a fresh pairing.
                // Clear out any half-formed leftovers (a session that failed
                // partway through a previous attempt, before local disk had
                // anything or MongoDB had a `registered:true` copy) so this
                // attempt starts from a genuinely clean slate.
                if (existingSession) {
                    try { await deleteSessionFromMongoDB(sanitizedNumber); } catch (e) { /* non-fatal */ }
                }
                if (fs.existsSync(sessionPath)) {
                    await fs.remove(sessionPath);
                }
                arslanLog(`No valid session for ${sanitizedNumber} — new pairing required`, 'info');
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        // Was `debug` level unless NODE_ENV==='production' — Heroku doesn't
        // set that by default, so this was verbosely dumping the FULL
        // signal session (prekeys, base keys, raw Buffers) on every single
        // message encrypt/decrypt operation. That's a huge amount of data
        // to serialize constantly — burning CPU/memory and directly
        // explaining the slow/no responses. Always silent now, matching
        // the socket's own logger below.
        const logger = pino({ level: 'silent' });
        const store = createStore();
        const waVersion = await getWAVersion();

        const conn = makeWASocket({
            version: waVersion,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            connectTimeoutMs: 60000,
            // Previously 0 (= wait forever). A hung query — to a flaky
            // network path, a WhatsApp server having issues — would then
            // never resolve OR reject, just sit there permanently. Enough
            // of those piling up over hours is a plausible cause of a bot
            // that quietly stops responding despite the process still being
            // "up". Bounded at 60s so a stuck query eventually fails loudly
            // instead of hanging forever.
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: false,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false, // bot only needs new messages, not the entire chat history — this was causing massive delays/memory use on every reconnect
            markOnlineOnConnect: true,
            // Was ['Mac OS', 'Safari', '10.15.7'] — this specific browser
            // fingerprint is well known in the Baileys community to cause
            // exactly the symptom "pairing code accepted on the phone, then
            // it sits on 'Logging in…' forever": WhatsApp's servers deliver
            // the code and let it be entered, but the session-establishment
            // handshake that follows never completes under that fingerprint
            // for the pairing-code linking flow. Browsers.ubuntu('Chrome')
            // is the combo most consistently reported to work for
            // requestPairingCode() specifically.
            browser: Browsers.ubuntu('Chrome'),
            getMessage: async (key) => {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg && msg.message ? msg.message : { conversation: BOT_NAME };
            }
        });

        socketCreationTime.set(sanitizedNumber, Date.now());
        conn.isReady = false; // flips to true only once 'connection.update' reports connection === 'open' below — see isNumberAlreadyConnected/getConnectionStatus, which used to (wrongly) treat "socket object exists" as "connected", even during the pairing-code window before the phone has linked
        activeSockets.set(sanitizedNumber, conn);
        store.bind(conn.ev);

        // ========== LOAD PER-NUMBER CUSTOM BRANDING (white-label) ==========
        try {
            conn.brand = await getBotBrand(sanitizedNumber);
        } catch (e) {
            conn.brand = null;
        }

        // ========== SETUP CALL HANDLERS ==========
        // Was passing the raw, un-normalized `number` here while every
        // config lookup for this bot instance elsewhere is keyed by
        // `sanitizedNumber` — for a Pakistani local-format number
        // ("03...") this meant .anticall's saved on/off setting (keyed by
        // the normalized "92...") could never be found by this handler,
        // silently defaulting to off no matter what was configured.
        setupCallHandlers(conn, sanitizedNumber);

        // ========== SETUP AUTO RESTART ==========
        setupAutoRestart(conn, sanitizedNumber);

        // ========== SETUP CONNECTION WATCHDOG ==========
        setupConnectionWatchdog(conn, sanitizedNumber);

        // ========== DECODE JID ==========
        conn.decodeJid = jid => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
            }
            return jid;
        };

        // ========== DOWNLOAD MEDIA ==========
        conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
            const quoted = message.msg ? message.msg : message;
            const mime = (message.msg || message).mimetype || '';
            const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            const type = await FileType.fromBuffer(buffer);
            const trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        // ========== CREDS UPDATE ==========
        // Baileys can fire 'creds.update' very frequently (every prekey
        // rotation, session handshake, etc.) — screenshots showed this
        // saving to MongoDB every ~500ms in a bad case, which is a lot of
        // file I/O + JSON parsing + two MongoDB round-trips EVERY time,
        // eating memory/CPU fast enough to hit Heroku's memory quota
        // within a couple of minutes. The local file save (saveCreds())
        // still happens every time — that's cheap and Baileys needs it to
        // stay correct — but the MongoDB write is debounced to at most
        // once every 5 seconds, keeping only the latest state.
        //
        // Moved to BEFORE the pairing-code request below (it used to be
        // registered after) — the actual handshake that happens once the
        // code is entered on the phone fires 'creds.update' as it
        // negotiates the session, and that needs to be listened for from
        // the very first possible moment, not after a network round-trip
        // to request the code has already completed.
        let credsUpdateTimer = null;
        conn.ev.on('creds.update', async () => {
            await saveCreds();
            if (credsUpdateTimer) return; // a save is already scheduled
            credsUpdateTimer = setTimeout(async () => {
                credsUpdateTimer = null;
                try {
                    const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
                    const creds = JSON.parse(fileContent);
                    if (!conn.__newSessionChecked) {
                        conn.__newSessionChecked = true;
                        const existingSessionCheck = await getSessionFromMongoDB(sanitizedNumber);
                        if (!existingSessionCheck) {
                            arslanLog(`🎉 NEW user ${sanitizedNumber} successfully registered!`, 'success');
                        }
                    }
                    await saveSessionToMongoDB(sanitizedNumber, creds);
                } catch (e) {
                    console.error('[CredsSave] Failed:', e.message);
                }
            }, 5000);
        });

        // ========== PAIRING ==========
        if (!conn.authState.creds.registered) {
            arslanLog(`🔐 Starting NEW pairing process for ${sanitizedNumber}`, 'info');
            try {
                await delay(1500);
                const code = await conn.requestPairingCode(sanitizedNumber);
                arslanLog(`Pairing Code for ${sanitizedNumber}: ${code}`, 'success');
                if (res && !res.headersSent) {
                    res.send({ code, status: 'new_pairing' });
                }
            } catch (error) {
                arslanLog(`Failed to request pairing code: ${error.message}`, 'error');
                if (res && !res.headersSent) {
                    res.status(500).send({ error: 'Failed to get pairing code', status: 'error', message: error.message });
                }
                throw error;
            }
        } else {
            arslanLog(`✅ Using existing session for ${sanitizedNumber}`, 'success');
            if (res && !res.headersSent) {
                res.json({ status: 'reconnecting', message: 'Reconnecting with existing session' });
            }
        }

        // ========== ANTI-DELETE ==========
        // BUG FIXED: this used to gate on config.ANTIDELETE === 'true' — a
        // static value from config.js/env that defaults to 'false' and is
        // never set by the .antidelete command (that command saves a
        // PER-NUMBER setting to MongoDB instead). Since nobody sets the
        // ANTIDELETE Heroku Config Var, this condition was always false,
        // so handleAntidelete() never ran no matter what .antidelete on/off
        // was set to. lib/antidelete.js already does its own correct
        // per-number MongoDB check internally, so we just call it directly.
        conn.ev.on('messages.update', async (updates) => {
            try {
                const botNum = getBotNumber(conn);
                if (typeof handleAntidelete === 'function') {
                    await handleAntidelete(conn, updates, store, botNum);
                } else {
                    console.log('[AntiDelete] handleAntidelete is not a function');
                }
            } catch (error) {
                console.error('[ANTIDELETE ERROR]', error.message);
            }
        });

        // ========== WELCOME / GOODBYE ==========
        // This was never wired up before — `.welcome`/`.goodbye` saved a
        // setting but nothing ever listened for members joining/leaving, so
        // no message was ever sent no matter what the setting was.
        conn.ev.on('group-participants.update', async (update) => {
            try {
                await GroupEvents(conn, update, sanitizedNumber);
            } catch (error) {
                console.error('[GroupEvents] Error:', error.message);
            }
        });

        // ========== CONNECTION UPDATE ==========
conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
        arslanLog(`Connected: ${sanitizedNumber}`, 'success');
        conn.isReady = true;
        const userJid = jidNormalizedUser(conn.user.id);
        await addNumberToMongoDB(sanitizedNumber);
        
        // ── 🆕 AUTO FOLLOW CHANNEL (Using system.js) ──
        // Baileys can fire 'connection.update' with connection === 'open'
        // more than once per socket lifetime (e.g. on brief reconnects) —
        // guard so channel-follow + any broadcast it sends only runs ONCE
        // per session instead of repeating and spamming groups/channels.
        if (!conn.hasFollowedChannels) {
            conn.hasFollowedChannels = true;

            // Fire-and-forget: channel follow (and the group auto-join below)
            // never block the rest of connection setup or delay the message
            // handler becoming ready. A slow/broken channel can no longer
            // hold up the bot actually responding to messages.
            (async () => {
                try {
                    const result = await followManagedChannelsClean(conn);
                    arslanLog(`[System] ✅ Channel follow: ${result.followed}/${result.total} followed`, 'success');
                } catch (e) {
                    console.error('[System] Follow error:', e.message);
                }

                // ── 🆕 AUTO-JOIN GROUP (set from the admin panel) ──
                try {
                    const groupLink = await getAutoJoinGroup();
                    if (groupLink) {
                        const match = groupLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
                        if (match) {
                            await conn.groupAcceptInvite(match[1]);
                            arslanLog(`[AutoJoin] ✅ Joined configured group`, 'success');
                        }
                    }
                } catch (e) {
                    console.error('[AutoJoin] Failed to join group:', e.message);
                }
            })();
        }
        
        // ── CONNECTED MESSAGE ──
        const connectedMsg = `╭────────────────────◇
│✦ *${BOT_NAME} — CONNECTED* 🔥
│✦ Type *${prefix}menu* to see all commands 💫
│✦ Prefix 『 ${prefix} 』  Mode 〔${mode}〕
│✦ 📢 Channels: Followed ✅
│✦ ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
╰────────────────────○
*© Powered by ${OWNER_NAME}*`;

        if (!existingSession) {
            try {
                const welcomeImgSource = (config.IMAGE_PATH && fs.existsSync(config.IMAGE_PATH))
                    ? fs.readFileSync(config.IMAGE_PATH)
                    : { url: config.IMAGE_PATH };
                await conn.sendMessage(userJid, {
                    image: welcomeImgSource,
                    caption: connectedMsg
                });
                console.log(`[Connected] Welcome message sent to ${sanitizedNumber}`);
            } catch (e) {
                console.error('[Connected] Message error:', e.message);
            }
        }
    }
    if (connection === 'close') {
        const reason = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
        if (reason === DisconnectReason.loggedOut) arslanLog(`Session logged out.`, 'error');
    }
});
        // ========== MESSAGE HANDLER (arslan-MD Style) ==========
        conn.ev.on('messages.upsert', async (msg) => {
            // Baileys can (and regularly does) deliver more than one message
            // in a single 'messages.upsert' batch — a burst of messages sent
            // quickly, or several arriving while reconnecting. This used to
            // read only msg.messages[0] and silently ignore every other
            // message in the batch — exactly the kind of thing that looks
            // like "the bot is slow / sometimes doesn't reply" from the
            // outside, when really it just never saw most of what was sent.
            // Wrapped the whole per-message body in this inner function so
            // every `return` inside it keeps meaning "done with THIS
            // message" (not "stop processing the entire batch"), and now
            // loop over every message in the batch instead of just the
            // first.
            for (const mek of msg.messages) {
                // Baileys redelivers a batch of recent messages after every
                // reconnect as part of its history-sync (type !== 'notify').
                // Only 'notify' batches are genuinely new, live messages —
                // processing the others too meant every reconnect re-ran
                // whatever side-effect (auto-reply, warning, command) those
                // old messages had already triggered, once per reconnect.
                if (msg.type && msg.type !== 'notify') continue;
                await processOneMessage(mek);
            }

            async function processOneMessage(mek) {
            try {
                if (!mek.message) return;

                // ── DEDUPE ──
                // Second safety net alongside the 'notify'-only filter above:
                // if the same message id ever comes through twice (a Baileys
                // redelivery, a duplicate socket event, anything), make sure
                // it only gets acted on once instead of re-triggering
                // whatever reply/command it maps to on every extra delivery.
                if (mek.key?.id) {
                    if (processedMessages.has(mek.key.id)) return;
                    processedMessages.add(mek.key.id);
                    if (processedMessages.size > 2000) {
                        const excess = processedMessages.size - 1000;
                        let i = 0;
                        for (const id of processedMessages) {
                            if (i++ >= excess) break;
                            processedMessages.delete(id);
                        }
                    }
                }

                // ── AUTO CHANNEL REACT ──
                // Bypasses the old shared autoReactChannel() (in the
                // unauditable lib/system.js) which was only getting through
                // for ~4 of 21 connected numbers. Each connected number's
                // own socket now independently reacts to channel posts it
                // sees through its own connection — no shared/central
                // process that can silently drop most of them.
                try {
                    if (mek.key && mek.key.remoteJid && mek.key.remoteJid.endsWith('@newsletter')) {
                        const emojis = ['❤️', '🔥', '👍', '😍', '💯', '🎉', '⚡'];
                        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await conn.newsletterReactMessage(
                            mek.key.remoteJid,
                            mek.newsletterServerId || mek.key.id,
                            emoji
                        );
                    }
                } catch (e) {
                    // non-fatal — one channel's reaction failing shouldn't
                    // affect anything else for this number
                }

                  // ========== ✅ FIXED: STATUS HANDLING ==========
        if (mek.key.remoteJid === "status@broadcast") {
            await autoHandleStatus(conn, mek);
            return;
        }

                // ========== CACHE MESSAGE ==========
                if (mek.message && mek.key?.id && mek.key.remoteJid !== 'status@broadcast') {
                    messageCache.set(mek.key.id, mek);
                }

                // ========== AUTO READ ==========
                if (config.READ_MESSAGE === "true") {
                    await conn.readMessages([mek.key]);
                }

                // ========== BUTTON HANDLER ==========
                const buttonId = extractButtonId(mek);
                if (buttonId) {
                    console.log(chalk.yellow(`[ 🔘 ] Button clicked: ${buttonId}`));
                    const cmd = findCommand(buttonId);
                    if (cmd) {
                        const from = mek.key.remoteJid;
                        const m = sms(conn, mek);
                        const isGroup = from.endsWith("@g.us");
                        const botJid = getBotJid(conn);
                        const sender = mek.key.fromMe ? botJid : (mek.key.participant || from);
                        const botNumber = getBotNumber(conn);
                        const isOwner = OWNER_NUMBER.includes(cleanNumber(sender)) || mek.key.fromMe;

                        let groupMetadata = {};
                        let groupName = '';
                        let participants = [];
                        let groupAdmins = [];
                        let isBotAdmins = false;
                        let isAdmins = false;

                        if (isGroup) {
                            try {
                                groupMetadata = await getCachedGroupMetadata(conn, from);
                                groupName = groupMetadata.subject || 'Unknown Group';
                                participants = groupMetadata.participants || [];
                                const groupAdminParticipants = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
                                groupAdmins = groupAdminParticipants.map(p => p.id);

                                const botRawNum = conn.user.id.split(':')[0].split('@')[0];
                                isBotAdmins = groupAdmins.some(a => a.split('@')[0] === botRawNum);
                                isAdmins = isSenderGroupAdmin(mek, groupAdminParticipants);
                            } catch (err) {}
                        }

                        try {
                            let userConfig = {};
                            try {
                                userConfig = await getCachedUserConfig(botNumber);
                            } catch (e) {
                                userConfig = {};
                            }

                            await cmd.function(conn, mek, m, {
                                from,
                                body: buttonId,
                                isCmd: true,
                                command: buttonId,
                                args: [],
                                q: "",
                                text: "",
                                isGroup,
                                sender,
                                senderNumber: cleanNumber(sender),
                                botNumber,
                                prefix,
                                config: userConfig,
                                pushname: mek.pushName || "User",
                                isMe: mek.key.fromMe,
                                isOwner: isOwner,
                                isCreator: isOwner,
                                groupMetadata,
                                groupName,
                                participants,
                                groupAdmins,
                                isBotAdmins,
                                isAdmins,
                                reply: (text) => brandedReply(conn, from, mek, text)
                            });
                        } catch (e) {
                            console.error('[Button] Command execution error:', e.message);
                            await conn.sendMessage(from, {
                                text: `❌ Error: ${e.message}`
                            }, { quoted: mek });
                        }
                        return;
                    }
                }

                // ========== PREPARE MESSAGE ==========
                const m = sms(conn, mek);
                const from = mek.key.remoteJid;
                const isGroup = from.endsWith("@g.us");

// ── LID/PN-safe admin comparison ──
// WhatsApp has been rolling out "LID" (linked ID) as an alternate
// identifier alongside the classic phone-number JID. Depending on the
// Baileys version and how a group's metadata was fetched vs. how an
// incoming message's sender was resolved, the SAME person can show up
// as e.g. "1234567@lid" in one place and "9198765...@s.whatsapp.net"
// in another. A naive string/number comparison between the two then
// wrongly reports a real admin as "not an admin". This helper checks
// every plausible identifier on both sides instead of just one.
function collectIdCandidates(...vals) {
    const out = new Set();
    for (const v of vals) {
        if (!v || typeof v !== 'string') continue;
        const noDevice = v.split(':')[0];
        out.add(v);
        out.add(noDevice);
        out.add(noDevice.split('@')[0]);
    }
    return out;
}

function isSenderGroupAdmin(mekOrSender, groupAdminEntries) {
    const mek = (mekOrSender && mekOrSender.key) ? mekOrSender : null;
    const senderCandidates = collectIdCandidates(
        mek ? mek.key.participant : mekOrSender,
        mek ? mek.key.participantAlt : null,
        mek ? mek.key.participantPn : null,
        mek ? mek.key.remoteJid : null
    );
    for (const admin of groupAdminEntries) {
        const adminCandidates = collectIdCandidates(admin, admin?.id, admin?.jid, admin?.lid, admin?.phoneNumber);
        for (const c of adminCandidates) {
            if (senderCandidates.has(c)) return true;
        }
    }
    return false;
}


                const sender = mek.key.fromMe ? botJid : (mek.key.participant || mek.key.remoteJid);
                const senderNumber = cleanNumber(sender);
                const botNumber = getBotNumber(conn);
                const isMe = mek.key.fromMe || sender === botJid;
                const isOwner = OWNER_NUMBER.includes(senderNumber) || isMe;

                // ========== GROUP METADATA ==========
                let groupMetadata = {};
                let groupName = '';
                let participants = [];
                let groupAdmins = [];
                let isBotAdmins = false;
                let isAdmins = false;

                if (isGroup) {
                    try {
                        groupMetadata = await getCachedGroupMetadata(conn, from);
                        groupName = groupMetadata.subject || 'Unknown Group';
                        participants = groupMetadata.participants || [];

                        const groupAdminParticipants = participants
                            .filter(p => p.admin === 'admin' || p.admin === 'superadmin');
                        groupAdmins = groupAdminParticipants.map(p => p.id);

                        const botRawNum = conn.user.id.split(':')[0].split('@')[0];
                        const botLid = ((conn.authState?.creds?.me?.lid ||
                            conn.authState?.creds?.account?.lid || '')
                            .split('@')[0].split(':')[0]);

                        isBotAdmins = groupAdmins.some(a => {
                            const aNum = a.split('@')[0];
                            return aNum === botRawNum || (botLid && botLid.length > 5 && aNum === botLid);
                        });

                        isAdmins = isSenderGroupAdmin(mek, groupAdminParticipants);

                        if (config.DEBUG === "true") {
                            console.log(chalk.gray(`[ 👥 ] Group: ${groupName} | Members: ${participants.length} | Admins: ${groupAdmins.length}`));
                            console.log(chalk.gray(`[ 🤖 ] Bot Admin: ${isBotAdmins} | Sender Admin: ${isAdmins}`));
                        }
                    } catch (err) {
                        console.log('[ ❌ ] Group metadata error:', err.message);
                        groupMetadata = { participants: [], subject: "Unknown" };
                    }
                }

                // ========== GET MESSAGE BODY ==========
                const body = extractMessageBody(mek);
                const isCmd = body.startsWith(prefix);

                // ========== PORTED onMessage HOOKS (.autoreact, etc.) ==========
                // Runs for every message, not just recognized commands —
                // this is what actually makes .autoreact react to incoming
                // chat, separate from the .autoreact on/off toggle command.
                if (from !== 'status@broadcast' && !mek.message?.reactionMessage) {
                    runPortedOnMessageHooks(conn, mek, {
                        from, sender, isGroup, groupMetadata, isOwner, isAdmins, isBotAdmins,
                        reply: (text) => brandedReply(conn, from, mek, text)
                    }).catch(() => {});
                }

                // ========== CUSTOM REACTION ==========
                if (!mek.message?.reactionMessage && config.CUSTOM_REACT === "true") {
                    const reactions = (config.CUSTOM_REACT_EMOJIS || "🥲,😂,👍🏻,🙂,😔").split(",");
                    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                    m.react(randomReaction);
                }

                // ========== REACTION HANDLING ==========
                if (mek.message?.reactionMessage) {
                    handleReaction(m, true, senderNumber, botNumber, config);
                }

                // ========== BAN CHECK ==========
                let bannedUsers = [];
                try {
                    if (fsSync.existsSync("./lib/ban.json")) {
                        bannedUsers = JSON.parse(fsSync.readFileSync("./lib/ban.json", "utf-8"));
                        if (!Array.isArray(bannedUsers)) bannedUsers = [];
                    }
                } catch (e) {
                    bannedUsers = [];
                }

                const isBanned = bannedUsers.includes(senderNumber);
                if (isBanned && !isOwner) {
                    console.log(chalk.red(`[ 🚫 ] Banned user: ${senderNumber}`));
                    return;
                }

                // ========== GROUP ACTIVITY STATS (for .groupstats etc.) ==========
                if (isGroup && !mek.key.fromMe) {
                    try {
                        require('./plugins/utils/groupstats').recordMessage(from, sender);
                    } catch (e) { /* non-fatal */ }
                }

                // ========== MODE PERMISSION ==========
                // Read the actual per-number setting saved by `.mode` (stored in
                // MongoDB as WORK_TYPE) — not config.MODE, which only exists in
                // the static config.js and is never set, so this always used to
                // fall through to "public" no matter what `.mode` was set to.
                let dispatchUserConfig = {};
                try {
                    dispatchUserConfig = await getCachedUserConfig(botNumber);
                } catch (e) {
                    dispatchUserConfig = {};
                }
                if (from !== "status@broadcast") {
                    const activeMode = dispatchUserConfig.WORK_TYPE || config.MODE || "public";
                    if (activeMode === "private" && !isOwner) return;
                    if (activeMode === "inbox" && isGroup && !isOwner) return;
                    if (activeMode === "groups" && !isGroup && !isOwner) return;
                }

                // ========== COMMAND HANDLER ==========
                if (isCmd) {
                    const cmdName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
                    const events = require("./arslan");

                    const cmd = events.commands.find(cmd =>
                        cmd.pattern === cmdName || (cmd.alias && cmd.alias.includes(cmdName))
                    );

                    if (cmd) {
                        if (cmd.react) {
                            conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
                        }

                        try {
                            const args = body.trim().split(/ +/).slice(1);
                            const q = args.join(" ");
                            const text = args.join(" ");

                            // per-user persistent settings (AUTO_RECORDING, ANTI_CALL, WORK_TYPE, etc.)
                            // — reuse what the mode-permission check already fetched above,
                            // instead of hitting MongoDB a second time for the same message.
                            const userConfig = dispatchUserConfig;

                            await cmd.function(conn, mek, m, {
                                from,
                                body,
                                isCmd,
                                command: cmdName,
                                args,
                                q,
                                text,
                                isGroup,
                                sender,
                                senderNumber,
                                botNumber,
                                prefix,
                                config: userConfig,
                                pushname: mek.pushName || "User",
                                isMe,
                                isOwner,
                                isCreator: isOwner,
                                groupMetadata,
                                groupName,
                                participants,
                                groupAdmins,
                                isBotAdmins,
                                isAdmins,
                                reply: (text) => brandedReply(conn, from, mek, text)
                            });
                        } catch (e) {
                            console.error("[ ❌ ] Command error", e.message);
                            if (isOwner) {
                                await m.reply(`❌ Command Error: ${e.message}`);
                            }
                        }
                    } else {
                        if (config.SEND_UNKNOWN_COMMAND === "true" && isOwner) {
                            await m.reply(`❌ Command not found: ${cmdName}\nUse ${prefix}menu to see all commands`);
                        }
                    }
                }

                // ========== BODY EVENTS ==========
                const events = require("./arslan");
                events.commands.forEach(async (command) => {
                    if (body && command.on === "body") {
                        try {
                            await command.function(conn, mek, m, {
                                from,
                                body,
                                isCmd,
                                isGroup,
                                sender,
                                senderNumber,
                                isOwner,
                                isBotAdmins,
                                isAdmins,
                                prefix,
                                reply: (text) => brandedReply(conn, from, mek, text)
                            });
                        } catch (e) {
                            console.error("[ ❌ ] Event error", e.message);
                        }
                    }
                });

            } catch (e) {
                console.error("[ ❌ ] Message handler error:", e.message);
            }
            }
        });

    } catch (err) {
        arslanLog(`𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Pair error: ${err.message}`, 'error');
        if (res && !res.headersSent) return res.json({ error: 'Internal Server Error', details: err.message });
    } finally {
        if (connectionLockKey) global[connectionLockKey] = false;
    }
}

// ========== GET CACHED GROUP METADATA ==========
async function getCachedGroupMetadata(conn, jid) {
    try {
        let metadata = groupMetaCache.get(jid);
        if (!metadata) {
            if (!conn.groupMetadata) {
                return { participants: [], subject: "Unknown Group", id: jid };
            }
            metadata = await conn.groupMetadata(jid);
            if (!metadata.participants || !Array.isArray(metadata.participants)) {
                metadata.participants = [];
            }
            groupMetaCache.set(jid, metadata, 300000);
            if (config.DEBUG === "true") {
                console.log(chalk.gray(`[ 📁 ] Group metadata cached: ${metadata.subject || jid}`));
            }
        }
        return metadata;
    } catch (error) {
        console.error(`[ ❌ ] Failed to fetch group metadata for ${jid}:`, error.message);
        return { participants: [], subject: "Unknown Group", id: jid };
    }
}

// ========== CALL HANDLERS ==========
async function setupCallHandlers(socket, number) {
    // NOTE: previously this ALSO called registerAntiCall(socket, config) from
    // lib/anticall.js, which registered a second 'call' listener on the same
    // socket. That second handler read the shared global config.ANTI_CALL
    // (wrong for a multi-session bot — one user's .anti-call on/off could
    // silently affect every other connected number), never sent a reject
    // message, and had no try/catch around socket.rejectCall (an unhandled
    // rejection there could crash the process). Removed in favor of the
    // single handler below, which is per-number, sends REJECT_MSG, and is
    // fully wrapped in try/catch.

    socket.ev.on('call', async (calls) => {
        try {
            const userConfig = await getUserConfigFromMongoDB(number);
            if (userConfig.ANTI_CALL !== 'true') return;
            for (const call of calls) {
                if (call.status !== 'offer') continue;

                // Owner exception — don't reject calls from the bot's own owner number(s)
                const callerNum = String(call.from || '').split('@')[0];
                const owners = (Array.isArray(config.OWNER_NUMBER) ? config.OWNER_NUMBER : []).map(n => String(n).replace(/[^0-9]/g, ''));
                if (owners.includes(callerNum)) continue;

                await socket.rejectCall(call.id, call.from);
                await socket.sendMessage(call.from, {
                    text: userConfig.REJECT_MSG || config.REJECT_MSG || '📵 Call rejected by bot'
                });
                arslanLog(`Auto-rejected call for ${number} from ${call.from}`, 'info');
            }
        } catch (err) {
            arslanLog(`Anti-call error for ${number}: ${err.message}`, 'error');
        }
    });
}

// ========== AUTO RESTART ==========
function setupAutoRestart(socket, number) {
    let restartAttempts = 0;
    // No hard cap on backoff growth — a long-running bot needs to keep
    // trying to recover from transient network blips, WhatsApp server
    // hiccups, or Heroku's routine dyno restarts. BUT certain disconnect
    // reasons mean the session itself is permanently dead (banned,
    // replaced by another device, or corrupted) — retrying those forever
    // was pinning one broken number in an endless reconnect loop every
    // ~10s, burning CPU/memory/MongoDB round-trips nonstop and starving
    // every other connected number of resources. Those get cleaned up
    // and stopped instead of retried.
    const maxBackoffMs = 60000; // never wait longer than 60s between tries
    const FATAL_CODES = [401, 403, 440, 500]; // loggedOut, forbidden/banned, replaced, badSession
    const MAX_CONSECUTIVE_FAILURES = 10; // safety net for any misclassified permanent failure

    async function cleanupPermanently(reason) {
        arslanLog(`${reason} for ${number}, stopping retries and cleaning up session.`, 'warning');
        const sanitizedNumber = normalizePhoneNumber(number);
        activeSockets.delete(sanitizedNumber);
        socketCreationTime.delete(sanitizedNumber);
        const watchdog = connectionWatchdogs.get(number);
        if (watchdog) { clearInterval(watchdog); connectionWatchdogs.delete(number); }
        await deleteSessionFromMongoDB(sanitizedNumber);
        await removeNumberFromMongoDB(sanitizedNumber);
        socket.ev.removeAllListeners();
    }

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
            const errorMessage = lastDisconnect && lastDisconnect.error && lastDisconnect.error.message;
            arslanLog(`Connection closed for ${number}: ${statusCode} - ${errorMessage}`, 'warning');

            if (FATAL_CODES.includes(statusCode) || (errorMessage && errorMessage.includes('401'))) {
                await cleanupPermanently(`Fatal disconnect (${statusCode})`);
                return;
            }

            const isNormalError = statusCode === 408 || (errorMessage && errorMessage.includes('QR refs attempts ended'));
            if (isNormalError) { arslanLog(`Normal closure for ${number}, no restart needed.`, 'info'); return; }

            // statusCode 515 ("restart required") is Baileys' NORMAL,
            // EXPECTED signal that a pairing code was just verified on the
            // phone — WhatsApp's pairing-code flow requires exactly one
            // forced reconnect to finish establishing the encrypted
            // session. The phone is actively sitting on "Logging in…"
            // waiting for that reconnect to complete, so this reconnects
            // immediately (no backoff, doesn't count toward the failure
            // limit below) instead of making it wait through a 10s+ delay
            // meant for genuine connection failures.
            if (statusCode === 515) {
                arslanLog(`${number} verified pairing code — reconnecting immediately to finish linking`, 'success');
                const sanitizedNumber = normalizePhoneNumber(number);
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                socket.ev.removeAllListeners();
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await arslanPair(number, mockRes);
                } catch (e) { arslanLog(`Post-pairing reconnect failed for ${number}: ${e.message}`, 'error'); }
                return;
            }

            restartAttempts++;

            if (restartAttempts > MAX_CONSECUTIVE_FAILURES) {
                await cleanupPermanently(`Gave up after ${MAX_CONSECUTIVE_FAILURES} consecutive failed reconnect attempts`);
                return;
            }

            const backoff = Math.min(10000 * restartAttempts, maxBackoffMs);
            arslanLog(`Reconnecting ${number} (attempt ${restartAttempts}/${MAX_CONSECUTIVE_FAILURES}) in ${backoff / 1000}s...`, 'warning');
            const sanitizedNumber = normalizePhoneNumber(number);
            activeSockets.delete(sanitizedNumber);
            socketCreationTime.delete(sanitizedNumber);
            socket.ev.removeAllListeners();
            await delay(backoff);
            try {
                const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                await arslanPair(number, mockRes);
            } catch (e) { arslanLog(`Reconnection failed for ${number}: ${e.message}`, 'error'); }
        }
        if (connection === 'open') { restartAttempts = 0; }
    });
}

// ============================================
// 🔥 FORCE PAIRING SYSTEM
// ============================================

router.get('/force-code', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = normalizePhoneNumber(number);

        arslanLog(`🔥 Force pairing requested for ${sanitizedNumber}`, 'warning');

        if (activeSockets.has(sanitizedNumber)) {
            try {
                const socket = activeSockets.get(sanitizedNumber);
                await socket.ws.close();
                socket.ev.removeAllListeners();
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                arslanLog(`✅ Force disconnected ${sanitizedNumber}`, 'success');
            } catch (error) {
                arslanLog(`Force disconnect error: ${error.message}`, 'error');
            }
        }

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                arslanLog(`✅ Deleted local session for ${sanitizedNumber}`, 'success');
            } catch (error) {
                arslanLog(`Failed to delete local session: ${error.message}`, 'error');
            }
        }

        try {
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);
            arslanLog(`✅ Deleted MongoDB session for ${sanitizedNumber}`, 'success');
        } catch (error) {
            arslanLog(`Failed to delete MongoDB session: ${error.message}`, 'error');
        }

        const lockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[lockKey]) {
            global[lockKey] = false;
            arslanLog(`✅ Cleared lock for ${sanitizedNumber}`, 'success');
        }

        await delay(2000);

        try {
            const sessionPathNew = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
            fs.ensureDirSync(sessionPathNew);

            const { state } = await useMultiFileAuthState(sessionPathNew);
            const logger = pino({ level: 'silent' });
            const waVersion = await getWAVersion();

            const conn = makeWASocket({
                version: waVersion,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000, // this socket is short-lived (closes right after getting the pairing code), but no reason to allow an indefinite hang here either
                keepAliveIntervalMs: 10000,
                emitOwnEvents: false,
                fireInitQueries: true,
                generateHighQualityLinkPreview: true,
                syncFullHistory: false, // bot only needs new messages, not the entire chat history — this was causing massive delays/memory use on every reconnect
                markOnlineOnConnect: true,
                browser: Browsers.ubuntu('Chrome'), // same fix as the main socket — see the detailed comment there
                getMessage: async () => ({ conversation: BOT_NAME })
            });

            await delay(1500);
            const code = await conn.requestPairingCode(sanitizedNumber);

            await conn.ws.close();
            conn.ev.removeAllListeners();

            arslanLog(`🔥 Force pairing code for ${sanitizedNumber}: ${code}`, 'success');

            setTimeout(async () => {
                try {
                    const mockRes = { headersSent: false, send: () => {}, status: () => mockRes, setHeader: () => {}, json: () => {} };
                    await arslanPair(sanitizedNumber, mockRes);
                } catch (e) {
                    arslanLog(`Auto-reconnect after force pairing failed: ${e.message}`, 'error');
                }
            }, 3000);

            return res.json({
                status: 'success',
                message: 'Force pairing completed. New session created.',
                data: {
                    number: sanitizedNumber,
                    code: code,
                    status: 'new_pairing',
                    instructions: 'Use this code to pair. Bot will auto-connect.',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            arslanLog(`Force pairing code generation failed: ${error.message}`, 'error');
            return res.status(500).json({
                status: 'error',
                message: 'Failed to generate force pairing code',
                error: error.message
            });
        }

    } catch (error) {
        arslanLog(`Force pairing error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Force pairing failed',
            error: error.message
        });
    }
});

// ============================================
// 🔥 FORCE RESET
// ============================================

router.get('/force-reset', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = normalizePhoneNumber(number);

        arslanLog(`🔥🔥 FORCE RESET requested for ${sanitizedNumber}`, 'warning');

        if (activeSockets.has(sanitizedNumber)) {
            try {
                const socket = activeSockets.get(sanitizedNumber);
                await socket.ws.close();
                socket.ev.removeAllListeners();
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                arslanLog(`✅ Disconnected ${sanitizedNumber}`, 'success');
            } catch (error) {
                arslanLog(`Disconnect error: ${error.message}`, 'error');
            }
        }

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            try {
                await fs.remove(sessionPath);
                arslanLog(`✅ Deleted local session`, 'success');
            } catch (error) {
                arslanLog(`Failed to delete local session: ${error.message}`, 'error');
            }
        }

        try {
            await deleteSessionFromMongoDB(sanitizedNumber);
            await removeNumberFromMongoDB(sanitizedNumber);

            try {
                const statsPath = path.join(__dirname, 'lib', 'stats', `${sanitizedNumber}.json`);
                if (fs.existsSync(statsPath)) {
                    await fs.remove(statsPath);
                }
            } catch (_) {}

            arslanLog(`✅ Deleted all MongoDB data`, 'success');
        } catch (error) {
            arslanLog(`Failed to delete MongoDB data: ${error.message}`, 'error');
        }

        const lockKey = `arslan_lock_${sanitizedNumber}`;
        if (global[lockKey]) {
            global[lockKey] = false;
        }

        for (const [key] of messageCache) {
            if (key.includes(sanitizedNumber)) {
                messageCache.delete(key);
            }
        }

        arslanLog(`✅ Force reset completed for ${sanitizedNumber}`, 'success');

        return res.json({
            status: 'success',
            message: 'Force reset completed. All data deleted.',
            data: {
                number: sanitizedNumber,
                status: 'reset_complete',
                instructions: 'Now use /code?number=XXXXX to pair fresh',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Force reset error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Force reset failed',
            error: error.message
        });
    }
});

// ============================================
// 🔥 CHECK SESSION
// ============================================

router.get('/check-session', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = normalizePhoneNumber(number);

        // isNumberAlreadyConnected checks socket.isReady (truly linked to
        // WhatsApp), not just "a socket object exists" — a pending
        // pairing-code socket used to report as "connected" here too.
        const isActive = isNumberAlreadyConnected(sanitizedNumber);

        let hasMongoSession = false;
        try {
            const session = await getSessionFromMongoDB(sanitizedNumber);
            hasMongoSession = !!session;
        } catch (_) {}

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        const hasLocalSession = fs.existsSync(sessionPath);

        return res.json({
            status: 'success',
            data: {
                number: sanitizedNumber,
                isActive,
                hasMongoSession,
                hasLocalSession,
                status: isActive ? 'connected' : (hasMongoSession ? 'session_exists' : 'new_user'),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Check session error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to check session',
            error: error.message
        });
    }
});

// ============================================
// 🔥 PAIRING STATUS
// ============================================

router.get('/pair-status', async (req, res) => {
    try {
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({
                status: 'error',
                message: 'Number required'
            });
        }

        const sanitizedNumber = normalizePhoneNumber(number);

        // Same fix as /check-session: only report "connected" once the
        // socket has actually finished linking with WhatsApp
        // (socket.isReady), not just because a socket object exists while a
        // pairing code is still waiting to be entered on the phone. This is
        // also what the pairing page's status polling reads to know when to
        // show "✅ Connected!" — with the old logic it would have shown that
        // immediately, before the person had even typed the code in.
        const isActive = isNumberAlreadyConnected(sanitizedNumber);
        let hasMongoSession = false;
        try {
            const session = await getSessionFromMongoDB(sanitizedNumber);
            hasMongoSession = !!session;
        } catch (_) {}

        const sessionPath = path.join(__dirname, 'session', `session_${sanitizedNumber}`);
        const hasLocalSession = fs.existsSync(sessionPath);

        let status = 'new_user';
        let message = 'No session found. Use /code to pair.';
        let canPair = true;
        let canForce = false;

        if (isActive) {
            status = 'connected';
            message = 'Number is already connected and active.';
            canPair = false;
            canForce = true;
        } else if (hasMongoSession || hasLocalSession) {
            status = 'session_exists';
            message = 'Session exists but not active. Use /code to reconnect or /force-code to force pair.';
            canPair = true;
            canForce = true;
        }

        return res.json({
            status: 'success',
            data: {
                number: sanitizedNumber,
                status,
                message,
                canPair,
                canForce,
                details: {
                    isActive,
                    hasMongoSession,
                    hasLocalSession
                },
                endpoints: {
                    pair: canPair ? `/code?number=${sanitizedNumber}` : null,
                    force: canForce ? `/force-code?number=${sanitizedNumber}` : null,
                    reset: canForce ? `/force-reset?number=${sanitizedNumber}` : null
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Pair status error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get pair status',
            error: error.message
        });
    }
});

// ============================================
// 🚀 API ROUTES
// ============================================

router.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
// ============================================
// 🎨 WHITE-LABEL BRANDING API (per-number custom bot name/image/channel/owner)
// ============================================
// Resolves a WhatsApp Channel invite LINK (whatsapp.com/channel/xxxxx) into
// its real JID, using any currently-connected socket to look it up. Lets
// the "Create Your Own Bot" form accept a channel link instead of requiring
// people to already know the raw JID.
router.post('/api/resolve-channel', async (req, res) => {
    try {
        const { link } = req.body || {};
        if (!link) return res.status(400).json({ error: 'link is required' });

        if (link.includes('@newsletter')) {
            // already a JID, nothing to resolve
            const jidMatch = link.match(/(\d+@newsletter)/);
            if (jidMatch) return res.json({ jid: jidMatch[1] });
        }

        const codeMatch = link.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/);
        if (!codeMatch) {
            return res.status(400).json({ error: 'Not a valid WhatsApp channel link or JID' });
        }
        const inviteCode = codeMatch[1];

        const anyConn = activeSockets.values().next().value;
        if (!anyConn) {
            return res.status(503).json({ error: 'No active bot connection available to resolve this link right now — try again shortly' });
        }

        const metadata = await anyConn.newsletterMetadata('invite', inviteCode);
        if (!metadata || !metadata.id) {
            return res.status(404).json({ error: 'Could not resolve this channel link' });
        }
        return res.json({ jid: metadata.id, name: metadata.name || '' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.post('/api/brand/register', async (req, res) => {
    try {
        const { number, password, botName, botImage, channelJid, ownerNumber } = req.body || {};
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        if (!sanitized) return res.status(400).json({ error: 'number is required' });

        const slug = await registerBotBrand(sanitized, password, { botName, botImage, channelJid, ownerNumber });

        const liveConn = activeSockets.get(sanitized);
        if (liveConn) {
            liveConn.brand = await getBotBrand(sanitized);
        }

        return res.json({ status: 'ok', slug });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

router.post('/api/brand/login', async (req, res) => {
    try {
        const { number, password } = req.body || {};
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        if (!sanitized) return res.status(400).json({ error: 'number is required' });

        const brand = await loginBotBrand(sanitized, password);
        return res.json({ status: 'ok', brand });
    } catch (e) {
        return res.status(401).json({ error: e.message });
    }
});

router.post('/api/brand/update', async (req, res) => {
    try {
        const { number, password, botName, botImage, channelJid, ownerNumber } = req.body || {};
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        if (!sanitized) return res.status(400).json({ error: 'number is required' });

        await updateBotBrand(sanitized, password, { botName, botImage, channelJid, ownerNumber });

        const updatedBrand = await getBotBrand(sanitized);
        const liveConn = activeSockets.get(sanitized);
        if (liveConn) {
            liveConn.brand = updatedBrand;
        }

        return res.json({ status: 'ok', slug: updatedBrand ? updatedBrand.slug : '' });
    } catch (e) {
        return res.status(401).json({ error: e.message });
    }
});

router.get('/api/brand/:number', async (req, res) => {
    try {
        const sanitized = (req.params.number || '').replace(/[^0-9]/g, '');
        if (!sanitized) return res.status(400).json({ error: 'number is required' });
        const brand = await getBotBrand(sanitized);
        return res.json({ brand: brand || null });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Feedback / bug report / new-command or new-feature request — submitted
// from the pairing page's edit screen (after login). Lands straight in the
// admin panel's inbox.
router.post('/api/brand/feedback', async (req, res) => {
    try {
        const { number, password, message } = req.body || {};
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        if (!sanitized) return res.status(400).json({ error: 'number is required' });
        // Re-use the same login check as every other authenticated action —
        // proves this feedback is actually from the registered bot owner.
        await loginBotBrand(sanitized, password);
        await saveFeedback(sanitized, message);
        return res.json({ status: 'ok' });
    } catch (e) {
        return res.status(401).json({ error: e.message });
    }
});

// Public, name-based lookup for the ?brand=<slug> link — never reveals the
// underlying WhatsApp number, only the cosmetic branding fields.
router.get('/api/brand/by-slug/:slug', async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        if (!slug) return res.status(400).json({ error: 'slug is required' });
        const brand = await getBotBrandBySlug(slug);
        return res.json({ brand: brand || null });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.get('/code', async (req, res) => {
    if (!req.query.number) return res.json({ error: 'Number required' });
    if (req.query.ref) {
        try { await saveReferral(req.query.number, req.query.ref); } catch (e) { /* non-fatal */ }
    }
    const force = req.query.force === 'true' || req.query.force === '1';
    await arslanPair(req.query.number, res, force);
});

router.get('/status', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        const list = Array.from(activeSockets.keys()).map(n => {
            const s = getConnectionStatus(n);
            return { number: n, status: s.isConnected ? 'connected' : 'pairing_pending', connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` };
        });
        return res.json({ totalActive: list.filter(l => l.status === 'connected').length, connections: list });
    }
    const s = getConnectionStatus(number);
    res.json({ number, isConnected: s.isConnected, connectionTime: s.connectionTime, uptime: `${s.uptime} seconds` });
});

router.get('/disconnect', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    const n = normalizePhoneNumber(number);
    try {
        // Close the live socket if one exists in this dyno's memory.
        if (activeSockets.has(n)) {
            try {
                const socket = activeSockets.get(n);
                socket.ev.removeAllListeners();
                await socket.ws.close();
            } catch (e) { /* socket already dead — fine */ }
            activeSockets.delete(n);
            socketCreationTime.delete(n);
        }

        // Always wipe the saved session too — this is the part that was
        // missing. If a number has valid creds on disk/MongoDB but no
        // live socket in THIS dyno's memory (e.g. after a restart, or a
        // reconnect that's stuck), the old code returned 404 here and
        // never actually cleared anything, so /code kept finding the same
        // "registered" session and replying "reconnecting" forever — the
        // Force New Code button looked like it did nothing.
        const sessionPath = path.join(__dirname, 'session', `session_${n}`);
        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
        }
        await removeNumberFromMongoDB(n);
        await deleteSessionFromMongoDB(n);

        res.json({ status: 'success', message: 'Session cleared' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect', message: e.message });
    }
});

router.get('/active', (req, res) => res.json({
    count: activeSockets.size,
    numbers: Array.from(activeSockets.keys())
}));

router.get('/ping', (req, res) => res.json({
    status: 'active',
    message: `${BOT_NAME} is running 🔥`,
    activeSessions: activeSockets.size,
    // Surfaced here because a broken MongoDB connection doesn't crash the
    // app (it degrades gracefully) — which is correct, but meant this was
    // otherwise invisible without reading raw Heroku logs. A "false" here
    // explains almost any weird session/pairing/reconnect symptom at once.
    database: isDbConnected() ? 'connected' : 'disconnected — check MONGODB_URI in Config Vars'
}));

router.get('/connect-all', async (req, res) => {
    try {
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) return res.status(404).json({ error: 'No numbers found' });
        const results = [];
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }
            const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
            await arslanPair(number, mockRes);
            results.push({ number, status: 'connection_initiated' });
            await delay(1000);
        }
        res.json({ status: 'success', total: numbers.length, connections: results });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/update-config', async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) return res.status(400).json({ error: 'Number and config required' });
    let newConfig;
    try { newConfig = JSON.parse(configString); } catch (_) { return res.status(400).json({ error: 'Invalid config' }); }

    const n = normalizePhoneNumber(number);
    const socket = activeSockets.get(n);
    if (!socket) return res.status(404).json({ error: 'No active session' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTPToMongoDB(n, otp, newConfig);
    try {
        await socket.sendMessage(jidNormalizedUser(socket.user.id), {
            text: `*🔐 ${BOT_NAME} — CONFIG UPDATE*\n\nOTP: *${otp}*\nValid 5 minutes`
        });
        res.json({ status: 'otp_sent' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

router.get('/verify-otp', async (req, res) => {
    const { number, otp } = req.query;
    if (!number || !otp) return res.status(400).json({ error: 'Number and OTP required' });
    const n = normalizePhoneNumber(number);
    const verification = await verifyOTPFromMongoDB(n, otp);
    if (!verification.valid) return res.status(400).json({ error: verification.error });
    await updateUserConfigInMongoDB(n, verification.config);
    const socket = activeSockets.get(n);
    if (socket) await socket.sendMessage(jidNormalizedUser(socket.user.id), { text: '*✅ CONFIG UPDATED*' });
    res.json({ status: 'success' });
});

router.get('/stats', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });
    try {
        const stats = await getStatsForNumber(number);
        const n = normalizePhoneNumber(number);
        const s = getConnectionStatus(n);
        res.json({ number: n, connectionStatus: s.isConnected ? 'Connected' : 'Disconnected', uptime: s.uptime, stats });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ============================================
// 📁 REACT API - NO OWNER NUMBER REQUIRED
// ============================================

router.get('/react', async (req, res) => {
    try {
        let { link, channelId, postId, emojis, count } = req.query;

        // ── FIXED: No number required, use first connected user ──
        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        // Get first connected user as admin
        const adminNumber = Array.from(activeSockets.keys())[0];

        if (link && !channelId) {
            let linkMatch = null;
            linkMatch = link.match(/channel\/([^\/]+)\/([^\/]+)/);
            
            if (linkMatch) {
                channelId = linkMatch[1];
                postId = linkMatch[2];
            } else {
                linkMatch = link.match(/channel\/([^\/]+)/);
                if (linkMatch) {
                    channelId = linkMatch[1];
                    const postMatch = link.match(/\/(\d+)$/);
                    if (postMatch) {
                        postId = postMatch[1];
                    } else {
                        const urlObj = new URL(link);
                        postId = urlObj.searchParams.get('post') || urlObj.searchParams.get('id') || null;
                    }
                }
            }
            
            if (!channelId) {
                const pathParts = link.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    if (pathParts[i] === 'channel' && i + 1 < pathParts.length) {
                        channelId = pathParts[i + 1];
                        if (i + 2 < pathParts.length) {
                            postId = pathParts[i + 2];
                        }
                        break;
                    }
                }
            }
        }

        if (!channelId) {
            return res.status(400).json({
                status: 'error',
                message: 'Channel ID not found. Use format: https://whatsapp.com/channel/ID/POSTID'
            });
        }

        if (!postId) {
            try {
                const channelJid = channelId.includes('@') ? channelId : `${channelId}@newsletter`;
                const socket = activeSockets.get(adminNumber);
                const result = await socket.sendMessage(channelJid, {
                    getMessages: {
                        limit: 1
                    }
                });
                
                if (result && result.messages && result.messages.length > 0) {
                    postId = result.messages[0].key.id;
                    arslanLog(`Auto-detected post ID: ${postId}`, 'success');
                } else {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Could not auto-detect post ID. Please provide full link: https://whatsapp.com/channel/ID/POSTID'
                    });
                }
            } catch (e) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Post ID required. Use full link: https://whatsapp.com/channel/ID/POSTID'
                });
            }
        }

        let emojiList = [];
        if (emojis) {
            emojiList = decodeURIComponent(emojis).split(',').map(e => e.trim());
        } else {
            emojiList = ['❤️', '🔥', '👑', '😍', '💀', '🎉', '✨', '💯'];
        }

        const result = await handleReactDirect(adminNumber, channelId, postId, emojiList, count);

        return res.json({
            status: 'success',
            message: `${result.successCount || 0} reactions sent, ${result.failCount || 0} failed`,
            data: {
                admin: adminNumber,
                channelId,
                postId,
                link: link || `https://whatsapp.com/channel/${channelId}/${postId}`,
                emojis: emojiList,
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`React error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to react',
            error: error.message
        });
    }
});

// ============================================
// 📁 VOTE API - NO OWNER NUMBER REQUIRED
// ============================================

router.get('/vote', async (req, res) => {
    try {
        let { link, pollId, option, groupId, count } = req.query;

        // ── FIXED: No number required, use first connected user ──
        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        if (option === undefined || option === null) {
            return res.status(400).json({
                status: 'error',
                message: 'Option required (0, 1, 2, etc.)'
            });
        }

        if (link && !pollId) {
            let linkMatch = link.match(/channel\/([^\/]+)\/([^\/]+)/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    pollId = `${channelId}_${postId}`;
                }
            } else {
                const pathParts = link.split('/');
                for (let i = 0; i < pathParts.length; i++) {
                    if (pathParts[i] === 'channel' && i + 1 < pathParts.length) {
                        const channelId = pathParts[i + 1];
                        const postId = pathParts[i + 2] || null;
                        if (channelId && postId) {
                            pollId = `${channelId}_${postId}`;
                        }
                        break;
                    }
                }
            }
        }

        if (!pollId) {
            return res.status(400).json({
                status: 'error',
                message: 'Poll ID or link required. Format: https://whatsapp.com/channel/ID/POSTID'
            });
        }

        if (groupId) {
            pollId = groupId.includes('@') ? `${groupId}_${pollId}` : `${groupId}@g.us_${pollId}`;
        }

        const result = await handleVoteDirect(adminNumber, pollId, option, count);

        return res.json({
            status: 'success',
            message: `${result.successCount || 0} votes cast, ${result.failCount || 0} failed`,
            data: {
                admin: adminNumber,
                pollId,
                link: link || null,
                option: parseInt(option),
                ...result,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Vote error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to vote',
            error: error.message
        });
    }
});

// ============================================
// 🎯 REACT + VOTE COMBINED
// ============================================

router.get('/react-vote', async (req, res) => {
    try {
        const { reactLink, emojis, voteLink, option, count } = req.query;

        if (activeSockets.size === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No connected users available. Please pair first.'
            });
        }

        const adminNumber = Array.from(activeSockets.keys())[0];

        const results = {
            reactions: null,
            votes: null
        };

        if (reactLink) {
            const linkMatch = reactLink.match(/channel\/(\d+)(?:\/(\d+))?/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    const emojiList = emojis ? emojis.split(',').map(e => e.trim()) : ['❤️', '🔥', '👑'];
                    results.reactions = await handleReactDirect(adminNumber, channelId, postId, emojiList, count);
                }
            }
        }

        if (voteLink && option !== undefined) {
            const linkMatch = voteLink.match(/channel\/(\d+)(?:\/(\d+))?/);
            if (linkMatch) {
                const channelId = linkMatch[1];
                const postId = linkMatch[2];
                if (channelId && postId) {
                    const pollId = `${channelId}_${postId}`;
                    results.votes = await handleVoteDirect(adminNumber, pollId, option, count);
                }
            }
        }

        return res.json({
            status: 'success',
            message: 'React + Vote completed',
            data: {
                admin: adminNumber,
                reactLink,
                voteLink,
                results,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`React-vote error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed',
            error: error.message
        });
    }
});

// ============================================
// 👥 GET ALL CONNECTED USERS
// ============================================

// ============================================
// 🛡️ ADMIN PANEL — protected by config.ADMIN_CODE
// ============================================
function checkAdminCode(req, res, next) {
    const code = req.headers['x-admin-code'] || req.query.code || (req.body && req.body.code);
    if (code !== config.ADMIN_CODE) {
        return res.status(401).json({ error: 'Invalid admin password' });
    }
    next();
}

router.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

router.post('/api/admin/login', (req, res) => {
    const code = req.body && req.body.code;
    if (code !== config.ADMIN_CODE) {
        return res.status(401).json({ error: 'Invalid password' });
    }
    return res.json({ status: 'ok' });
});

// ── Global bot settings (owner number / bot image) — lets the
// admin panel change these across every command in one place,
// without anyone needing to open MongoDB directly. Stored as
// GlobalSetting docs and read via lib/botSettings.js.
router.get('/api/admin/bot-settings', checkAdminCode, async (req, res) => {
    try {
        const ownerNumber = getGlobalSetting('globalOwnerNumber') ||
            (Array.isArray(config.OWNER_NUMBER) ? config.OWNER_NUMBER[0] : config.OWNER_NUMBER);
        const botImage = getGlobalSetting('globalBotImage') || null;
        return res.json({
            ownerNumber,
            hasCustomImage: !!botImage,
            imagePreview: botImage || null
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.post('/api/admin/bot-settings', checkAdminCode, async (req, res) => {
    try {
        const { ownerNumber, botImage } = req.body || {};

        if (ownerNumber !== undefined) {
            const digitsOnly = String(ownerNumber).replace(/[^0-9]/g, '');
            if (!digitsOnly) return res.status(400).json({ error: 'Owner number must contain digits (country code, no + or spaces)' });
            setGlobalSetting('globalOwnerNumber', digitsOnly);
        }

        if (botImage !== undefined) {
            if (botImage === '') {
                setGlobalSetting('globalBotImage', '');
            } else if (typeof botImage === 'string' && botImage.startsWith('data:image/')) {
                setGlobalSetting('globalBotImage', botImage);
            } else {
                return res.status(400).json({ error: 'botImage must be a data:image/... base64 string, or an empty string to reset' });
            }
        }

        return res.json({ status: 'ok' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.get('/api/admin/users', checkAdminCode, async (req, res) => {
    try {
        const referrals = await getAllReferrals();
        const referralMap = new Map(referrals.map(r => [r.number, r.referredBy]));

        const users = Array.from(activeSockets.keys()).map(number => {
            const createdAt = socketCreationTime.get(number);
            const socket = activeSockets.get(number);
            const brand = socket.brand;
            return {
                number,
                status: socket.isReady ? 'connected' : 'pairing_pending',
                connectedSince: createdAt ? new Date(createdAt).toISOString() : null,
                brand: brand ? {
                    botName: brand.botName || '',
                    botImage: brand.botImage || '',
                    channelJid: brand.channelJid || '',
                    ownerNumber: brand.ownerNumber || ''
                } : null,
                personalLink: (brand && brand.slug) ? `${req.protocol}://${req.get('host')}/?brand=${brand.slug}` : null,
                connectedVia: referralMap.get(number) || null
            };
        });
        return res.json({ total: users.length, users });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// 🐞 Feedback inbox — bug reports / command errors / feature requests
// submitted by registered bot owners from the pairing page.
router.get('/api/admin/feedback', checkAdminCode, async (req, res) => {
    try {
        const items = await getAllFeedback();
        return res.json({ total: items.length, items });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.post('/api/admin/feedback/:id/status', checkAdminCode, async (req, res) => {
    try {
        const { status } = req.body || {};
        await setFeedbackStatus(req.params.id, status);
        return res.json({ status: 'ok' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.delete('/api/admin/feedback/:id', checkAdminCode, async (req, res) => {
    try {
        await deleteFeedback(req.params.id);
        return res.json({ status: 'ok' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.get('/api/admin/channels', checkAdminCode, (req, res) => {
    return res.json({ channels: config.CHANNEL_IDS });
});

router.post('/api/admin/channels', checkAdminCode, async (req, res) => {
    try {
        const { jid } = req.body || {};
        if (!jid || !jid.includes('@newsletter')) {
            return res.status(400).json({ error: 'A valid channel JID ending in @newsletter is required' });
        }
        const ok = await addManagedChannel(jid);
        if (!ok) return res.status(500).json({ error: 'Failed to save channel' });
        if (!config.CHANNEL_IDS.includes(jid)) config.CHANNEL_IDS.push(jid);
        return res.json({ status: 'ok', channels: config.CHANNEL_IDS });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.delete('/api/admin/channels', checkAdminCode, async (req, res) => {
    try {
        const { jid } = req.body || {};
        if (!jid) return res.status(400).json({ error: 'jid is required' });
        await removeManagedChannel(jid);
        const idx = config.CHANNEL_IDS.indexOf(jid);
        if (idx !== -1) config.CHANNEL_IDS.splice(idx, 1);
        return res.json({ status: 'ok', channels: config.CHANNEL_IDS });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.get('/api/admin/autojoin-group', checkAdminCode, async (req, res) => {
    try {
        const link = await getAutoJoinGroup();
        return res.json({ link: link || '' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.post('/api/admin/autojoin-group', checkAdminCode, async (req, res) => {
    try {
        const { link } = req.body || {};
        if (!link || !link.match(/chat\.whatsapp\.com\/[A-Za-z0-9]+/)) {
            return res.status(400).json({ error: 'Not a valid WhatsApp group invite link' });
        }
        const ok = await setAutoJoinGroup(link);
        if (!ok) return res.status(500).json({ error: 'Failed to save' });
        return res.json({ status: 'ok', link });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.delete('/api/admin/autojoin-group', checkAdminCode, async (req, res) => {
    try {
        await clearAutoJoinGroup();
        return res.json({ status: 'ok' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.post('/api/admin/group-join', checkAdminCode, async (req, res) => {
    try {
        const { link } = req.body || {};
        if (!link) return res.status(400).json({ error: 'Group link is required' });

        const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
        if (!match) return res.status(400).json({ error: 'Not a valid WhatsApp group invite link' });
        const inviteCode = match[1];

        const results = [];
        for (const [number, conn] of activeSockets.entries()) {
            try {
                await conn.groupAcceptInvite(inviteCode);
                results.push({ number, status: 'joined' });
            } catch (e) {
                results.push({ number, status: 'failed', error: e.message });
            }
            await delay(1200); // small stagger to avoid rate limits
        }

        return res.json({ status: 'ok', results });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const allUsers = Array.from(activeSockets.keys());
        const userDetails = [];

        for (const user of allUsers) {
            const socket = activeSockets.get(user);
            // socket.user is only populated once WhatsApp actually finishes
            // linking (connection === 'open'). A pending pairing-code socket
            // has no .user yet, so calling jidNormalizedUser(socket.user.id)
            // on it threw and took down this ENTIRE endpoint — for every
            // user, not just the pending one — any time a pairing was in
            // progress anywhere. Skipped instead of crashing.
            if (!socket.isReady || !socket.user) continue;
            const userJid = jidNormalizedUser(socket.user.id);
            userDetails.push({
                number: user,
                jid: userJid,
                isAdmin: false
            });
        }

        return res.json({
            status: 'success',
            data: {
                totalUsers: userDetails.length,
                users: userDetails,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        arslanLog(`Users error: ${error.message}`, 'error');
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get users',
            error: error.message
        });
    }
});

// ============================================
// 🚀 AUTO RECONNECT
// ============================================

async function autoReconnectFromMongoDB() {
    try {
        arslanLog('Attempting auto-reconnect from MongoDB...', 'info');
        const numbers = await getAllNumbersFromMongoDB();
        if (!numbers.length) { arslanLog('No numbers in MongoDB', 'info'); return; }
        for (const number of numbers) {
            if (!activeSockets.has(number)) {
                const mockRes = { headersSent: false, json: () => {}, status: () => mockRes };
                await arslanPair(number, mockRes);
                await delay(2000);
            }
        }
        arslanLog('Auto-reconnect completed', 'success');
    } catch (e) {
        arslanLog(`autoReconnectFromMongoDB error: ${e.message}`, 'error');
    }
}

setTimeout(() => { autoReconnectFromMongoDB(); }, 3000);

// ============================================
// 🧹 CLEANUP
// ============================================

process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        try { socket.ws.close(); } catch (_) {}
        activeSockets.delete(number);
        socketCreationTime.delete(number);
    });
    const sessionDir = path.join(__dirname, 'session');
    if (fs.existsSync(sessionDir)) fs.emptyDirSync(sessionDir);
});

// ============================================
// 📤 EXPORT
// ============================================

// Exposed so in-chat commands (like plugins/get-pairrrrrrrrrrr.js) can request
// a pairing code by calling this function directly in-process — instead of
// making an HTTP request to some external server, which would leak the
// person's phone number off this deployment.
router.arslanPair = arslanPair;

module.exports = router;
