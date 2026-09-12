const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config');

let dbConnected = false;

const connectdb = async () => {
    try {
        // A trailing space or newline pasted into Heroku's Config Vars box
        // (very easy to do by accident when copy-pasting a connection
        // string) makes MongoDB reject the login with exactly "bad auth:
        // authentication failed" — which looks identical to an actually
        // wrong password. Trimming here costs nothing and rules that out.
        const uri = (config.MONGODB_URI || '').trim();
        if (!uri) {
            console.error("❌ Database Connection Failed: MONGODB_URI is not set (check Heroku Config Vars)");
            dbConnected = false;
            return;
        }
        mongoose.set('strictQuery', false);
        await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        dbConnected = true;
        console.log("✅ Database Connected Successfully");
        await loadGlobalSettingsCache();
    } catch (e) {
        dbConnected = false;
        console.error("❌ Database Connection Failed:", e.message);
        if (/bad auth|authentication failed/i.test(e.message)) {
            console.error("   → This is a wrong username/password in MONGODB_URI, not a code bug. Double-check the Database Access user in MongoDB Atlas (Atlas → Database Access), and re-copy the connection string from Atlas → Connect → Drivers rather than retyping it by hand.");
        } else if (/ETIMEDOUT|timed out|IP/i.test(e.message)) {
            console.error("   → This usually means MongoDB Atlas isn't allowing connections from Heroku's IP. In Atlas → Network Access, add 0.0.0.0/0 (allow from anywhere) since Heroku's outbound IPs change.");
        }
    }
};

// ====================================
// GLOBAL SETTINGS (key/value store)
// ====================================
// A large number of plugins (.button, .autoreact, .autostatus, .ban/.unban,
// .setsudo/.removesudo/.listsudo, .gccmd, .publish, first-message greeting,
// .autoreply) all called db.getGlobalSetting(key) / db.setGlobalSetting(key,
// value) — but neither function was ever actually implemented anywhere in
// this file. Every one of those commands has been throwing
// "getGlobalSetting is not a function" since the project's very first
// version; this wasn't a regression, it was always broken.
//
// Every caller uses these synchronously (no `await`, return value read
// immediately) so this is backed by an in-memory cache — loaded from
// MongoDB once at startup (loadGlobalSettingsCache(), called from
// connectdb() above) and kept in sync on every write. Reads never touch the
// network; writes update the cache immediately and persist to MongoDB in
// the background. If MongoDB is unreachable, everything still works for
// the lifetime of the process — it just won't be remembered after a
// restart, which is the same graceful-degradation behavior as the rest of
// this file rather than a crash.
const globalSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });
const GlobalSetting = mongoose.model('GlobalSetting', globalSettingSchema);

let globalSettingsCache = {};

async function loadGlobalSettingsCache() {
    try {
        const docs = await GlobalSetting.find({});
        const cache = {};
        for (const doc of docs) cache[doc.key] = doc.value;
        globalSettingsCache = cache;
    } catch (e) {
        console.error("Failed to load global settings cache:", e.message);
    }
}

function getGlobalSetting(key) {
    return globalSettingsCache[key];
}

function setGlobalSetting(key, value) {
    globalSettingsCache[key] = value;
    GlobalSetting.updateOne({ key }, { $set: { value } }, { upsert: true }).catch(e => {
        console.error(`Failed to persist global setting "${key}":`, e.message);
    });
}

// ====================================
// MODÈLES
// ====================================

const sessionSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    credentials: {
        type: Object,
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const userConfigSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    // Per-number bot settings — Mixed on purpose: commands like `.welcome`,
    // `.goodbye`, `.mode` etc. write NEW keys here dynamically (WELCOME,
    // GOODBYE, WORK_TYPE, WELCOME_MESSAGE...) that aren't in a fixed list.
    // A strict typed sub-schema would silently DROP any key not declared
    // below on every save — which is exactly what was happening: those
    // toggle commands replied "✅ saved" but nothing actually persisted.
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({
            AUTO_RECORDING: 'false',
            AUTO_TYPING: 'false',
            ANTI_CALL: 'false',
            REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
            READ_MESSAGE: 'false',
            AUTO_VIEW_STATUS: 'false',
            AUTO_LIKE_STATUS: 'false',
            AUTO_STATUS_REPLY: 'false',
            AUTO_STATUS_MSG: 'Hello from black popkid!',
            AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
            ANTIDELETE: 'true'
        })
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true,
        index: true 
    },
    otp: { type: String, required: true },
    config: { type: Object, required: true },
    expiresAt: { 
        type: Date, 
        default: () => new Date(Date.now() + 5 * 60000), // 5 minutes
        index: { expires: '5m' }
    },
    createdAt: { type: Date, default: Date.now }
});

