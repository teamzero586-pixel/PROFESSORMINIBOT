const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

// Anti-Block User Agents for API Requests
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'okhttp/4.9.3'
];

// Robust Fetch Function with Retry Logic
async function fetchWithRetry(url, options = {}, maxRetries = 3, timeout = 15000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      const config = {
        timeout,
        headers: { 'User-Agent': userAgent, ...options.headers },
        ...options
      };
      const response = await axios.get(url, config);
      return response;
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      // Exponential backoff (1s, 2s, 4s wait)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  throw lastError;
}

module.exports = {
  name: 'tiktok',
  category: 'media',
  description: 'TikTok video bina watermark (Full HD quality) mein download karein.',
  usage: 'tiktok <TikTok Video URL>',
  aliases: ['tt', 'ttdl', 'tiktokdl'],

  async execute(sock, msg, args, extra) {
    let filePath = null;

    try {
      const url = args[0];
      const prefix = extra.config?.prefix || '.';

      // URL Check
      if (!url) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}tiktok https://vt.tiktok.com/ZSxxxxxxx/`);
      }

      if (!url.includes('tiktok.com')) {
        return extra.reply(`❌ Sahi TikTok link dein!`);
      }

      await extra.react('📥');
      await extra.reply('📥 TikTok Video (Full HD & No Watermark) fetch ho rahi hai...');

      // API Request using fetchWithRetry & hd=1 parameter
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
      const response = await fetchWithRetry(apiUrl);
      const data = response.data;

      // Validate Response
      if (data.code !== 0 || !data.data) {
        return extra.reply(`❌ Video download nahi ho saki. Link check karein ke private ya delete toh nahi hui.`);
      }

      const videoData = data.data;
      
      // Lazmi Full HD (hdplay) uthana, fallback normal no-watermark (play)
      const videoUrl = videoData.hdplay || videoData.play;
      const title = videoData.title || 'No Title';
      const author = videoData.author ? videoData.author.nickname : 'Unknown Creator';

      if (!videoUrl) {
        return extra.reply(`❌ Video ka no-watermark link extract nahi ho saka.`);
      }

      // Temporary file path banayein
      const fileName = `MDBOT_TT_${Date.now()}.mp4`;
      filePath = path.join(tmpdir(), fileName);

      // Video as ArrayBuffer download karein Retry Logic ke sath
      const videoRes = await fetchWithRetry(videoUrl, { responseType: 'arraybuffer' }, 3, 30000);
      
      // File system mein save karein
      fs.writeFileSync(filePath, videoRes.data);

      const captionText = `*📥 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 TikTok HD*\n\n` +
        `👤 *Creator:* ${author}\n` +
        `📝 *Title:* ${title}\n` +
        `✨ *Quality:* Full HD (No Watermark)\n\n` +
        `_Downloaded via 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱_`;

      // WhatsApp par file send karein
      await sock.sendMessage(
        msg.key.remoteJid,
        { 
          video: { url: filePath }, 
          caption: captionText 
        },
        { quoted: msg }
      );

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD TIKTOK] Error:", error.message);
      await extra.reply(`❌ Video download karte waqt masla aa gaya. Dobara try karein.`);
    } finally {
      // Memory / Storage free karne ke liye temporary file ko hamesha delete karein
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
};
