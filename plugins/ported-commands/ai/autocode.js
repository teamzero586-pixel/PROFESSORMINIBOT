const axios = require('axios');

module.exports = {
  name: 'autocode',
  category: 'ai',
  description: 'Kisi bhi project ya feature ka idea dein, AI poora complete source code generate karega.',
  usage: 'autocode <project ya script ki requirement>',
  aliases: ['makecode', 'codegenerator', 'generate'],

  async execute(sock, msg, args, extra) {
    try {
      const promptText = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne requirement nahi di
      if (!promptText) {
        return extra.reply(
          `*💻 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 AutoCode Generator*\n\n` +
          `Sahi tareeqa:\n` +
          `\`${prefix}autocode WhatsApp bot ke liye ek weather command ki file banao jo axios use kare\`\n\n` +
          `_Apni requirement tafseel se likhein._`
        );
      }

      await extra.react('💻');
      await extra.reply('💻 Poora source code likha ja raha hai, thora wait karein...');

      // Professional Developer Prompt taake AI clean aur formatted code de
      const developerPrompt = `Act as an expert software architect and full-stack developer. Write complete, clean, production-ready, and well-commented source code for the following requirement. Provide the code inside proper markdown code blocks:\n\n${promptText}`;

      // Free Pollinations AI API request
      const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(developerPrompt)}`;
      const response = await axios.get(apiUrl, { timeout: 45000 });
      
      const generatedCode = response.data;

      if (!generatedCode) {
        return extra.reply(`❌ Code generate nahi ho saka. Requirement thori choti ya clear kar ke dobara try karein.`);
      }

      // Agar code bohot lamba ho toh text ya document ki shakal mein bhejna
      const formattedReply = `*💻 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 AutoCode Result*\n\n` +
        `📝 *Requirement:* ${promptText}\n\n` +
        `${generatedCode}`;

      // Agar message bohot lamba ho toh WhatsApp chunking handle kar leta hai ya document bhej sakte hain
      await extra.reply(formattedReply);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AUTOCODE] Error:", error.message);
      await extra.reply(`❌ Code generation mein masla aa gaya. Server busy ho sakta hai.`);
    }
  }
};
