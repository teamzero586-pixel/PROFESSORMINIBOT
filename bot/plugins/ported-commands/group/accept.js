// .approve / .accept — approve pending group join requests
// (rewritten to match the ported-commands loader's expected
// { name, execute(sock, mek, args, extra) } shape — the previous version
// exported a bare function and was never actually wired to any command)

module.exports = {
    name: 'approve',
    aliases: ['accept'],
    category: 'group',
    description: 'Approve pending group join requests',
    groupOnly: true,
    adminOnly: true,

    async execute(sock, mek, args, extra) {
        const from = extra.from;

        if (!extra.isBotAdmin) {
            return extra.reply('❌ I need to be a group admin to approve join requests.');
        }

        try {
            const requests = await sock.groupRequestParticipantsList(from);

            if (!requests || requests.length === 0) {
                return extra.reply('✅ No pending join requests found in this group.');
            }

            await extra.reply(`⏳ Found ${requests.length} pending request(s). Approving...`);

            let ok = 0, failed = 0;
            for (const participant of requests) {
                try {
                    await sock.groupRequestParticipantsUpdate(from, [participant.jid], 'approve');
                    ok++;
                } catch (err) {
                    failed++;
                    console.error(`[approve] Failed for ${participant.jid}:`, err.message);
                }
                await new Promise(r => setTimeout(r, 1500)); // avoid rate limiting
            }

            await extra.reply(`✅ Approved ${ok} request(s).${failed ? ` ❌ ${failed} failed.` : ''}`);
        } catch (e) {
            console.error('approve error:', e.message);
            await extra.reply(`❌ Couldn't fetch/approve join requests: ${e.message}\n\n(Requires a Baileys version that supports groupRequestParticipantsList/Update, and the bot must be a group admin.)`);
        }
    }
};
