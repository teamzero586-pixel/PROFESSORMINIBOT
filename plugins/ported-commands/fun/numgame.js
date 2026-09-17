const config = require('../../../config');

const activeGames = new Map();
const TIMEOUT = 60000;

module.exports = {
  name: 'numgame',
  aliases: ['numguess', 'ng'],
  category: 'games',
  description: '1 se 100 ke beech number guess karo! Jo pehle sahi kare woh jeetega.',
  usage: `${config.PREFIX}numgame`,
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;

      if (activeGames.has(chatId)) {
        const game = activeGames.get(chatId);
        return extra.reply(
          `⚠️ Game pehle se chal raha hai!\n\n` +
          `🎯 Hint: Number *${game.hint}* ke kareeb hai!\n` +
          `Guess karo: 1 se 100 ke beech`
        );
      }

      await extra.react('🎮');

      const secretNumber = Math.floor(Math.random() * 100) + 1;
      const starterName = msg.pushName || extra.sender.split('@')[0];

      const gameText =
        `*🎮 NUMBER GUESSING GAME!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🚀 *${starterName}* ne game shuru kiya!\n\n` +
        `🔢 Maine ek number socha hai *1 se 100* ke beech\n` +
        `🏆 Jo pehle sahi guess kare woh winner!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Sirf number type karo group mein!\n` +
        `⏰ *60 seconds* mein guess karo warna game khatam!`;

      await sock.sendMessage(chatId, { text: gameText });

      activeGames.set(chatId, {
        number: secretNumber,
        hint: '???',
        startTime: Date.now(),
        attempts: 0,
        startedBy: starterName
      });

      setTimeout(async () => {
        if (activeGames.has(chatId)) {
          const game = activeGames.get(chatId);
          activeGames.delete(chatId);
          await sock.sendMessage(chatId, {
            text:
              `⏰ *Time Out! Game Khatam!*\n\n` +
              `🔢 Sahi number tha: *${game.number}*\n` +
              `😅 Koi nahi jeeta is baar!\n\n` +
              `Dubara khelne ke liye: *${config.PREFIX}numgame*`
          });
        }
      }, TIMEOUT);

    } catch (error) {
      await extra.reply(`❌ ${error.message}`);
    }
  },

  async onMessage(sock, msg, extra) {
    try {
      const chatId = extra.from;
      if (!activeGames.has(chatId)) return;

      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const guess = parseInt(text.trim());

      if (isNaN(guess) || guess < 1 || guess > 100) return;

      const game = activeGames.get(chatId);
      const senderName = msg.pushName || extra.sender.split('@')[0];
      game.attempts++;

      if (guess === game.number) {
        activeGames.delete(chatId);
        const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
        await sock.sendMessage(chatId, {
          text:
            `🏆 *${senderName} JEE GAYA!* 🎉🎊\n\n` +
            `✅ Sahi Number: *${game.number}*\n` +
            `⚡ Time: *${timeTaken} seconds*\n` +
            `🎯 Kul Attempts: *${game.attempts}*\n\n` +
            `Dubara khelne ke liye: *${config.PREFIX}numgame*`
        });
        await sock.sendMessage(chatId, { react: { text: '🏆', key: msg.key } });

      } else if (guess < game.number) {
        game.hint = `${guess} se zyada`;
        await sock.sendMessage(chatId, { react: { text: '⬆️', key: msg.key } });
        await sock.sendMessage(chatId, {
          text: `📈 *${senderName}* — *${guess}* chota hai!\n⬆️ Aur bara number try karo!`,
          quoted: msg
        });
      } else {
        game.hint = `${guess} se kam`;
        await sock.sendMessage(chatId, { react: { text: '⬇️', key: msg.key } });
        await sock.sendMessage(chatId, {
          text: `📉 *${senderName}* — *${guess}* bara hai!\n⬇️ Aur chota number try karo!`,
          quoted: msg
        });
      }
    } catch (e) {}
  }
};
