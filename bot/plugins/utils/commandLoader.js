const fs = require('fs');
const path = require('path');

/**
 * Returns a Map of every loaded command (native + ported) keyed by name,
 * for menu/list-style commands that want to enumerate everything.
 */
function loadCommands() {
    const map = new Map();

    // native cmd()-based commands
    try {
        const { commands } = require('../../arslan');
        for (const c of commands) {
            if (!c.pattern) continue;
            map.set(c.pattern, {
                name: c.pattern,
                category: c.category || 'misc',
                description: c.desc || ''
            });
        }
    } catch (e) { /* ignore */ }

    // ported commands (module.exports = {name, category, execute})
    try {
        const portedDir = path.join(__dirname, '..', 'ported-commands');
        if (fs.existsSync(portedDir)) {
            for (const category of fs.readdirSync(portedDir)) {
                const catDir = path.join(portedDir, category);
                if (!fs.statSync(catDir).isDirectory()) continue;
                for (const file of fs.readdirSync(catDir)) {
                    if (!file.endsWith('.js')) continue;
                    try {
                        const mod = require(path.join(catDir, file));
                        if (mod && mod.name && typeof mod.execute === 'function') {
                            map.set(mod.name, {
                                name: mod.name,
                                category: mod.category || category,
                                description: mod.description || ''
                            });
                        }
                    } catch (e) { /* skip broken file, don't crash the whole list */ }
                }
            }
        }
    } catch (e) { /* ignore */ }

    return map;
}

module.exports = { loadCommands };
