const config = require('../../../config');

const activeGiveaways = new Map();

module.exports = {
  name: 'giveaway',
  aliases: ['gw', 'contest'],
  category: 'games',
  description: 'Giveaway shuru karo — members join karein, bot winner nikale!',
  usage: `${config.PREFIX}giveaway [start/end/cancel] [prize] [keyword] [minutes]`,
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const sub = args[0]?.toLowerCase();

      // STATUS
      if (!sub || sub === 'status') {
        if (!activeGiveaways.has(chatId)) {
          return extra.reply(
            `ℹ️ *Koi giveaway chal nahi raha!*\n\n` +
            `📝 Shuru karne ke liye:\n` +
            `*${config.PREFIX}giveaway start [prize] [keyword] [minutes]*\n\n` +
            `📌 *Example:*\n` +
            `*${config.PREFIX}giveaway start "100 Rs Easypaisa" JOIN 5*`
          );
        }
        const gw = activeGiveaways.get(chatId);
        const timeLeft = Math.max(0, Math.ceil((gw.endTime - Date.now()) / 60000));
        return extra.reply(
          `*🎁 GIVEAWAY STATUS*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🏆 *Prize:* ${gw.prize}\n` +
          `🔑 *Keyword:* ${gw.keyword}\n` +
          `👥 *Participants:* ${gw.participants.size}\n` +
          `⏰ *Time Left:* ${timeLeft} minutes\n` +
          `━━━━━━━━━━━━━━━━━━━━`
        );
      }

      // CANCEL
      if (sub === 'cancel') {
        if (!activeGiveaways.has(chatId)) return extra.reply('❌ Koi giveaway chal nahi raha!');
        const gw = activeGiveaways.get(chatId);
        clearTimeout(gw.timer);
        activeGiveaways.delete(chatId);
        return extra.reply('✅ Giveaway cancel kar diya gaya!');
      }

      // END — manual winner nikalo
      if (sub === 'end') {
        if (!activeGiveaways.has(chatId)) return extra.reply('❌ Koi giveaway chal nahi raha!');
        const gw = activeGiveaways.get(chatId);
        clearTimeout(gw.timer);
        await pickWinner(sock, chatId, gw);
        activeGiveaways.delete(chatId);
        return;
      }

      // START
      if (sub === 'start') {
        if (activeGiveaways.has(chatId)) {
          return extra.reply('⚠️ Pehle se ek giveaway chal raha hai!\nPehle *' + config.PREFIX + 'giveaway end* ya *cancel* karo!');
        }

        const prize = args[1] || 'Surprise Gift 🎁';
        const keyword = (args[2] || 'JOIN').toUpperCase();
        const minutes = parseInt(args[3]) || 5;

        if (minutes < 1 || minutes > 60) {
          return extra.reply('❌ Time 1 se 60 minutes ke beech hona chahiye!');
        }

        const endTime = Date.now() + minutes * 60 * 1000;

        const announceText =
          `*🎁 GIVEAWAY SHURU! — 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🏆 *Prize:* ${prize}\n` +
          `⏰ *Duration:* ${minutes} minutes\n` +
          `🔑 *Join karne ke liye type karo:*\n\n` +
          `👉 *${keyword}* 👈\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📢 Jaldi karo — ek hi winner hoga!\n` +
          `⚡ *Powered by 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱*`;

        await sock.sendMessage(chatId, { text: announceText });

        const timer = setTimeout(async () => {
          if (activeGiveaways.has(chatId)) {
            const gw = activeGiveaways.get(chatId);
            await pickWinner(sock, chatId, gw);
            activeGiveaways.delete(chatId);
          }
        }, minutes * 60 * 1000);

        activeGiveaways.set(chatId, {
          prize,
          keyword,
          endTime,
          timer,
          participants: new Map(),
          startedBy: extra.sender
        });

        await extra.react('🎁');
        return;
      }

      // Default help
      await extra.reply(
        `*🎁 GIVEAWAY COMMANDS*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `▶️ *Start:*\n${config.PREFIX}giveaway start [prize] [keyword] [minutes]\n\n` +
        `📊 *Status:*\n${config.PREFIX}giveaway status\n\n` +
        `🏆 *End Now:*\n${config.PREFIX}giveaway end\n\n` +
        `❌ *Cancel:*\n${config.PREFIX}giveaway cancel\n\n` +
        `📌 *Example:*\n${config.PREFIX}giveaway start "100 Rs Easypaisa" JOIN 10`
      );

    } catch (error) {
      await extra.reply(`❌ ${error.message}`);
      await extra.react('❌');
    }
  },

  async onMessage(sock, msg, extra) {
    try {
      const chatId = extra.from;
      if (!activeGiveaways.has(chatId)) return;

      const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toUpperCase();
      const gw = activeGiveaways.get(chatId);

      if (text !== gw.keyword) return;
      if (gw.participants.has(extra.sender)) {
        await sock.sendMessage(chatId, {
          text: `⚠️ @${extra.sender.split('@')[0]} — Tum already join kar chuke ho! ✅`,
          mentions: [extra.sender]
        });
        return;
      }

      const name = msg.pushName || extra.sender.split('@')[0];
      gw.participants.set(extra.sender, name);

      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
      await sock.sendMessage(chatId, {
        text: `🎉 @${extra.sender.split('@')[0]} giveaway mein shamil ho gaye!\n👥 *Total Participants:* ${gw.participants.size}`,
        mentions: [extra.sender]
      });
    } catch (e) {}
  }
};

async function pickWinner(sock, chatId, gw) {
  if (gw.participants.size === 0) {
    await sock.sendMessage(chatId, {
      text: `😔 *Giveaway Khatam!*\n\nKoi join nahi kiya! Koi winner nahi! 😢\n\n🏆 *Prize:* ${gw.prize}`
    });
    return;
  }

  const participants = [...gw.participants.entries()];
  const [winnerJid, winnerName] = participants[Math.floor(Math.random() * participants.length)];

  await sock.sendMessage(chatId, {
    text:
      `*🎊 GIVEAWAY KHATAM! 🎊*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🥁 *Drum Roll...*\n\n` +
      `🏆 *WINNER:*\n` +
      `@${winnerJid.split('@')[0]} — *${winnerName}*\n\n` +
      `🎁 *Prize:* ${gw.prize}\n` +
      `👥 *Total Participants:* ${gw.participants.size}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 Congratulations! Owner se contact karo prize lene ke liye!\n` +
      `⚡ *𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱*`,
    mentions: [winnerJid]
  });
}