// 4. Numéros actifs (pour reconnexion)
const activeNumberSchema = new mongoose.Schema({
    number: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    lastConnected: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    connectionInfo: {
        ip: String,
        userAgent: String,
        timestamp: Date
    }
});

const statsSchema = new mongoose.Schema({
    number: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    commandsUsed: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    groupsInteracted: { type: Number, default: 0 }
});

// 6. Per-number custom branding (white-label): bot name, image, channel, owner
const brandSchema = new mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    slug: { type: String, index: true, sparse: true, unique: true }, // name-based id used in the public ?brand= link, e.g. "my-cool-bot"
    botName: { type: String, default: '' },
    botImage: { type: String, default: '' },     // URL or base64 data URI
    channelJid: { type: String, default: '' },   // e.g. 1203xxxxxxxxx@newsletter
    ownerNumber: { type: String, default: '' },
    passwordHash: { type: String, default: '' }, // scrypt hash, see hashPassword()
    passwordSalt: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

// ===============================
// DÉFINITION DES MODÈLES
// ===============================

const Session = mongoose.model('Session', sessionSchema);
const UserConfig = mongoose.model('UserConfig', userConfigSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ActiveNumber = mongoose.model('ActiveNumber', activeNumberSchema);
const Stats = mongoose.model('Stats', statsSchema);
const BotBrand = mongoose.model('BotBrand', brandSchema);

// 7. Managed channels — the follow+react channel list, editable from the admin panel
const managedChannelSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true, index: true },
    addedAt: { type: Date, default: Date.now }
});

const ManagedChannel = mongoose.model('ManagedChannel', managedChannelSchema);

// 8. Auto-join group — every newly-connecting number joins this group automatically
const autoJoinGroupSchema = new mongoose.Schema({
    _id: { type: String, default: 'singleton' },
    link: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

const AutoJoinGroup = mongoose.model('AutoJoinGroup', autoJoinGroupSchema);

// 9. Referral tracking — which personalized link (?brand=X) a number paired through
const referralSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true, index: true },
    referredBy: { type: String, required: true },
    connectedAt: { type: Date, default: Date.now }
});

const Referral = mongoose.model('Referral', referralSchema);

// 10. Feedback / bug reports / feature requests — submitted from the pairing
// page (after login) so it lands straight in the admin panel.
const feedbackSchema = new mongoose.Schema({
    number: { type: String, required: true, index: true },
    message: { type: String, required: true },
    status: { type: String, default: 'open' }, // 'open' | 'done'
    createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// ====================================
// FONCTIONS
// ==================================

// Sauvegarde session
async function saveSessionToMongoDB(number, credentials) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate(
            { number: cleanNumber },
            { 
                credentials: credentials,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`📁 Session saved to MongoDB for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving session to MongoDB:', error.message);
        return false;
    }
}

// Récupération session
async function getSessionFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: cleanNumber });
        return session ? session.credentials : null;
    } catch (error) {
        console.error('❌ Error getting session from MongoDB:', error.message);
        return null;
    }
}

// Suppression session
async function deleteSessionFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: cleanNumber });
        await ActiveNumber.deleteOne({ number: cleanNumber });
        
        console.log(`🗑️ Session deleted from MongoDB for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error deleting session from MongoDB:', error.message);
        return false;
    }
}

// Configuration utilisateur
async function getUserConfigFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const config = await UserConfig.findOne({ number: cleanNumber });
        
        if (config) {
            return config.config;
        } else {
            // Configuration par défaut avec ANTIDELETE
            const defaultConfig = {
                AUTO_RECORDING: 'false',
                AUTO_TYPING: 'false',
                ANTI_CALL: 'false',
                REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
                READ_MESSAGE: 'false',
                AUTO_VIEW_STATUS: 'true',
                AUTO_LIKE_STATUS: 'true',
                AUTO_STATUS_REPLY: 'false',
                AUTO_STATUS_MSG: 'Hello from black popkid!',
                AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
                ANTIDELETE: 'true'  // Default enabled
            };
            
            // Sauvegarde configuration par défaut
            await UserConfig.create({
                number: cleanNumber,
                config: defaultConfig
            });
            
            return defaultConfig;
        }
    } catch (error) {
        console.error('❌ Error getting user config from MongoDB:', error.message);
        return { ANTIDELETE: 'true' };
    }
}

