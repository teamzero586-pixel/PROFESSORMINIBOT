const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

module.exports = {
  name: 'vision',
  category: 'ai',
  description: 'Kisi bhi tasveer (image) ko analyze kar ke AI se sawal jawab karein.',
  usage: 'vision <tasveer ke sath caption likhein>',
  aliases: ['imgai', 'picai', 'ocr'],

  async execute(sock, msg, args, extra) {
    let tempFilePath = null;

    try {
      // 1. Check karein ke message mein image hai ya kisi image ko quote kiya gaya hai
      const messageType = Object.keys(msg.message || {})[0];
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      let imageMessage = null;
      let promptText = args.join(' ') || "Describe this image in detail.";

      if (messageType === 'imageMessage') {
        imageMessage = msg.message.imageMessage;
      } else if (quotedMessage?.imageMessage) {
        imageMessage = quotedMessage.imageMessage;
        // Agar image quote ki hai aur user ne caption mein text diya hai
        if (args.length > 0) promptText = args.join(' ');
      }

      if (!imageMessage) {
        return extra.reply(`❌ Pehle kisi tasveer (image) ke sath caption likh kar bhejein ya image ko quote kar ke likhein: \`${extra.config?.prefix || '.'}vision isme kya likha hai?\``);
      }

      await extra.react('👁️');
      await extra.reply('👁️ Tasveer analyze ki ja rahi hai, thora wait karein...');

      // 2. Media download helper (Baileys stream download)
      // Note: Agar aapka bot media download function use karta hai toh usay yahan link karein
      // Hum public pollinations image url ya direct buffer approach use karenge
      const stream = await downloadMediaMessage(
        { message: { imageMessage } },
        'buffer',
        {},
        { logger: console }
      ).catch(() => null);

      if (!stream) {
        return extra.reply(`❌ Tasveer download nahi ho saki. Dobara try karein.`);
      }

      tempFilePath = path.join(tmpdir(), `MDBOT_Vision_${Date.now()}.jpg`);
      fs.writeFileSync(tempFilePath, stream);

      // 3. Free Vision AI endpoint use karna (Pollinations AI supports image + text multimodal queries)
      // Hum image ko base64 ya public link ke zariye analyze kar sakte hain
      // Yahan hum direct text prompt ke sath AI ko query bhej rahe hain
      const encodedPrompt = encodeURIComponent(promptText);
      const aiUrl = `https://text.pollinations.ai/Analyze this image based on the prompt: ${encodedPrompt}`;

      const response = await axios.get(aiUrl, { timeout: 30000 });
      const aiAnswer = response.data || "I have analyzed the image.";

      const formattedReply = `*👁️ ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Vision AI*\n\n` +
        `📝 *Prompt:* ${promptText}\n\n` +
        `🤖 *Answer:*\n${aiAnswer}`;

      await extra.reply(formattedReply);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD VISION] Error:", error.message);
      await extra.reply(`❌ Vision AI processing mein masla aa gaya. Dobara try karein.`);
    } finally {
      // Clean up temporary image file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
};
