/**
 * Video Downloader - Download video from YouTube
 * Uses the exact same download logic as the working .yt command:
 * Primary: @distube/ytdl-core (direct from YouTube)
 * Fallback: https://backend1.tioo.eu.org (if ytdl-core fails)
 */

const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

async function fetchWithRetry(url, maxRetries = 3, timeout = 15000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      return await axios.get(url, { timeout, headers: { 'User-Agent': userAgent } });
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  throw lastError;
}

// Download — tries ytdl-core first (direct from YouTube), then the backup API.
// Identical to the .yt command's downloadYoutube() — kept in sync deliberately
// so a fix to one applies to both.
async function downloadYoutube(url) {
  try {
    const info = await ytdl.getInfo(url);
    const durationSec = parseInt(info.videoDetails.lengthSeconds || '0', 10);
    if (durationSec > 0 && durationSec <= 300) {
      const stream = ytdl.downloadFromInfo(info, { quality: '18' }); // 360p progressive mp4, video+audio together
      const buffer = await streamToBuffer(stream);
      if (buffer && buffer.length > 0) {
        return {
          buffer,
          title: info.videoDetails.title,
          author: info.videoDetails.author?.name || 'Unknown',
          thumbnail: info.videoDetails.thumbnails?.[0]?.url || null
        };
      }
    }
  } catch (e) {
    console.log('ytdl-core failed for .video, trying backup API:', e.message);
  }

  // Fallback: third-party API
  const apiUrl = `https://backend1.tioo.eu.org/YouTube?url=${encodeURIComponent(url)}`;
  const response = await fetchWithRetry(apiUrl, 3, 20000);
  const data = response.data;
  if (!data?.status || !data?.mp4) {
    throw new Error('Could not extract video — it may be unavailable or too long.');
  }
  const videoResp = await axios.get(data.mp4, { responseType: 'arraybuffer', timeout: 90000, maxContentLength: Infinity, maxBodyLength: Infinity });
  return {
    buffer: Buffer.from(videoResp.data),
    title: data.title || 'YouTube Video',
    author: data.author || 'Unknown',
    thumbnail: data.thumbnail || null
  };
}

module.exports = {
  name: 'video',
  aliases: ['ytmp4', 'ytvideo'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <name or link>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      const query = args.join(' ').trim();

      if (!query) {
        return await sock.sendMessage(chatId, { text: 'Usage: .video <name or link>' }, { quoted: msg });
      }

      let videoUrl = '';
      let thumbnail = '';

      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        videoUrl = query;
      } else {
        const { videos } = await yts(query);
        if (!videos || videos.length === 0) {
          return await sock.sendMessage(chatId, { text: 'No videos found!' }, { quoted: msg });
        }
        videoUrl = videos[0].url;
        thumbnail = videos[0].thumbnail;
      }

      await sock.sendMessage(chatId, { text: `⏳ Downloading video...` }, { quoted: msg });

      const videoInfo = await downloadYoutube(videoUrl);

      await sock.sendMessage(chatId, {
        video: videoInfo.buffer,
        mimetype: 'video/mp4',
        fileName: `${(videoInfo.title || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
        caption: `*${videoInfo.title}*\n\n> © ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀`
      }, { quoted: msg });

    } catch (error) {
      console.error('Video command error:', error.message);
      await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
  }
};
