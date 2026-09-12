/**
 * Lightweight in-memory per-group message-activity tracker.
 * Resets on restart (not persisted) — good enough for "today's activity"
 * style leaderboards. main.js calls recordMessage() for every incoming
 * group message; commands call getStats() to read it back.
 */

const store = new Map(); // groupId -> { total, users: { [userId]: count }, date }

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function recordMessage(groupId, userId) {
    if (!groupId || !userId) return;
    const today = todayKey();
    let entry = store.get(groupId);
    if (!entry || entry.date !== today) {
        entry = { date: today, total: 0, users: {} };
        store.set(groupId, entry);
    }
    entry.total++;
    entry.users[userId] = (entry.users[userId] || 0) + 1;
}

function getStats(groupId) {
    const entry = store.get(groupId);
    if (!entry || entry.date !== todayKey()) return null;
    return { total: entry.total, users: entry.users };
}

module.exports = { recordMessage, getStats };
