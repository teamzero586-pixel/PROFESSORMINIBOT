// lib/anticall.js — standalone anti-call registrar.
// NOT currently wired up (main.js's setupCallHandlers implements this
// per-number instead, with owner exceptions and a reject message — see the
// comment there). Kept, and hardened, in case something else calls this
// directly in the future.
module.exports = function registerAntiCall(arslan, config) {
  if (arslan.__antiCallRegistered) return;

  arslan.ev.on("call", async (calls) => {
    try {
      if (config.ANTI_CALL !== "true") return;

      for (const call of calls) {
        if (call.status !== "offer") continue;
        await arslan.rejectCall(call.id, call.from);
      }
    } catch (err) {
      console.error('[ANTICALL ERROR]', err.message);
    }
  });

  arslan.__antiCallRegistered = true;
};
