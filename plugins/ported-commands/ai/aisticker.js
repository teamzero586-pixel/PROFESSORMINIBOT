module.exports = {
  name: 'aisticker',
  category: 'ai',
  description: 'AI se direct sticker generate karein bina kisi API key ke.',
  usage: 'aisticker <prompt>',
  aliases: ['stickerai', 'asticker'],

  async execute(sock, msg, args, extra) {
    try {
      const text = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne prompt nahi diya
      if (!text) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}aisticker cute angry bird`);
      }

      await extra.react('🪄');
      await extra.reply('🪄 AI Sticker ban raha hai, thora wait karein...');

      // Prompt ko sticker style ke liye modify kar rahe hain
      const finalPrompt = text + ", 2d vector art, sticker style, white background, no text";
      const encodedPrompt = encodeURIComponent(finalPrompt);
      
      // Sticker ke liye 512x512 size best rehta hai
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;

      // Baileys mein direct URL ko as a sticker bhejna
      await sock.sendMessage(
        msg.key.remoteJid, 
        { 
          sticker: { url: imageUrl } 
        }, 
        { quoted: msg }
      );

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AISTICKER] Error:", error.message);
      await extra.reply(`❌ Sticker generate karne mein masla aaya. Prompt thora change kar ke try karein.`);
    }
  }
};