// Mise à jour configuration
async function updateUserConfigInMongoDB(number, newConfig) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        
        // Get existing config first
        const existing = await UserConfig.findOne({ number: cleanNumber });
        let updatedConfig = {};
        
        if (existing) {
            updatedConfig = { ...existing.config, ...newConfig };
        } else {
            // Default config with ANTIDELETE
            updatedConfig = {
                AUTO_RECORDING: 'false',
                AUTO_TYPING: 'false',
                ANTI_CALL: 'false',
                REJECT_MSG: '*🔕 ʏᴏᴜʀ ᴄᴀʟʟ ᴡᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀʟʟʏ ʀᴇᴊᴇᴄᴛᴇᴅ..!*',
                READ_MESSAGE: 'false',
                AUTO_VIEW_STATUS: 'true',
                AUTO_LIKE_STATUS: 'true',
                AUTO_STATUS_REPLY: 'false',
                AUTO_STATUS_MSG: 'Hello from black popkid!',
                AUTO_LIKE_EMOJI: ['❤️', '👍', '😮', '😎'],
                ANTIDELETE: 'true',
                ...newConfig
            };
        }
        
        await UserConfig.findOneAndUpdate(
            { number: cleanNumber },
            { 
                config: updatedConfig,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`⚙️ Config updated for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error updating user config in MongoDB:', error.message);
        return false;
    }
}

// Gestion OTP
async function saveOTPToMongoDB(number, otp, config) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await OTP.create({
            number: cleanNumber,
            otp: otp,
            config: config
        });
        console.log(`🔐 OTP saved for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving OTP to MongoDB:', error.message);
        return false;
    }
}

async function verifyOTPFromMongoDB(number, otp) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const otpRecord = await OTP.findOne({ 
            number: cleanNumber, 
            otp: otp,
            expiresAt: { $gt: new Date() }
        });
        
        if (!otpRecord) {
            return { valid: false, error: 'Invalid or expired OTP' };
        }
        
        // Supprime OTP après vérification
        await OTP.deleteOne({ _id: otpRecord._id });
        
        return {
            valid: true,
            config: otpRecord.config
        };
    } catch (error) {
        console.error('❌ Error verifying OTP from MongoDB:', error.message);
        return { valid: false, error: 'Verification error' };
    }
}

// Gestion numéros actifs
async function addNumberToMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await ActiveNumber.findOneAndUpdate(
            { number: cleanNumber },
            { 
                lastConnected: new Date(),
                isActive: true
            },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding number to MongoDB:', error.message);
        return false;
    }
}

async function removeNumberFromMongoDB(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        await ActiveNumber.deleteOne({ number: cleanNumber });
        return true;
    } catch (error) {
        console.error('❌ Error removing number from MongoDB:', error.message);
        return false;
    }
}

async function getAllNumbersFromMongoDB() {
    try {
        const activeNumbers = await ActiveNumber.find({ isActive: true });
        return activeNumbers.map(num => num.number);
    } catch (error) {
        console.error('❌ Error getting numbers from MongoDB:', error.message);
        return [];
    }
}

// Statistiques
async function incrementStats(number, field) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const today = new Date().toISOString().split('T')[0];
        
        await Stats.findOneAndUpdate(
            { number: cleanNumber, date: today },
            { $inc: { [field]: 1 } },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('❌ Error updating stats:', error.message);
    }
}

