const config = require('../../../config');

const ROASTS = [
  '🤣 Yaar tum itne funny ho ke mirror bhi tum se dar ke toot jata hai!',
  '😂 Tumhari smartness dekh ke calculator ne retire le liya!',
  '🤦 Tumhare baare mein sochna shuru karoon toh neend aa jaati hai!',
  '😭 Tum itne boring ho ke alarm bhi tumhare saath so jaata hai!',
  '🐢 Tumhari speed dekh ke kachua bhi race mein aage nikal gaya!',
  '🪞 Tum itne unique ho ke duniya mein sirf ek hi copy hai — aur woh bhi zyada hai!',
  '🍕 Tum pizza se bhi zyada cheesy ho!',
  '😴 Tumhari life story sun ke Netflix ne bhi subscription cancel kar diya!',
  '🤖 Google ne tumhara naam search karke error de diya — "not found in smart people"!',
  '🦆 Tum itne cute ho ke duck bhi jealous ho gaya — duck face tum se seekha!',
  '📵 Tumhara Wi-Fi password tumhari IQ jaisa hai — zero!',
  '🌵 Tum itne thanda reaction dete ho ke cactus ne tumse gardening tips mangi!',
  '🎭 Tum acting mein itne acha ho ke khud bhi nahi jaante asli tum kaun ho!',
  '🐌 Tum itne slow ho ke WhatsApp message bhi tumse pehle deliver ho jata hai!',
  '🧠 Tumhara dimagh GPS ki tarah hai — hamesha wrong direction deta hai!',
  '📚 Tumne itni kam padhai ki — books ne tumhe block kar diya hai!',
  '🎪 Tum duniya ke 8ve wonder ho — koi samajh nahi pa raha tum kya ho!',
  '💤 Tumse baat karna itna thanda hai ke AC band kar diya!',
  '🎯 Tumhari aim itni kharab hai ke dartboard ne maafi mangi!',
  '🌙 Tum itne mysterious ho ke khud bhi nahi jaante kal kya karoge!',
];

const PRAISES = [
  '👑 Yaar tum group ke asli hero ho! Sab tum pe depend karte hain!',
  '🔥 Tum itne smart ho ke Google bhi tumse poocha karta hai!',
  '💎 Tum group ka sabse qeemti aur zarroori member ho!',
  '🚀 Tumhari energy dekh ke Red Bull ne apni recipe change kar li!',
  '🌟 Tum itne amazing ho ke stars bhi tumse advice lete hain!',
  '🏆 Group mein sab se badiya insaan — aur yeh sab jaante hain!',
  '💪 Tum itne strong ho ke problems tum se darte hain!',
  '🎯 Tumhari accuracy itni perfect hai ke luck bhi tumse seekhta hai!',
  '🌺 Tum group ki jaan ho — tum bina sab kuch soonapan lagta hai!',
  '🧠 Tumhara dimagh supercomputer se bhi tez hai!',
];

const PUNISHMENTS = [
  '🎤 Abhi voice note mein "Main 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 ka fan hoon" kaho!',
  '🤸 10 jumping jacks karo aur video bhejo!',
  '📸 Apni sabse funny selfie abhi group mein bhejo!',
  '✍️ "Main galat tha/thi" 10 baar type karo!',
  '🎵 30 second ka gana sunao voice note mein!',
  '🙏 Group ke har member ko sorry bolo!',
  '👑 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 ki tarif mein 5 lines likho!',
  '😂 Apna sab se sharmindagi wala moment share karo!',
  '🏃 Ghar mein 3 chakkar lagao — proof chahiye!',
  '📢 Apna WhatsApp status lagao "𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 best bot hai" — 1 ghante ke liye!',
];

module.exports = {
  name: 'shikar',
  aliases: ['target', 'hunt'],
  category: 'owner',
  description: 'Kisi ko bhi roast karo, tarif karo ya saza do! Sirf Owner ke liye.',
  usage: `${config.PREFIX}shikar @mention [roast/praise/punish]`,
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const chatId = extra.from;

      // Mentioned user dhundo
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        msg.message?.conversation?.match(/@(\d+)/g)?.map(n => n.replace('@', '') + '@s.whatsapp.net') ||
        [];

      if (mentioned.length === 0) {
        return extra.reply(
          `❌ *Kisi ko tag karo!*\n\n` +
          `📝 *Usage:*\n` +
          `• *${config.PREFIX}shikar @member roast* — Roast karo 😂\n` +
          `• *${config.PREFIX}shikar @member praise* — Tarif karo 👑\n` +
          `• *${config.PREFIX}shikar @member punish* — Saza do 😈\n` +
          `• *${config.PREFIX}shikar @member* — Random!`
        );
      }

      const targetJid = mentioned[0];
      const targetPhone = targetJid.split('@')[0];
      const mode = args.find(a => ['roast', 'praise', 'punish'].includes(a?.toLowerCase())) || 'roast';

      await extra.react('🎯');

      // Dramatic targeting effect
      const aimText =
        `*🎯 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 — SHIKAR MODE*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👁️ Target lock ho raha hai...\n` +
        `@${targetPhone} 🔴\n\n` +
        `⏳ *3...*`;

      const aimMsg = await sock.sendMessage(chatId, {
        text: aimText,
        mentions: [targetJid]
      });

      await new Promise(r => setTimeout(r, 1000));
      await sock.sendMessage(chatId, {
        text: aimText.replace('⏳ *3...*', '⏳ *2...*'),
        edit: aimMsg.key
      });

      await new Promise(r => setTimeout(r, 1000));
      await sock.sendMessage(chatId, {
        text: aimText.replace('⏳ *3...*', '⏳ *1...*'),
        edit: aimMsg.key
      });

      await new Promise(r => setTimeout(r, 1000));

      let content = '';
      let emoji = '';
      let title = '';

      if (mode === 'roast') {
        content = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        emoji = '🔥';
        title = 'ROAST TIME';
      } else if (mode === 'praise') {
        content = PRAISES[Math.floor(Math.random() * PRAISES.length)];
        emoji = '👑';
        title = 'PRAISE TIME';
      } else if (mode === 'punish') {
        content = PUNISHMENTS[Math.floor(Math.random() * PUNISHMENTS.length)];
        emoji = '😈';
        title = 'PUNISHMENT';
      }

      const finalText =
        `*${emoji} ${title} — 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎯 *Target:* @${targetPhone}\n` +
        `👑 *Owner ka Hukum!*\n\n` +
        `${content}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ *Powered by 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱*`;

      await sock.sendMessage(chatId, {
        text: finalText,
        mentions: [targetJid],
        edit: aimMsg.key
      });

      await sock.sendMessage(chatId, { react: { text: emoji, key: msg.key } });

    } catch (error) {
      await extra.reply(`❌ ${error.message}`);
      await extra.react('❌');
    }
  }
};
