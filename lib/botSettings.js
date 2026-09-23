// ============================================================
// Centralised resolver for the bot's display image and owner
// number. Every plugin should read through here instead of
// hardcoding a file path or config value directly — this is
// what the admin panel's "Change photo / Change number" tool
// updates, and having one place to change means it can never
// go stale in some commands while being updated in others.
//
// Priority order (highest wins):
//   1. Per-number brand override (BotBrand doc in MongoDB)
//   2. Global admin-panel setting (GlobalSetting doc in MongoDB)
//   3. Local file / config.js default
// ============================================================

const fs = require('fs');
const config = require('../config');
const { getGlobalSetting } = require('./database');

function getOwnerNumber(brand) {
    if (brand && brand.ownerNumber) return brand.ownerNumber;

    const global = getGlobalSetting('globalOwnerNumber');
    if (global) return global;

    return Array.isArray(config.OWNER_NUMBER) ? config.OWNER_NUMBER[0] : config.OWNER_NUMBER;
}

function base64ToBuffer(dataUri) {
    const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    return Buffer.from(base64, 'base64');
}

// Returns a Buffer (preferred, for local/DB-stored images) or
// { url } (for a remote image URL) — callers already handle
// both shapes since this mirrors the old per-file fallback logic.
function getBotImage(brand) {
    if (brand && brand.botImage) {
        if (brand.botImage.startsWith('data:')) return base64ToBuffer(brand.botImage);
        return { url: brand.botImage };
    }

    const global = getGlobalSetting('globalBotImage');
    if (global && typeof global === 'string') {
        if (global.startsWith('data:')) return base64ToBuffer(global);
        return { url: global };
    }

    try {
        return fs.readFileSync(config.IMAGE_PATH);
    } catch (e) {
        return { url: config.IMAGE_PATH };
    }
}

module.exports = { getOwnerNumber, getBotImage };
