const config = require('../../../config');

const SPIN_FRAMES = ['🎰', '🎲', '🎯', '🎳', '🎪'];

module.exports = {
  name: 'spin',
  aliases: ['wheel', 'pick', 'random'],
  category: 'games',
  description: 'Group mein se random member pick karo!',
  usage: `${config.PREFIX}spin [task]`,
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;
      const task = args.length ? args.join(' ') : null;

      await extra.react('🎰');

      const groupMeta = extra.groupMetadata;
      if (!groupMeta || !groupMeta.participants || groupMeta.participants.length === 0) {
        return extra.reply('❌ Group members load nahi ho sake!');
      }

      // Bot aur sender ko exclude karo
      const botId = sock?.user?.id?.split(':')[0] + '@s.whatsapp.net';
      const members = groupMeta.participants.filter(p => {
        const jid = p.id || p.jid;
        return jid !== botId && jid !== extra.sender;
      });

      if (members.length === 0) {
        return extra.reply('❌ Koi aur member nahi group mein!');
      }

      // Spinning animation
      const spinMsg = await sock.sendMessage(chatId, {
        text: `🎰 *Spin The Wheel!*\n\n🔄 Ghoom raha hai...`
      });

      // Animated spin effect
      const spinSteps = ['🎰 ▓░░░░░░░░░', '🎰 ▓▓▓░░░░░░░', '🎰 ▓▓▓▓▓░░░░░', '🎰 ▓▓▓▓▓▓▓░░░', '🎰 ▓▓▓▓▓▓▓▓▓▓'];

      for (let i = 0; i < spinSteps.length; i++) {
        await new Promise(r => setTimeout(r, 600));
        await sock.sendMessage(chatId, {
          text: `*🎰 Wheel Ghoom Rahi Hai!*\n\n${spinSteps[i]}\n\n⏳ Ruko...`,
          edit: spinMsg.key
        });
      }

      // Random winner pick karo
      const winner = members[Math.floor(Math.random() * members.length)];
      const winnerJid = winner.id || winner.jid;
      const winnerPhone = winnerJid.split('@')[0];

      await new Promise(r => setTimeout(r, 700));

      // Mention winner
      const taskLine = task
        ? `\n\n🎯 *Task:* ${task}`
        : '\n\n🎯 Inko kuch karna hoga! Decide karo group mein!';

      await sock.sendMessage(chatId, {
        text:
          `*🎰 WHEEL RUKI!*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🏆 *Winner:* @${winnerPhone}\n` +
          `👥 *Total Members:* ${members.length}` +
          `${taskLine}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🔄 Dubara: *${config.PREFIX}spin*`,
        mentions: [winnerJid],
        edit: spinMsg.key
      });

      await sock.sendMessage(chatId, { react: { text: '🏆', key: msg.key } });

    } catch (error) {
      await extra.reply(`❌ ${error.message}`);
      await extra.react('❌');
    }
  }
};
