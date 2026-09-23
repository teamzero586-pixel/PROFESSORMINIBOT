// .reject — reject pending group join requests (counterpart to .approve)

module.exports = {
    name: 'reject',
    aliases: ['deny'],
    category: 'group',
    description: 'Reject pending group join requests',
    groupOnly: true,
    adminOnly: true,

    async execute(sock, mek, args, extra) {
        const from = extra.from;

        if (!extra.isBotAdmin) {
            return extra.reply('❌ I need to be a group admin to reject join requests.');
        }

        try {
            const requests = await sock.groupRequestParticipantsList(from);

            if (!requests || requests.length === 0) {
                return extra.reply('✅ No pending join requests found in this group.');
            }

            await extra.reply(`⏳ Found ${requests.length} pending request(s). Rejecting...`);

            let ok = 0, failed = 0;
            for (const participant of requests) {
                try {
                    await sock.groupRequestParticipantsUpdate(from, [participant.jid], 'reject');
                    ok++;
                } catch (err) {
                    failed++;
                    console.error(`[reject] Failed for ${participant.jid}:`, err.message);
                }
                await new Promise(r => setTimeout(r, 1500)); // avoid rate limiting
            }

            await extra.reply(`✅ Rejected ${ok} request(s).${failed ? ` ❌ ${failed} failed.` : ''}`);
        } catch (e) {
            console.error('reject error:', e.message);
            await extra.reply(`❌ Couldn't fetch/reject join requests: ${e.message}\n\n(Requires a Baileys version that supports groupRequestParticipantsList/Update, and the bot must be a group admin.)`);
        }
    }
};
