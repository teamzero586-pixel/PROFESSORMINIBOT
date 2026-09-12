const axios = require('axios');

module.exports = {
  name: 'ai',
  category: 'ai',
  description: 'ChatGPT ki tarah AI se koi bhi sawal puchein, script likhwayein ya problem solve karwayein.',
  usage: 'ai <aapka sawal>',
  aliases: ['chatgpt', 'gpt', 'ask'],

  async execute(sock, msg, args, extra) {
    try {
      const query = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne sawal nahi diya
      if (!query) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}ai JavaScript mein array reverse kaise karte hain?`);
      }

      await extra.react('🤖');
      
      // Optional: Typing indicator show karne ke liye (agar aapke framework mein support hai)
      await sock.sendPresenceUpdate('composing', msg.key.remoteJid);

      // Free Pollinations Text API (No API Key Required, Fast & Stable)
      // Yeh direct plain text mein AI ka behtareen response deta hai
      const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(query)}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          // Model ko batana ke wo ek WhatsApp bot hai
          'Content-Type': 'application/json'
        }
      });

      const aiReply = response.data;

      if (!aiReply) {
        return extra.reply(`❌ AI response nahi de saka. Dobara try karein.`);
      }

      const formattedReply = `*🤖 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 AI*\n\n${aiReply}`;

      // Message ka jawab dena
      await extra.reply(formattedReply);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AI] Error:", error.message);
      await extra.reply(`❌ AI server busy hai. Thori dair baad apna sawal dobara puchein.`);
    }
  }
};
