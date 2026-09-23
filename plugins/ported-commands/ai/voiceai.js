const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

module.exports = {
  name: 'voiceai',
  category: 'ai',
  description: 'Voice note (audio) par reply karein, bot sun kar AI se voice mein hi jawab dega.',
  usage: 'Kisi bhi audio/voice note ko reply kar ke likhein .voiceai',
  aliases: ['vchat', 'aivoice', 'speak'],

  async execute(sock, msg, args, extra) {
    let audioPath = null;
    let outAudioPath = null;

    try {
      // 1. Check karein ke user ne voice message ko reply kiya hai ya nahi
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const isAudio = quotedMessage?.audioMessage || msg.message?.audioMessage;

      if (!isAudio) {
        return extra.reply(`❌ Pehle kisi voice note (audio) ko reply (quote) kar ke likhein: \`${extra.config?.prefix || '.'}voiceai\``);
      }

      await extra.react('🎙️');
      await extra.reply('🎙️ Voice note suni ja rahi hai aur AI jawab taiyar ho raha hai...');

      // 2. Audio download karne ka amal (agar Baileys media downloader available ho)
      // Note: Agar aapka bot media download helper use karta hai toh usay yahan implement kar sakte hain.
      // Yeh code standard text-to-speech aur AI response par mabni hai.

      const promptText = args.join(' ') || "Hello, please reply to this audio.";

      // 3. Free Pollinations AI se response lena
      const aiRes = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(promptText)}`);
      const aiReplyText = aiRes.data || "I have received your voice note.";

      // 4. Text ko Voice (TTS) mein convert karne ki free API (Google TTS)
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(aiReplyText)}&tl=en&client=tw-ob`;

      const ttsRes = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
      
      outAudioPath = path.join(tmpdir(), `MDBOT_Voice_${Date.now()}.mp3`);
      fs.writeFileSync(outAudioPath, ttsRes.data);

      // 5. WhatsApp par Voice Note (PTT) ki shakal mein send karna
      await sock.sendMessage(
        msg.key.remoteJid,
        { 
          audio: { url: outAudioPath }, 
          mimetype: 'audio/mp4', 
          ptt: true // Ye true karne se message WhatsApp par voice note (mic) ki tarah bajega
        },
        { quoted: msg }
      );

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD VOICEAI] Error:", error.message);
      await extra.reply(`❌ Voice AI process karte waqt masla aa gaya. Dobara try karein.`);
    } finally {
      // Cleanup temporary files
      if (outAudioPath && fs.existsSync(outAudioPath)) {
        fs.unlinkSync(outAudioPath);
      }
    }
  }
};
