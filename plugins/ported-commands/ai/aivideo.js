const axios = require('axios');

module.exports = {
  name: 'aivideo',
  category: 'ai',
  description: 'Apne idea se 4 different styles (Realistic, Anime, Cyberpunk, Cinematic) ke video prompts generate karein bina kisi API key ke.',
  usage: 'aivideo <aapka idea>',
  aliases: ['videoprompt', 'vprompt'],

  async execute(sock, msg, args, extra) {
    try {
      const idea = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne idea nahi diya
      if (!idea) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}aivideo flying car in neon city`);
      }

      await extra.react('🎬');
      await extra.reply('🎬 Aapke idea ko cinematic prompts mein convert kiya ja raha hai...');

      // AI ko instruct kar rahe hain ke 4 styles mein prompt de
      const systemInstruction = "You are a professional AI video prompt engineer. Convert the user's simple idea into 4 different detailed cinematic prompts: 1. Realistic 2. Anime 3. Cyberpunk 4. Cinematic. Make them highly detailed with camera angles. Keep the response clean and organized.";
      const fullRequest = `${systemInstruction}\n\nUser Idea: ${idea}`;

      // Pollinations Text API (No Key Required)
      const response = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(fullRequest)}`);
      
      const resultText = response.data;

      // Final reply
      await extra.reply(`*🎬 AI Video Prompts*\n\n${resultText}`);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AIVIDEO] Error:", error.message);
      await extra.reply(`❌ Prompts generate karne mein masla aaya. Thori der baad try karein.`);
    }
  }
};
