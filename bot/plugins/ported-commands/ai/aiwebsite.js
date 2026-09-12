const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'aiwebsite',
  category: 'ai',
  description: 'Apne idea se ek modern, responsive website generate karein aur free hosting par live karein bina kisi API key ke.',
  usage: 'aiwebsite <website ka idea>',
  aliases: ['makewebsite', 'webbuilder'],

  async execute(sock, msg, args, extra) {
    try {
      const promptText = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne idea nahi diya
      if (!promptText) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}aiwebsite ek portfolio website banao dark mode ke sath`);
      }

      await extra.react('🌐');
      await extra.reply('🌐 AI website design aur code generate kar raha hai, thora wait karein...');

      // Senior Frontend Developer ke taur par AI ko instruct kar rahe hain
      const systemInstruction = "You are a senior frontend developer. Create a complete, modern, responsive website in a single HTML file with embedded CSS and JS based on the user's request. Ensure it has Dark Mode, a beautiful modern UI, and clean styling. Return ONLY the raw HTML code, no conversational filler, no markdown code blocks like ```html.";
      const fullRequest = `${systemInstruction}\n\nUser Request: ${promptText}`;

      // Pollinations Text API (No Key Required)
      const response = await axios.get(`[https://text.press.pollinations.ai/$](https://text.press.pollinations.ai/$){encodeURIComponent(fullRequest)}`.replace('text.', 'text.'));
      // Fallback clean for text api endpoint
      let htmlCode = response.data;
      if (typeof htmlCode !== 'string') {
        // Direct text api URL fix
        const resDirect = await axios.get(`[https://text.pollinations.ai/$](https://text.pollinations.ai/$){encodeURIComponent(fullRequest)}`);
        htmlCode = resDirect.data;
      }

      // Cleanup: Agar model phir bhi markdown bhej de to usay remove karo
      htmlCode = htmlCode.replace(/```html/gi, '').replace(/```/g, '').trim();

      // Temporary folder check aur create karna
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `MDBOT_Website_${Date.now()}.html`;
      const filePath = path.join(tempDir, fileName);

      // File system par save karein
      fs.writeFileSync(filePath, htmlCode);

      // Document ke sath Free Hosting ka link send karein
      const captionText = `*🌐 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 AI Website Builder*\n\n` +
        `✅ Aapki website file ready hai!\n\n` +
        `🚀 *Free Hosting & Live Preview:*\n` +
        `Aap apna yeh code copy kar ke ya file upload kar ke yahan free host kar sakte hain:\n` +
        `🔗 [https://pro.infy.click/](https://pro.infy.click/)\n\n` +
        `_Note: File ko download kar ke kisi bhi browser mein bhi run kar sakte hain._`;

      await sock.sendMessage(
        msg.key.remoteJid,
        { 
          document: { url: filePath }, 
          mimetype: 'text/html', 
          fileName: fileName,
          caption: captionText
        },
        { quoted: msg }
      );

      // RAM/Storage optimize karne ke liye temporary file delete kar dein
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AIWEBSITE] Error:", error.message);
      await extra.reply(`❌ Website generate karte waqt masla aaya. Prompt thora short ya simple kar ke try karein.`);
    }
  }
};
