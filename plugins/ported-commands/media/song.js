/**
 * Song Downloader - Download audio from YouTube (.song / .play)
 * Uses the exact same download logic as the working .yt command to fetch
 * the video (video+audio together — this is what actually works), then
 * strips it down to MP3 with ffmpeg. This avoids depending on the
 * unreliable audio-only APIs that were failing before.
 */

const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const { toAudio } = require('../../utils/converter');

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

// Download the video (not audio-only) — identical to the .yt / .video
// downloadYoutube() on purpose, since that path is the one that's proven
// to work. The audio gets extracted from this afterwards.
async function downloadYoutube(url) {
  try {
    const info = await ytdl.getInfo(url);
    const durationSec = parseInt(info.videoDetails.lengthSeconds || '0', 10);
    if (durationSec > 0 && durationSec <= 480) {
      const stream = ytdl.downloadFromInfo(info, { quality: '18' }); // 360p progressive mp4, video+audio together
      const buffer = await streamToBuffer(stream);
      if (buffer && buffer.length > 0) {
        return { buffer, title: info.videoDetails.title, thumbnail: info.videoDetails.thumbnails?.[0]?.url || null };
      }
    }
  } catch (e) {
    console.log('ytdl-core failed for .song, trying backup API:', e.message);
  }

  // Fallback: third-party API (same one .yt/.video use)
  const apiUrl = `https://backend1.tioo.eu.org/YouTube?url=${encodeURIComponent(url)}`;
  const response = await fetchWithRetry(apiUrl, 3, 20000);
  const data = response.data;
  if (!data?.status || !data?.mp4) {
    throw new Error('Could not extract audio — it may be unavailable or too long.');
  }
  const videoResp = await axios.get(data.mp4, { responseType: 'arraybuffer', timeout: 90000, maxContentLength: Infinity, maxBodyLength: Infinity });
  return { buffer: Buffer.from(videoResp.data), title: data.title || 'YouTube Audio', thumbnail: data.thumbnail || null };
}

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'yta'],
  category: 'media',
  description: 'Download audio from YouTube',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      const text = args.join(' ').trim();

      if (!text) {
        return await sock.sendMessage(chatId, { text: 'Usage: .song <song name or YouTube link>' }, { quoted: msg });
      }

      let videoUrl = '';
      let thumbnail = '';
      let title = '';

      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        videoUrl = text;
      } else {
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await sock.sendMessage(chatId, { text: 'No results found.' }, { quoted: msg });
        }
        videoUrl = search.videos[0].url;
        thumbnail = search.videos[0].thumbnail;
        title = search.videos[0].title;
      }

      await sock.sendMessage(chatId, { text: `⏳ Downloading *${title || 'your song'}*...` }, { quoted: msg });

      const videoInfo = await downloadYoutube(videoUrl);
      const finalTitle = videoInfo.title || title || 'song';

      // Strip video, keep audio, encode to MP3 — ffmpeg reads the format
      // from the file content itself, so feeding it the whole mp4 is fine.
      const mp3Buffer = await toAudio(videoInfo.buffer, 'mp4');
      if (!mp3Buffer || mp3Buffer.length === 0) {
        throw new Error('Audio conversion returned empty file.');
      }

      await sock.sendMessage(chatId, {
        audio: mp3Buffer,
        mimetype: 'audio/mpeg',
        fileName: `${finalTitle.replace(/[^\w\s-]/g, '')}.mp3`,
        ptt: false
      }, { quoted: msg });

    } catch (err) {
      console.error('Song command error:', err.message);
      await sock.sendMessage(chatId, { text: `❌ Failed to download song: ${err.message}` }, { quoted: msg });
    }
  }
};
