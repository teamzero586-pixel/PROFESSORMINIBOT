const config = require('../../../config');

const QUESTIONS = [
  { q: '🌍 Pakistan ki rajdhani kya hai?', options: ['Lahore', 'Karachi', 'Islamabad', 'Peshawar'], ans: 2 },
  { q: '🔢 50 ka double kya hoga?', options: ['50', '100', '150', '200'], ans: 1 },
  { q: '🌙 Chand ki roshni kahan se aati hai?', options: ['Khud se', 'Suraj se', 'Sitaron se', 'Zameen se'], ans: 1 },
  { q: '🏏 Cricket mein ek over mein kitni balls hoti hain?', options: ['4', '5', '6', '8'], ans: 2 },
  { q: '🐘 Duniya ka sab se bara janwar kaun sa hai?', options: ['Hathi', 'Blue Whale', 'Genda', 'Ziraffe'], ans: 1 },
  { q: '⚽ FIFA World Cup kitne saal baad hota hai?', options: ['2 saal', '3 saal', '4 saal', '5 saal'], ans: 2 },
  { q: '🌊 Duniya ka sab se gehra samundar kaun sa hai?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], ans: 3 },
  { q: '🎵 Pakistan ka qaumi tarana kis ne likha?', options: ['Allama Iqbal', 'Hafeez Jalandhari', 'Faiz Ahmed Faiz', 'Josh Malihabadi'], ans: 1 },
  { q: '🔴 1+1 kitna hota hai?', options: ['1', '2', '3', '11'], ans: 1 },
  { q: '🌟 Suraj se sab se qareeb planet kaun sa hai?', options: ['Zameen', 'Mars', 'Mercury', 'Venus'], ans: 2 },
  { q: '🦁 Jangal ka badshah kise kaha jata hai?', options: ['Sher', 'Cheetah', 'Tendwa', 'Bhalu'], ans: 0 },
  { q: '📱 WhatsApp kis company ka hai?', options: ['Google', 'Apple', 'Meta', 'Microsoft'], ans: 2 },
  { q: '🎂 Saal mein kitne din hote hain?', options: ['300', '350', '365', '400'], ans: 2 },
  { q: '🍎 Seb ka rang kya hota hai?', options: ['Neela', '(Lal/Hara)', 'Peela', 'Kala'], ans: 1 },
  { q: '🚀 Pehli baar chand par kaun gaya?', options: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'Elon Musk'], ans: 0 },
  { q: '💧 Pani ka chemical formula kya hai?', options: ['CO2', 'H2O', 'O2', 'NaCl'], ans: 1 },
  { q: '🌈 Rainbow mein kitne rang hote hain?', options: ['5', '6', '7', '8'], ans: 2 },
  { q: '🏔️ Duniya ki sab se unchi choti kaun si hai?', options: ['K2', 'Mount Everest', 'Nanga Parbat', 'Karakoram'], ans: 1 },
  { q: '🎯 Pakistan mein kitne soobaay hain?', options: ['3', '4', '5', '6'], ans: 1 },
  { q: '🔋 Battery mein kaun si energy hoti hai?', options: ['Solar', 'Chemical', 'Nuclear', 'Wind'], ans: 1 },
];

const activeQuizzes = new Map();
const TIMEOUT = 30000;

module.exports = {
  name: 'quiz',
  aliases: ['q', 'trivia'],
  category: 'games',
  description: 'Group mein fun quiz khelein! Jawab dene ke liye number type karo.',
  usage: `${config.PREFIX}quiz`,
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;

      if (activeQuizzes.has(chatId)) {
        return extra.reply('⚠️ Ek quiz pehle se chal raha hai! Pehle uska jawab do.');
      }

      await extra.react('🎯');

      const randomQ = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      const optionLetters = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

      const questionText =
        `*🎮 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 QUIZ TIME!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `❓ *${randomQ.q}*\n\n` +
        randomQ.options.map((opt, i) => `${optionLetters[i]} ${opt}`).join('\n') +
        `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ *30 seconds mein jawab do!*\n` +
        `📝 Sirf number type karo: *1, 2, 3 ya 4*`;

      await sock.sendMessage(chatId, { text: questionText });

      const quizData = {
        question: randomQ,
        startTime: Date.now(),
        askedBy: extra.sender,
        winners: []
      };
      activeQuizzes.set(chatId, quizData);

      // 30 second timeout
      setTimeout(async () => {
        if (activeQuizzes.has(chatId)) {
          activeQuizzes.delete(chatId);
          const correctAns = randomQ.options[randomQ.ans];
          await sock.sendMessage(chatId, {
            text: `⏰ *Time Out!*\n\nSahi jawab tha: *${correctAns}* ✅\n\nKoi jeeta nahi is baar! 😅`
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
      if (!activeQuizzes.has(chatId)) return;

      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const answer = parseInt(text.trim());

      if (isNaN(answer) || answer < 1 || answer > 4) return;

      const quiz = activeQuizzes.get(chatId);
      const senderName = msg.pushName || extra.sender.split('@')[0];

      if (answer - 1 === quiz.question.ans) {
        activeQuizzes.delete(chatId);
        const timeTaken = ((Date.now() - quiz.startTime) / 1000).toFixed(1);
        await sock.sendMessage(chatId, {
          text:
            `🏆 *${senderName} JEE GAYA!* 🎉\n\n` +
            `✅ Sahi Jawab: *${quiz.question.options[quiz.question.ans]}*\n` +
            `⚡ Time: *${timeTaken} seconds*\n\n` +
            `Agle quiz ke liye: *${config.PREFIX}quiz*`
        });
        await sock.sendMessage(chatId, { react: { text: '🏆', key: msg.key } });
      } else {
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      }
    } catch (e) {}
  }
};
