module.exports = {
  name: 'flux',
  category: 'ai',
  description: 'Duniya ke sab se behtareen AI model (Flux.1) se apni marzi ki ultra-realistic tasveer generate karein.',
  usage: 'flux <tasveer ka khayal / prompt>',
  aliases: ['aiimg', 'fluximg', 'genimage'],

  async execute(sock, msg, args, extra) {
    try {
      const promptText = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne prompt nahi diya
      if (!promptText) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}flux a futuristic cyber city at night, neon lights, 4k`);
      }

      await extra.react('🎨');
      await extra.reply('🎨 Flux AI high-quality tasveer taiyar kar raha hai, thora wait karein...');

      // Free Flux Public API (No API Key Required) - Direct Image URL Endpoint
      // Yeh direct high-resolution image render kar ke deta hai
      const encodedPrompt = encodeURIComponent(promptText);
      const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

      const captionText = `*🎨 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Flux AI Generator*\n\n` +
        `📝 *Prompt:* ${promptText}\n` +
        `⚡ *Model:* Flux.1 Ultra-Real`;

      // WhatsApp par image send karein
      await sock.sendMessage(
        msg.key.remoteJid,
        { 
          image: { url: imageUrl }, 
          caption: captionText 
        },
        { quoted: msg }
      );

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD FLUX] Error:", error.message);
      await extra.reply(`❌ Tasveer generate karte waqt masla aa gaya. Prompt thora short ya clear kar ke dobara try karein.`);
    }
  }
};
