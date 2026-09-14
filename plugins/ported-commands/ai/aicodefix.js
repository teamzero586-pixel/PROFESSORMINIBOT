const axios = require('axios');

module.exports = {
  name: 'aicodefix',
  category: 'ai',
  description: 'Apna code ya error bhejein, AI usay analyze kar ke bug fix aur explain karega bina kisi API key ke.',
  usage: 'aicodefix <code ya error>',
  aliases: ['fixcode', 'bugfix'],

  async execute(sock, msg, args, extra) {
    try {
      const codeInput = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne code nahi diya
      if (!codeInput) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}aicodefix console.log("hello"`);
      }

      await extra.react('🛠️');
      await extra.reply('🛠️ Code analyze aur fix kiya ja raha hai, thora wait karein...');

      // AI ko expert programmer ke tor par instruct kar rahe hain
      const systemInstruction = "You are an expert programmer and code debugger. Analyze the provided code or error, explain the bug simply, and provide the fully fixed and optimized code. Support JS, Python, HTML, CSS, PHP, and TypeScript. Keep the formatting clean with markdown.";
      const fullRequest = `${systemInstruction}\n\nProvided Code/Error:\n${codeInput}`;

      // Pollinations Text API (No Key Required)
      const response = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(fullRequest)}`);
      
      const resultText = response.data;

      // Final reply
      await extra.reply(`*🧑‍💻 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 Code Fixer*\n\n${resultText}`);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AICODEFIX] Error:", error.message);
      await extra.reply(`❌ Code fix karte waqt masla aaya. Dobara try karein.`);
    }
  }
};
