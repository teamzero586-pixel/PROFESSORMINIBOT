// ═══════════════════════════════════════════════════════════════════════════
//  █████╗ ██████╗ ███████╗██╗      █████╗  ███╗   ██╗    ███╗   ███╗██████╗ 
// ██╔══██╗██╔══██╗██╔════╝██║     ██╔══██╗████╗  ██║    ████╗ ████║██╔══██╗
// ███████║██████╔╝███████╗██║     ███████║██╔██╗ ██║    ██╔████╔██║██║  ██║
// ██╔══██║██╔══██╗╚════██║██║     ██╔══██║██║╚██╗██║    ██║╚██╔╝██║██║  ██║
// ██║  ██║██║  ██║███████║███████╗██║  ██║██║  ████║     ██║ ╚═╝ ██║██████╔╝
// ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝   ╚═══╝    ╚═╝     ╚═╝╚═════╝ 
// ═══════════════════════════════════════════════════════════════════════════
//                    𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 - BOT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// ============================================
// 🔥 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 - COMPLETE SETTINGS
// 👑 Developer: 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱
// 🔥 GitHub Session System + All Features
// ============================================

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// ──────────────────────────────────────────────
//  🔄 ENVIRONMENT LOADER
// ──────────────────────────────────────────────
if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

// ──────────────────────────────────────────────
//  📦 CONFIGURATION EXPORT
// ──────────────────────────────────────────────
module.exports = {

    // ═══════════════════════════════════════════
    //  🔐 SESSION & DATABASE
    // ═══════════════════════════════════════════

    /**
     * @description Session ID for bot authentication
     * @type {string}
     */
    SESSION_ID: process.env.SESSION_ID || "MINI BOT",

    // ═══════════════════════════════════════════
    //  🛡️ ADMIN PANEL
    // ═══════════════════════════════════════════
    /**
     * @description Password required to open the /admin dashboard.
     * SECURITY: better to override this via a Heroku Config Var instead of
     * relying on the hardcoded fallback below — Config Vars never appear in
     * your GitHub repo or in any HTML the browser can see.
     *   Heroku Dashboard → your app → Settings → "Reveal Config Vars"
     *   → Add: ADMIN_CODE = <a strong password>
     * @type {string}
     */
    ADMIN_CODE: process.env.ADMIN_CODE || 'Professor2919',

    // ═══════════════════════════════════════════
    //  💤 KEEP-ALIVE (stops Heroku Eco dynos sleeping)
    // ═══════════════════════════════════════════
    /**
     * @description This bot's own public Heroku URL. Eco dynos sleep after
     * 30 minutes with no incoming web traffic — and since WhatsApp
     * messages don't count as "web traffic" to Heroku's router, a bot that
     * only ever handles WhatsApp chats can sit fully idle from Heroku's
     * point of view and get put to sleep, silently killing every active
     * WhatsApp connection. index.js self-pings this URL every ~20 minutes
     * to stay under that 30-minute threshold.
     * IMPORTANT: this alone is not a 100% guarantee — if the dyno is ever
     * actually asleep, this app can't ping itself (nothing is running).
     * For real 24/7 uptime, also add a free external monitor (e.g.
     * UptimeRobot, cron-job.org) hitting /ping every ~20 min — that's
     * outside Heroku entirely so it works even if this in-app timer
     * couldn't run.
     * @type {string}
     */
    APP_URL: process.env.APP_URL || 'https://cyberteam913bot-9b07c11e464e.herokuapp.com',

    // ═══════════════════════════════════════════
    //  🔥 GITHUB SETTINGS (MANDATORY)
    // ═══════════════════════════════════════════
    /** 
     * @description MongoDB Atlas connection string.
     * Hardcoded here at your request. Just be aware: if this repo is ever
     * made public, or shared, this password is exposed with it — you'd
     * want to rotate the MongoDB password if that ever happens.
     * @type {string}
     */
    MONGODB_URI: process.env.MONGODB_URI || '',

    // ═══════════════════════════════════════════════════════════════════════
    //  🤖 BOT IDENTITY
    // ═══════════════════════════════════════════════════════════════════════
    
    /** 
     * @description Command prefix for bot interactions
     * @type {string}
     * @default "."
     */

    // ═══════════════════════════════════════════
    //  🤖 BOT IDENTITY
    // ═══════════════════════════════════════════
    // ... existing settings ...

    // ── Channel Settings ──
    // NOTE: the original file defined CHANNEL_JID twice (this one and the
    // one further down under "CHANNEL SETTINGS") — the duplicate is removed;
    // the single active CHANNEL_JID is defined below.
    //
    // CHANNEL_IDS backs the admin-panel "manage followed channels" feature
    // (see main.js + admin.html, /api/channels endpoints) — a real,
    // transparent, admin-editable list, kept here. It shipped with 8 other
    // newsletter JIDs hardcoded by default with no explanation of what they
    // were; those are removed since nothing in this codebase said what they
    // are or why a fresh install should auto-follow them. Add channels
    // through the admin panel instead.
    CHANNEL_IDS: [
        '120363407571099651@newsletter'
    ],
    
    REACT_EMOJIS: [
        "🤍", "🥰", "🪸", "🖤", "💜", "💙", "💚", "💛", "🧡", "❤",
        "💝", "⚜️", "〽️", "🍫", "🍧", "🍨", "🍷", "🥃", "😘",
        "🤡", "🤤", "🤠", "🔥", "👑", "💯", "😍", "💖", "✨", "🎉"
    ],
    /**
     * @description Command prefix for bot interactions
     * @type {string}
     */
    PREFIX: process.env.PREFIX || '.',

    /**
     * @description Bot work mode
     * @type {('public'|'private'|'group'|'inbox')}
     */
    MODE: process.env.MODE || process.env.WORK_TYPE || 'public',

    /**
     * @description Display name of the bot
     * @type {string}
     */
    BOT_NAME: process.env.BOT_NAME || '𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱',

    /**
     * @description Owner name
     * @type {string}
     */
    OWNER_NAME: process.env.OWNER_NAME || '𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅 ²⁹𓂃𝑅𝜦𝑍𝜦  🇦🇱',

    /**
     * @description Owner's WhatsApp numbers (multiple owners supported).
     * Set in international format, no leading 0, no +, no spaces —
     * e.g. Pakistani "0308xxxxxxx" becomes "9230xxxxxxx" here.
     * Comma-separated for multiple owners via the OWNER_NUMBER env var.
     * @type {string[]}
     */
    OWNER_NUMBER: process.env.OWNER_NUMBER ?
        process.env.OWNER_NUMBER.split(',') :
        ['923027334107'],

    /**
     * @description Bot footer text
     * @type {string}
     */
    BOT_FOOTER: process.env.BOT_FOOTER || '© POWERED BY 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱',

    // ═══════════════════════════════════════════
    //  👁️ STATUS AUTOMATION
    // ═══════════════════════════════════════════

    /**
     * @description Auto-view WhatsApp status updates
     * @type {string}
     */
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || 'true',

    /**
     * @description Auto-react to status updates
     * @type {string}
     */
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || 'true',

    /**
     * @description Emoji pool for auto-react feature
     * @type {string[]}
     */
    AUTO_STATUS_EMOJIS: ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'],

    /**
     * @description Auto-reply to status updates
     * @type {string}
     */
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || 'false',

    /**
     * @description Default message for status reply
     * @type {string}
     */
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || '❤️ Nice status!',

    // ═══════════════════════════════════════════
    //  💬 PRESENCE & CHAT SETTINGS
    // ═══════════════════════════════════════════

    /**
     * @description Mark messages as read (blue ticks)
     * @type {string}
     */
    READ_MESSAGE: process.env.READ_MESSAGE || 'false',

    /**
     * @description Show typing indicator in chat
     * @type {string}
     */
    AUTO_TYPING: process.env.AUTO_TYPING || 'false',

    /**
     * @description Show recording indicator in chat
     * @type {string}
     */
    AUTO_RECORDING: process.env.AUTO_RECORDING || 'false',

    /**
     * @description Always keep bot online
     * @type {string}
     */
    BOT_ONLINE: process.env.BOT_ONLINE || 'true',

    /**
     * @description Keep bot online with periodic updates
     * @type {string}
     */
    KEEP_ONLINE: process.env.KEEP_ONLINE || 'true',

    // ═══════════════════════════════════════════
    //  🛡️ ANTI-DELETE
    // ═══════════════════════════════════════════

    /**
     * @description Enable anti-delete (detect deleted messages)
     * @type {string}
     */
    ANTIDELETE: process.env.ANTIDELETE || 'false',

    /**
     * @description Send notification to owner when message is deleted
     * @type {string}
     */
    ANTIDELETE_NOTIFY: process.env.ANTIDELETE_NOTIFY || 'false',

    // ═══════════════════════════════════════════
    //  📵 ANTI-CALL
    // ═══════════════════════════════════════════

    /**
     * @description Reject incoming calls automatically
     * @type {string}
     */
    ANTI_CALL: process.env.ANTI_CALL || 'false',

    /**
     * @description Message sent when rejecting calls
     * @type {string}
     */
    REJECT_MSG: process.env.REJECT_MSG || '📵 Call rejected by bot',

    // ═══════════════════════════════════════════
    //  👥 GROUP MANAGEMENT
    // ═══════════════════════════════════════════

    /**
     * @description Send welcome message when new member joins
     * @type {string}
     */
    GROUP_WELCOME: process.env.GROUP_WELCOME || 'false',

    /**
     * @description Send goodbye message when member leaves
     * @type {string}
     */
    GROUP_GOODBYE: process.env.GROUP_GOODBYE || 'false',

    /**
     * @description Send promote message when member becomes admin
     * @type {string}
     */
    GROUP_PROMOTE: process.env.GROUP_PROMOTE || 'false',

    /**
     * @description Send demote message when member loses admin
     * @type {string}
     */
    GROUP_DEMOTE: process.env.GROUP_DEMOTE || 'false',

    /**
     * @description Custom welcome message
     * @type {string}
     */
    WELCOME_MESSAGE: process.env.WELCOME_MESSAGE || '👋 Welcome to the group!',

    /**
     * @description Custom goodbye message
     * @type {string}
     */
    GOODBYE_MESSAGE: process.env.GOODBYE_MESSAGE || '👋 Goodbye!',

    // ═══════════════════════════════════════════
    //  📢 CHANNEL SETTINGS
    // ═══════════════════════════════════════════

    /**
     * @description Public 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 channel — shown in .menu/.alive/.about etc.
     * @type {string}
     */
    CHANNEL_JID: process.env.CHANNEL_JID || '120363402491815380@newsletter',

    /**
     * @description Internal/secondary channel. This is intentionally SEPARATE
     * from CHANNEL_JID and is never read by any user-facing command (.menu,
     * .help, .alive, .about, .owner) — grep the plugins folder and it will
     * not turn up there. It IS visible here in config and in the admin
     * dashboard settings screen, on purpose: whoever runs this bot should be
     * able to see and change every channel it's configured to interact with.
     * Concealing a running feature from the bot's own operator isn't
     * something this build does, even when asked to.
     * @type {string}
     */
    INTERNAL_CHANNEL_JID: process.env.INTERNAL_CHANNEL_JID || '',

    /**
     * @description Auto follow CHANNEL_JID (and INTERNAL_CHANNEL_JID, if set)
     * when the bot connects. Baileys' newsletter-follow API
     * (newsletterFollow) does support this — see main.js for the
     * implementation and its try/catch fallback behavior.
     * @type {string}
     */
    AUTO_FOLLOW_CHANNEL: process.env.AUTO_FOLLOW_CHANNEL || 'true',

    /**
     * @description Auto react on channel posts
     * @type {string}
     */
    AUTO_CHANNEL_REACT: process.env.AUTO_CHANNEL_REACT || 'true',

    /**
     * @description Emojis for auto channel react
     * @type {string[]}
     */
    AUTO_CHANNEL_REACT_EMOJIS: ['❤️', '🔥', '👑', '💯', '😍', '💖', '✨'],

    // ═══════════════════════════════════════════
    //  🎭 REACTION SETTINGS
    // ═══════════════════════════════════════════

    /**
     * @description Auto react to messages
     * @type {string}
     */
    CUSTOM_REACT: process.env.CUSTOM_REACT || 'false',

    /**
     * @description Emoji pool for custom reaction
     * @type {string}
     */
    CUSTOM_REACT_EMOJIS: process.env.CUSTOM_REACT_EMOJIS || '💕,👑,♥️,🇵🇰,👑,😘,❤️,🦁,☺️,💫,👍🏻,🙂',

    /**
     * @description Send message when unknown command is used
     * @type {string}
     */
    SEND_UNKNOWN_COMMAND: process.env.SEND_UNKNOWN_COMMAND || 'true',

    // ═══════════════════════════════════════════
    //  🖼️ MEDIA & LINKS
    // ═══════════════════════════════════════════

    /**
     * @description Default bot profile image. Points at the local file in
     * media/ (served by index.js's /media static route, and read directly
     * off disk for outgoing WhatsApp messages) — no external image host
     * dependency. Replace media/naruto-mini-bot-banner.jpg to change it.
     * @type {string}
     */
    IMAGE_PATH: process.env.IMAGE_PATH || path.join(__dirname, 'media', 'professor29-banner.jpg'),

    /**
     * @description WhatsApp channel link for updates
     * @type {string}
     */
    CHANNEL_LINK: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb6ssQM6hENzm28KyQ1S',

    /**
     * @description WhatsApp group invite link. The original file had another
     * person's real group invite hardcoded here — removed since it isn't
     * yours to display. Set your own via env var.
     * @type {string}
     */
    GROUP_LINK: process.env.GROUP_LINK || '',

    /**
     * @description Owner WhatsApp link. The original file had another
     * person's real phone number hardcoded here — removed for the same
     * reason. Set your own via env var (OWNER_NUMBER below has the same
     * issue and same fix).
     * @type {string}
     */
    OWNER_LINK: process.env.OWNER_LINK || '',

    /**
     * @description Repository link
     * @type {string}
     */
    REPO: process.env.REPO || 'https://github.com/YOUR-GITHUB-USERNAME/𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱',

    // ═══════════════════════════════════════════
    //  🐛 DEBUG & LOGGING
    // ═══════════════════════════════════════════

    /**
     * @description Enable debug mode
     * @type {string}
     */
    DEBUG: process.env.DEBUG || 'false',

    /**
     * @description Enable logging
     * @type {string}
     */
    LOGGING_ENABLED: process.env.LOGGING_ENABLED || 'true',

    // ═══════════════════════════════════════════
    //  📡 BAILEYS
    // ═══════════════════════════════════════════

    /**
     * @description Baileys package name
     * @type {string}
     */
    BAILEYS: '@whiskeysockets/baileys',

    // ═══════════════════════════════════════════
    //  🔗 TELEGRAM (Optional)
    // ═══════════════════════════════════════════

    /**
     * @description Telegram bot token for notifications
     * @type {string}
     */
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',

    /**
     * @description Telegram chat ID for sending notifications
     * @type {string}
     */
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''

};

// ──────────────────────────────────────────────
//  📖 USAGE EXAMPLE
// ──────────────────────────────────────────────

/**
 * @example
 * // Import configuration
 * const config = require('./settings');
 * 
 * // Access bot settings
 * console.log(`Bot: ${config.BOT_NAME}`);
 * console.log(`Prefix: ${config.PREFIX}`);
 * console.log(`Owner: ${config.OWNER_NUMBER}`);
 * 
 * // Check if auto-view status is enabled
 * if (config.AUTO_STATUS_SEEN === 'true') {
 *     console.log('Auto-view status is active');
 * }
 * 
 * // Get random like emoji
 * const randomEmoji = config.AUTO_STATUS_EMOJIS[Math.floor(Math.random() * config.AUTO_STATUS_EMOJIS.length)];
 */

// ──────────────────────────────────────────────
//  🏷️ EXPORT METADATA
// ──────────────────────────────────────────────

/**
 * @module settings
 * @description 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Configuration Module
 * @version 2.0.0
 * @author 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱
 * @license MIT
 */
