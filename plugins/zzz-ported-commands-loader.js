// ============================================
// 🔌 PORTED COMMANDS COMPAT LOADER — ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀
// Bridges "ProBoy-MD style" command files
// (module.exports = { name, execute(sock,msg,args,extra) })
// into this bot's native cmd() system.
//
// Drop new ported-style commands into:
//   plugins/ported-commands/<category>/<file>.js
// They will be auto-discovered and registered on boot.
// This loader file itself must stay directly inside plugins/.
// ============================================

const fs = require('fs');
const path = require('path');
const { cmd } = require('../arslan');
const config = require('../config');
const realDb = require('../lib/database');

const PORTED_DIR = path.join(__dirname, 'ported-commands');

// ---- best-effort in-memory DB shim (per boot, not persistent) ----
const memStore = new Map();
const dbShim = {
    get(key) { return memStore.get(key); },
    set(key, val) { memStore.set(key, val); return true; },
    has(key) { return memStore.has(key); },
    delete(key) { return memStore.delete(key); },
    // getGlobalSetting/setGlobalSetting were called by ~15 ported plugins
    // (.button, .autoreact, .autostatus, .ban/.unban, .setsudo/.removesudo,
    // .gccmd, .publish, first-message greeting, .autoreply) but this shim
    // never had them at all — every one of those commands has been
    // throwing "database.getGlobalSetting is not a function" since day
    // one. Wired through to the real, MongoDB-backed, persistent
    // implementation in lib/database.js instead of adding another
    // non-persistent stub — these are exactly the kind of settings
    // (ban lists, sudo lists, on/off toggles) that need to survive a
    // dyno restart, so the in-memory-only memStore above was never the
    // right place for them even before the crash.
    getGlobalSetting: realDb.getGlobalSetting,
    setGlobalSetting: realDb.setGlobalSetting,
};

// ---- adapt this bot's UPPER_SNAKE config to ProBoy's lowerCamel shape ----
const adaptedConfig = {
    prefix: config.PREFIX,
    botName: config.BOT_NAME,
    ownerName: config.OWNER_NAME,
    ownerNumber: config.OWNER_NUMBER,
    sudoNumbers: config.OWNER_NUMBER,
    newsletterJid: config.CHANNEL_JID,
    cidJsonUrl: '',
    updateZipUrl: '',
    statusSettings: {},
    antideleteSettings: {},
    social: {
        channel: config.CHANNEL_LINK,
        whatsappChannel: config.CHANNEL_LINK,
        website: config.CHANNEL_LINK,
    },
    messages: {},
};

function normalizeJid(jid) {
    if (!jid) return jid;
    return jid.split(':')[0];
}

function buildComparableIds(jid) {
    const norm = normalizeJid(jid);
    return [jid, norm, (norm || '').split('@')[0]];
}

function getMessageContent(mek) {
    const msg = mek?.message;
    if (!msg) return '';
    return msg.conversation
        || msg.extendedTextMessage?.text
        || msg.imageMessage?.caption
        || msg.videoMessage?.caption
        || '';
}

function loadPortedCommands() {
    if (!fs.existsSync(PORTED_DIR)) return;

    const categories = fs.readdirSync(PORTED_DIR).filter(f =>
        fs.statSync(path.join(PORTED_DIR, f)).isDirectory()
    );

    let loaded = 0, failed = 0;

    for (const category of categories) {
        const catDir = path.join(PORTED_DIR, category);
        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.js'));

        for (const file of files) {
            const filePath = path.join(catDir, file);
            try {
                delete require.cache[require.resolve(filePath)];
                const mod = require(filePath);
                if (!mod || !mod.name || typeof mod.execute !== 'function') {
                    continue; // not a valid ported command file, skip quietly
                }

                cmd({
                    pattern: mod.name,
                    alias: mod.aliases || [],
                    desc: mod.description || '',
                    category: mod.category || category,
                    filename: filePath,
                }, async (conn, mek, m, ctx) => {
                    // Permission guards (best-effort translation)
                    if (mod.ownerOnly && !ctx.isOwner) {
                        return ctx.reply('❌ This command is for the owner only.');
                    }
                    if (mod.groupOnly && !ctx.isGroup) {
                        return ctx.reply('❌ This command works in groups only.');
                    }
                    if (mod.privateOnly && ctx.isGroup) {
                        return ctx.reply('❌ This command works in private chat only.');
                    }
                    if (mod.adminOnly && ctx.isGroup && !ctx.isAdmins && !ctx.isOwner) {
                        return ctx.reply('❌ This command is for group admins only.');
                    }
                    if (mod.modOnly && !ctx.isOwner) {
                        return ctx.reply('❌ This command is for mods/owner only.');
                    }

                    const extra = {
                        from: ctx.from,
                        sender: ctx.sender,
                        isGroup: ctx.isGroup,
                        groupMetadata: ctx.groupMetadata,
                        isOwner: ctx.isOwner,
                        isSudo: ctx.isOwner,
                        isAdmin: ctx.isAdmins,
                        isBotAdmin: ctx.isBotAdmins,
                        isMod: ctx.isOwner,
                        config: adaptedConfig,
                        commands: require('../arslan').commands,
                        database: dbShim,
                        utils: {
                            getMessageContent,
                            normalizeJidWithLid: normalizeJid,
                            normalizeJid,
                            buildComparableIds,
                        },
                        reply: ctx.reply,
                        react: (emoji) => conn.sendMessage(ctx.from, { react: { text: emoji, key: mek.key } }),
                    };

                    try {
                        await mod.execute(conn, mek, ctx.args || [], extra);
                    } catch (err) {
                        console.error(`[Ported:${mod.name}] error:`, err.message);
                        await ctx.reply(`❌ ${err.message}`);
                    }
                });

                loaded++;
            } catch (e) {
                failed++;
                console.error(`[PortedLoader] Failed to load ${category}/${file}: ${e.message}`);
            }
        }
    }

    console.log(`[PortedLoader] ✅ Loaded ${loaded} ported commands (${failed} failed) from plugins/ported-commands/`);
}

loadPortedCommands();

module.exports = { loadPortedCommands };
