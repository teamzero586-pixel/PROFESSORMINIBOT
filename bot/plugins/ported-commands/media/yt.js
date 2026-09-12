/**
 * YouTube Downloader Plugin
 * Primary: ytdl-core (direct from YouTube, no third-party API dependency)
 * Fallback: https://backend1.tioo.eu.org (if ytdl-core fails)
 */

const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const config = require('../../../config');

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

function isYoutubeUrl(text) {
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/shorts\//,
    /youtube\.com\/embed\//,
    /m\.youtube\.com\/watch\?v=/
  ];
  return patterns.some(pattern => pattern.test(text));
}

// Search — via yt-search (local library, no third-party API needed)
async function searchYoutube(query) {
  const search = await yts(query);
  if (!search || !search.videos || search.videos.length === 0) {
    throw new Error('No videos found for your query.');
  }
  const topVideo = search.videos[0];
  return {
    title: topVideo.title,
    videoUrl: topVideo.url,
    author: topVideo.author?.name || 'Unknown',
    thumbnail: topVideo.thumbnail
  };
}

// Download — tries ytdl-core first (direct from YouTube), then the backup API
async function downloadYoutube(url) {
  try {
    const info = await ytdl.getInfo(url);
    const durationSec = parseInt(info.videoDetails.lengthSeconds || '0', 10);
    if (durationSec > 0 && durationSec <= 300) {
      const stream = ytdl.downloadFromInfo(info, { quality: '18' });
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
    console.log('ytdl-core failed for .yt, trying backup API:', e.message);
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
  name: 'yt',
  aliases: ['youtube', 'ytdl'],
  category: 'media',
  description: '🎬 Download YouTube videos (supports URL or search query)',
  usage: '.yt <url or search query>',

  async execute(sock, msg, args, extra) {
    const { from, reply, react } = extra;

    const input = args.join(' ').trim();
    if (!input) {
      return reply(`❌ Please provide a YouTube URL or search query.\nExample: ${this.usage}`);
    }

    try {
      await react('⏳');

      let videoInfo;

      if (isYoutubeUrl(input)) {
        videoInfo = await downloadYoutube(input);
      } else {
        const searchInfo = await searchYoutube(input);
        videoInfo = await downloadYoutube(searchInfo.videoUrl);
        if (videoInfo.author === 'Unknown' && searchInfo.author !== 'Unknown') {
          videoInfo.author = searchInfo.author;
        }
        if (!videoInfo.thumbnail) videoInfo.thumbnail = searchInfo.thumbnail;
      }

      let caption = `🎬 *${videoInfo.title}*`;
      if (videoInfo.author && videoInfo.author !== 'Unknown') {
        caption += `\n👤 *Author:* ${videoInfo.author}`;
      }
      caption += `\n\n${config.BOT_NAME}`;

      await sock.sendMessage(from, {
        video: videoInfo.buffer,
        mimetype: 'video/mp4',
        caption: caption
      }, { quoted: msg });

      await react('✅');
    } catch (error) {
      console.error('YouTube plugin error:', error.message);
      let errorMsg = '❌ Failed to download.';
      if (error.code === 'ECONNABORTED') errorMsg += ' Request timed out.';
      else errorMsg += ` ${error.message}`;
      await reply(errorMsg);
      await react('❌');
    }
  }
};