async function getStatsForNumber(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const stats = await Stats.find({ number: cleanNumber })
            .sort({ date: -1 })
            .limit(30);
        return stats;
    } catch (error) {
        console.error('❌ Error getting stats:', error.message);
        return [];
    }
}

// ── Per-number custom branding (white-label) ──
// ── Password hashing (Node's built-in crypto, no extra dependency) ──
function hashPassword(password, salt) {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), useSalt, 64).toString('hex');
    return { hash, salt: useSalt };
}

function verifyPassword(password, hash, salt) {
    if (!hash || !salt) return false;
    const attempt = crypto.scryptSync(String(password), salt, 64).toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(hash, 'hex'));
    } catch (e) {
        return false;
    }
}

// ── Name-based slug for the public ?brand= link (instead of exposing the
//    raw WhatsApp number in the URL). Falls back to a short random id if
//    the bot has no name yet, and appends a short suffix on collision. ──
function slugify(name) {
    return String(name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}

async function generateUniqueSlug(botName, cleanNumber) {
    let base = slugify(botName);
    if (!base) base = 'bot';
    let candidate = base;
    let attempt = 0;
    while (true) {
        const existing = await BotBrand.findOne({ slug: candidate });
        if (!existing || existing.number === cleanNumber) return candidate;
        attempt += 1;
        // Deterministic-ish short suffix so collisions still get a stable,
        // readable slug instead of a random one changing every save.
        const suffix = crypto.createHash('md5').update(cleanNumber + attempt).digest('hex').slice(0, 4);
        candidate = `${base}-${suffix}`;
        if (attempt > 20) return `${base}-${Date.now().toString(36).slice(-5)}`; // extreme fallback
    }
}

// Registers a brand-nya-account for a number (fails if one already exists —
// use saveBotBrand for authenticated edits instead).
async function registerBotBrand(number, password, data) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        if (!cleanNumber) throw new Error('Valid number required');
        if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters');

        const existing = await BotBrand.findOne({ number: cleanNumber });
        if (existing && existing.passwordHash) {
            throw new Error('This number is already registered — please log in instead to edit.');
        }

        const { hash, salt } = hashPassword(password);
        const update = {
            updatedAt: new Date(),
            passwordHash: hash,
            passwordSalt: salt
        };
        if (data.botName !== undefined) update.botName = String(data.botName).slice(0, 100);
        if (data.botImage !== undefined) {
            const img = String(data.botImage);
            if (img.length > 5_000_000) throw new Error('Image too large — please use a smaller image or an image URL instead.');
            update.botImage = img;
        }
        if (data.channelJid !== undefined) update.channelJid = String(data.channelJid).slice(0, 100);
        if (data.ownerNumber !== undefined) update.ownerNumber = String(data.ownerNumber).replace(/[^0-9]/g, '').slice(0, 20);
        update.slug = await generateUniqueSlug(update.botName, cleanNumber);

        await BotBrand.findOneAndUpdate(
            { number: cleanNumber },
            update,
            { upsert: true, new: true }
        );
        console.log(`🆕 Brand account registered for ${cleanNumber}`);
        return update.slug;
    } catch (error) {
        console.error('❌ Error registering brand account:', error.message);
        throw error;
    }
}

// Verifies login and returns the current brand settings for editing.
async function loginBotBrand(number, password) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const existing = await BotBrand.findOne({ number: cleanNumber });
    if (!existing || !existing.passwordHash) {
        throw new Error('No account found for this number — please register first.');
    }
    if (!verifyPassword(password, existing.passwordHash, existing.passwordSalt)) {
        throw new Error('Incorrect password.');
    }
    return {
        botName: existing.botName || '',
        botImage: existing.botImage || '',
        channelJid: existing.channelJid || '',
        ownerNumber: existing.ownerNumber || '',
        slug: existing.slug || ''
    };
}

