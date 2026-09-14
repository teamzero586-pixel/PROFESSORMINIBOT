const config = require('../../../config');

const WYR_QUESTIONS = [
  ['🏖️ Hamesha beach par rehna', '🏔️ Hamesha paharon par rehna'],
  ['🦸 Superhero hona lekin koi nahi jaanta', '😎 Famous star hona sabko pata'],
  ['🍕 Zindagi bhar pizza khana', '🍔 Zindagi bhar burger khana'],
  ['📱 Phone ke bina rehna', '💻 Internet ke bina rehna'],
  ['🐶 Kutta hona', '🐱 Billi hona'],
  ['💰 1 crore milein aaj', '🤑 Har mahine 1 lakh milein hamesha'],
  ['🌙 Raat ko jaagna hamesha', '☀️ Subah uth jaana hamesha'],
  ['🧠 Super intelligent hona', '💪 Super strong hona'],
  ['🎤 Achi awaz hona (singer)', '🎭 Acha actor hona'],
  ['🌍 Poori duniya ghumna akele', '🏠 Ghar par rehna apnon ke saath'],
  ['😂 Hamesha hasna even serious waqt', '😢 Hamesha rona even khushi mein'],
  ['🦅 Ud sakna', '🐟 Paani mein saans le sakna'],
  ['📚 Padha likha hona lekin garib', '💸 Ameer hona lekin anparh'],
  ['🎮 Video games khelna 10 ghante', '😴 So jaana 10 ghante'],
  ['🍦 Hamesha aik flavor ice cream', '🌶️ Hamesha teekha khana'],
  ['👀 Sab ke dimaag padh sakna', '🫥 Invisible ho sakna'],
  ['🚗 Free car hamesha', '✈️ Free flights hamesha'],
  ['☔ Hamesha baarish', '☀️ Hamesha dhoop'],
  ['🗣️ Hamesha sach bolna', '🤫 Hamesha jhooth bolna'],
  ['⏰ Waqt mein peeche ja sakna', '🔮 Future dekh sakna'],
  ['🎵 Ek hi gana suno poori zindagi', '📺 Ek hi movie dekho poori zindagi'],
  ['🦁 Sher ke saath rehna 1 raat', '🐊 Magarmach ke paas tairna 1 minute'],
  ['💤 Bina neend ke 1 hafta', '🍽️ Bina khane ke 3 din'],
  ['🤳 Har selfie mein aankh band ho', '📸 Har photo mein muh khula ho'],
  ['🧊 Hamesha thanda pani pina', '🔥 Hamesha garam chai pina'],
];

module.exports = {
  name: 'wyr',
  aliases: ['wouldyourather', 'wybr'],
  category: 'games',
  description: 'Would You Rather — Muskil choices karo aur batao!',
  usage: `${config.PREFIX}wyr`,
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const senderName = msg.pushName || extra.sender.split('@')[0];
      await extra.react('🤔');

      const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];

      const text =
        `*🤔 WOULD YOU RATHER? — 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *${senderName}* ne poocha!\n\n` +
        `*Tum kya choose karoge?*\n\n` +
        `*🅰️ Option A:*\n${q[0]}\n\n` +
        `*🅱️ Option B:*\n${q[1]}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💬 Reply karo *A* ya *B* — aur reason bhi batao! 😄`;

      await extra.reply(text);

    } catch (error) {
      await extra.reply(`❌ ${error.message}`);
      await extra.react('❌');
    }
  }
};
