const config = require('../../../config');

const TRUTHS = [
  '😳 Apni zindagi ki sab se sharmindagi wali baat batao?',
  '💕 Kya tumhara kabhi kisi par crush raha hai group mein?',
  '🤥 Aaj tak ki sab se badi jhooth batao jo tumne kisi ko boli?',
  '😂 Kab roya tha last time aur kyun?',
  '🤫 Koi aisa raaz batao jo kisi ko nahi pata?',
  '📱 Last call kisse ki thi aur kya baat hui?',
  '😬 Kisne tumhe sabse zyada pareshan kiya hai group mein?',
  '🎵 Shower mein gaana gaate ho? Kaunsa?',
  '😴 Subah uthne mein kitna time lagta hai?',
  '🍕 Aaj kya khaya? Sach mein batao!',
  '💸 Mahine mein kitna paise waste karte ho?',
  '🤳 Din mein kitni baar khud ki selfie lete ho?',
  '😅 Kab last time Exam mein nakal ki?',
  '🧸 Abhi bhi koi bachpan ki cheez sambhal ke rakhi hai?',
  '🎮 Din mein kitni der phone use karte ho sach mein?',
  '😍 Apni favourite quality kya hai apne mein?',
  '🌙 Raat ko neend nahi aati toh kya karte ho?',
  '📚 Last book ya novel kaunsi pari thi?',
  '🤭 Kisi ka number delete karna pada kyunke zaroori tha?',
  '🎤 Karaoke mein kaunsa gana gaoge confidently?',
];

const DARES = [
  '🎤 Abhi group voice note mein koi bhi gana gao (min 15 sec)!',
  '🤸 10 push-ups karo aur video bhejo!',
  '📸 Abhi ki selfie — jo bhi haal mein ho — group mein bhejo!',
  '🗣️ Voice note mein "Main pagal hoon" 5 baar kaho!',
  '💃 30 second ka dance video banao aur bhejo!',
  '😂 Apna sab se bura joke sunao group mein!',
  '📞 Group mein kisi ek ko call karo aur "I love you" bolو!',
  '🎭 Kisi bhi superhero ki nakal karte hue voice note bhejo!',
  '🌶️ Koi spicy masalaydar status lagao aur screenshot bhejo!',
  '🧏 Apna naam ulta bol kar voice note bhejo!',
  '🎨 1 minute mein apni drawing banao aur bhejo!',
  '🗺️ Apna location share karo 5 minute ke liye!',
  '🤣 Sab se funny meme dhundo aur group mein bhejo!',
  '👟 Apne joote ka photo khench ke bhejo!',
  '🌅 Kal subah uthke group mein "Good Morning" karo — proof chahiye!',
  '📝 Group ke har member ko ek compliment likho!',
  '🎵 Apna favourite gana type karo poora (chorus wala part)!',
  '🤔 1 minute mein 5 urdu shayari likho!',
  '😜 Apni profile pic change karo funny wali — 10 minute ke liye!',
  '🏃 Ghar mein 5 chakkar lagao aur time batao!',
];

module.exports = {
  name: 'truthdare',
  aliases: ['td', 'truth', 'dare'],
  category: 'games',
  description: 'Truth ya Dare game! Group mein mazay karo!',
  usage: `${config.PREFIX}truthdare [truth/dare]`,
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const senderName = msg.pushName || extra.sender.split('@')[0];
      const choice = args[0]?.toLowerCase();

      await extra.react('🎯');

      if (!choice || (choice !== 'truth' && choice !== 'dare')) {
        // Random choice karo
        const isTruth = Math.random() > 0.5;
        const item = isTrue => isTrue
          ? TRUTHS[Math.floor(Math.random() * TRUTHS.length)]
          : DARES[Math.floor(Math.random() * DARES.length)];

        const result = item(isTrue);
        const type = isTrue ? '🔮 TRUTH' : '🔥 DARE';

        await extra.reply(
          `*🎮 TRUTH OR DARE — ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 *${senderName}* ko mila: *${type}*\n\n` +
          `${result}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 *${config.PREFIX}truthdare truth* — Truth lene ke liye\n` +
          `🔥 *${config.PREFIX}truthdare dare* — Dare lene ke liye`
        );

        return;
      }

      if (choice === 'truth') {
        const truth = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
        await extra.reply(
          `*🔮 TRUTH — ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 *${senderName}* — Sach bolna hoga! 😈\n\n` +
          `${truth}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⚠️ Jhooth bola toh dare milega!`
        );
      } else {
        const dare = DARES[Math.floor(Math.random() * DARES.length)];
        await extra.reply(
          `*🔥 DARE — ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 *${senderName}* — Himmat hai toh karo! 😎\n\n` +
          `${dare}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⚠️ Nahi kiya toh teen truths lene padhenge!`
        );
      }

    } catch (error) {
      await extra.reply(`❌ ${error.message}`);
      await extra.react('❌');
    }
  }
};
