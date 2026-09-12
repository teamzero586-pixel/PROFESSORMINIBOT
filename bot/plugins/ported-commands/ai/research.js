const axios = require('axios');

module.exports = {
  name: 'research',
  category: 'ai',
  description: 'Kisi bhi topic par tafseeli research report aur deep analysis generate karein.',
  usage: 'research <topic ka naam>',
  aliases: ['deepsearch', 'study', 'explore'],

  async execute(sock, msg, args, extra) {
    try {
      const topic = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne topic nahi diya
      if (!topic) {
        return extra.reply(
          `*📚 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Deep Research*\n\n` +
          `Sahi tareeqa:\n` +
          `\`${prefix}research Baileys WhatsApp bot architecture aur performance optimization\`\n\n` +
          `_Jis topic par research karni ho, uska naam ya sawal likhein._`
        );
      }

      await extra.react('🔬');
      await extra.reply('🔬 Topic par deep research ki ja rahi hai, tafseeli report ban rahi hai...');

      // Professional Researcher Prompt taake AI structural aur deep report de
      const researchPrompt = `Act as an expert senior researcher and analyst. Provide a comprehensive, well-structured, and detailed research report on the following topic. Include an introduction, key technical/practical aspects, benefits, challenges, and a conclusion:\n\n${topic}`;

      // Free Pollinations AI API request
      const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(researchPrompt)}`;
      const response = await axios.get(apiUrl, { timeout: 45000 });
      
      const researchReport = response.data;

      if (!researchReport) {
        return extra.reply(`❌ Research report generate nahi ho saki. Dobara try karein.`);
      }

      const formattedReply = `*🔬 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Research Report*\n\n` +
        `📌 *Topic:* ${topic}\n\n` +
        `${researchReport}`;

      await extra.reply(formattedReply);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD RESEARCH] Error:", error.message);
      await extra.reply(`❌ Research process mein masla aa gaya. Thori dair baad try karein.`);
    }
  }
};
