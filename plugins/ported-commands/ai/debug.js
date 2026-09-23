const axios = require('axios');

module.exports = {
  name: 'debug',
  category: 'ai',
  description: 'Apna error log ya kharab code bhejein, AI analyze kar ke fix suggest karega.',
  usage: 'debug <error log ya code ka masla>',
  aliases: ['fixbug', 'errorfix', 'bug'],

  async execute(sock, msg, args, extra) {
    try {
      const errorLog = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne error log nahi diya
      if (!errorLog) {
        return extra.reply(
          `*🐛 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Code Debugger*\n\n` +
          `Sahi tareeqa:\n` +
          `\`${prefix}debug TypeError: Cannot read properties of undefined (reading 'chats')\`\n\n` +
          `_Ya apne kharab code ka error paste karein._`
        );
      }

      await extra.react('🛠️');
      await extra.reply('🛠️ Error analyze kiya ja raha hai, solution ban raha hai...');

      // Prompt design karna taake AI sirf developer-friendly aur exact fix de
      const prompt = `Act as an expert Node.js / JavaScript WhatsApp bot developer. Analyze this error log or bug description, explain why it happened in short, and provide the exact fixed code or solution:\n\n${errorLog}`;

      // Free Pollinations AI API request
      const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });
      
      const aiSolution = response.data;

      if (!aiSolution) {
        return extra.reply(`❌ AI debug solution nahi de saka. Dobara try karein.`);
      }

      const formattedReply = `*🛠️ 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Debug Report*\n\n${aiSolution}`;

      await extra.reply(formattedReply);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD DEBUG] Error:", error.message);
      await extra.reply(`❌ Debugging process mein masla aa gaya. Thori dair baad try karein.`);
    }
  }
};