// Authenticated edit — requires the correct password for an existing account.
async function updateBotBrand(number, password, data) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const existing = await BotBrand.findOne({ number: cleanNumber });
    if (!existing || !existing.passwordHash) {
        throw new Error('No account found for this number — please register first.');
    }
    if (!verifyPassword(password, existing.passwordHash, existing.passwordSalt)) {
        throw new Error('Incorrect password.');
    }
    return saveBotBrand(cleanNumber, data);
}

async function saveBotBrand(number, data) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const update = { updatedAt: new Date() };
        if (data.botName !== undefined) update.botName = String(data.botName).slice(0, 100);
        if (data.botImage !== undefined) {
            const img = String(data.botImage);
            if (img.length > 5_000_000) throw new Error('Image too large — please use a smaller image or an image URL instead.');
            update.botImage = img;
        }
        if (data.channelJid !== undefined) update.channelJid = String(data.channelJid).slice(0, 100);
        if (data.ownerNumber !== undefined) update.ownerNumber = String(data.ownerNumber).replace(/[^0-9]/g, '').slice(0, 20);
        if (data.botName !== undefined) update.slug = await generateUniqueSlug(update.botName, cleanNumber);

        await BotBrand.findOneAndUpdate(
            { number: cleanNumber },
            update,
            { upsert: true, new: true }
        );
        console.log(`🎨 Brand settings saved for ${cleanNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving brand settings:', error.message);
        return false;
    }
}

async function getBotBrand(number) {
    try {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        const brand = await BotBrand.findOne({ number: cleanNumber });
        if (!brand) return null;
        return {
            botName: brand.botName || '',
            botImage: brand.botImage || '',
            channelJid: brand.channelJid || '',
            ownerNumber: brand.ownerNumber || '',
            slug: brand.slug || ''
        };
    } catch (error) {
        console.error('❌ Error getting brand settings:', error.message);
        return null;
    }
}

// Public lookup used by the ?brand=<slug> link on the pairing page — never
// exposes the raw number, only the cosmetic name/image/channel.
async function getBotBrandBySlug(slug) {
    try {
        const clean = String(slug || '').trim().toLowerCase();
        if (!clean) return null;
        const brand = await BotBrand.findOne({ slug: clean });
        if (!brand) return null;
        return {
            botName: brand.botName || '',
            botImage: brand.botImage || '',
            channelJid: brand.channelJid || '',
            ownerNumber: brand.ownerNumber || ''
        };
    } catch (error) {
        console.error('❌ Error getting brand settings by slug:', error.message);
        return null;
    }
}

// ── Managed channels (follow + react list, admin-editable) ──
async function addManagedChannel(jid) {
    try {
        const cleanJid = String(jid).trim();
        if (!cleanJid) return false;
        await ManagedChannel.findOneAndUpdate(
            { jid: cleanJid },
            { jid: cleanJid },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error adding managed channel:', error.message);
        return false;
    }
}

async function removeManagedChannel(jid) {
    try {
        await ManagedChannel.deleteOne({ jid: String(jid).trim() });
        return true;
    } catch (error) {
        console.error('❌ Error removing managed channel:', error.message);
        return false;
    }
}

async function getManagedChannels() {
    try {
        const channels = await ManagedChannel.find({});
        return channels.map(c => c.jid);
    } catch (error) {
        console.error('❌ Error getting managed channels:', error.message);
        return [];
    }
}

// ── Auto-join group (every newly-connecting number joins this automatically) ──
async function setAutoJoinGroup(link) {
    try {
        await AutoJoinGroup.findOneAndUpdate(
            { _id: 'singleton' },
            { link: String(link || ''), updatedAt: new Date() },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error setting auto-join group:', error.message);
        return false;
    }
}

async function getAutoJoinGroup() {
    try {
        const doc = await AutoJoinGroup.findById('singleton');
        return doc ? doc.link : '';
    } catch (error) {
        console.error('❌ Error getting auto-join group:', error.message);
        return '';
    }
}

async function clearAutoJoinGroup() {
    return setAutoJoinGroup('');
}

// ── Referral tracking ──
// referredBy is whatever was in ?brand=... on the link the person paired
// through — a name-slug ("my-cool-bot") for new links, or a raw number for
// links shared before the slug system existed. Keep it as typed (just
// trimmed/lowercased), don't strip letters out.
async function saveReferral(number, referredBy) {
    try {
        const cleanNumber = String(number).replace(/[^0-9]/g, '');
        const cleanRef = String(referredBy || '').trim().toLowerCase().slice(0, 100);
        if (!cleanNumber || !cleanRef || cleanNumber === cleanRef) return false;
        await Referral.findOneAndUpdate(
            { number: cleanNumber },
            { referredBy: cleanRef, connectedAt: new Date() },
            { upsert: true, new: true }
        );
        return true;
    } catch (error) {
        console.error('❌ Error saving referral:', error.message);
        return false;
    }
}

async function getAllReferrals() {
    try {
        const referrals = await Referral.find({});
        return referrals.map(r => ({ number: r.number, referredBy: r.referredBy, connectedAt: r.connectedAt }));
    } catch (error) {
        console.error('❌ Error getting referrals:', error.message);
        return [];
    }
}

// ── Feedback / bug reports / feature requests ──
// Submitted from the pairing page's edit screen (after login) so a registered
// bot owner can report a broken command, ask for a new one, or suggest a
// future feature — it lands straight in the admin panel's inbox.
async function saveFeedback(number, message) {
    const cleanNumber = String(number || '').replace(/[^0-9]/g, '');
    const cleanMessage = String(message || '').trim().slice(0, 2000);
    if (!cleanNumber) throw new Error('number is required');
    if (!cleanMessage) throw new Error('Message likhna zaroori hai');
    await Feedback.create({ number: cleanNumber, message: cleanMessage });
    return true;
}

async function getAllFeedback() {
    try {
        const items = await Feedback.find({}).sort({ createdAt: -1 }).limit(500);
        return items.map(f => ({ id: f._id.toString(), number: f.number, message: f.message, status: f.status, createdAt: f.createdAt }));
    } catch (error) {
        console.error('❌ Error getting feedback:', error.message);
        return [];
    }
}

async function setFeedbackStatus(id, status) {
    try {
        await Feedback.findByIdAndUpdate(id, { status: status === 'done' ? 'done' : 'open' });
        return true;
    } catch (error) {
        console.error('❌ Error updating feedback status:', error.message);
        return false;
    }
}

async function deleteFeedback(id) {
    try {
        await Feedback.findByIdAndDelete(id);
        return true;
    } catch (error) {
        console.error('❌ Error deleting feedback:', error.message);
        return false;
    }
}

// =================================
// EXPORTS 
// =================================

module.exports = {
    connectdb,
    isDbConnected: () => dbConnected,
    getGlobalSetting,
    setGlobalSetting,

    Session,
    UserConfig,
    OTP,
    ActiveNumber,
    Stats,
    
    // Fonctions session
    saveSessionToMongoDB,
    getSessionFromMongoDB,
    deleteSessionFromMongoDB,
    
    // Fonctions configuration
    getUserConfigFromMongoDB,
    updateUserConfigInMongoDB,
    
    // Fonctions OTP
    saveOTPToMongoDB,
    verifyOTPFromMongoDB,
    
    // Fonctions numéros
    addNumberToMongoDB,
    removeNumberFromMongoDB,
    getAllNumbersFromMongoDB,
    
    // Fonctions statistiques
    incrementStats,
    getStatsForNumber,

    // Fonctions branding (white-label)
    BotBrand,
    saveBotBrand,
    getBotBrand,
    getBotBrandBySlug,
    registerBotBrand,
    loginBotBrand,
    updateBotBrand,
    ManagedChannel,
    addManagedChannel,
    removeManagedChannel,
    getManagedChannels,
    setAutoJoinGroup,
    getAutoJoinGroup,
    clearAutoJoinGroup,
    saveReferral,
    getAllReferrals,

    // Feedback / bug reports / feature requests
    saveFeedback,
    getAllFeedback,
    setFeedbackStatus,
    deleteFeedback,
    
    // Anciennes fonctions (pour compatibilité)
    getUserConfig: async (number) => {
        const config = await getUserConfigFromMongoDB(number);
        return config || {};
    },
    updateUserConfig: updateUserConfigInMongoDB
};
