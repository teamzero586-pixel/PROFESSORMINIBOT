/**
 * Shared YouTube downloader used by .song, .yt, and .video.
 *
 * Order of attempts:
 *   1. ytdl-core — direct from YouTube, no third-party API, but YouTube
 *      actively changes its player signature to break scrapers like this,
 *      so it can go stale until the @distube/ytdl-core package is updated.
 *   2. A chain of public downloader APIs, tried one after another. If one
 *      is down (502/503/timeout/etc.) the next is tried automatically
 *      instead of the whole command failing on the first dead provider.
 *
 * To add/remove/replace a fallback provider, edit the PROVIDERS array —
 * nothing else needs to change since every plugin calls this one module.
 */

const axios = require('axios');
const ytdl = require('@distube/ytdl-core');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function fetchWithRetry(url, maxRetries = 2, timeout = 15000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      return await axios.get(url, { timeout, headers: { 'User-Agent': userAgent } });
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

// Each provider must return { mp4Url, title, thumbnail, author } or throw.
const PROVIDERS = [
  {
    name: 'tioo',
    async fetch(url) {
      const apiUrl = `https://backend1.tioo.eu.org/YouTube?url=${encodeURIComponent(url)}`;
      const { data } = await fetchWithRetry(apiUrl, 2, 20000);
      if (!data?.status || !data?.mp4) throw new Error('tioo: no mp4 in response');
      return { mp4Url: data.mp4, title: data.title, thumbnail: data.thumbnail, author: data.author };
    }
  },
  {
    name: 'giftedtech',
    async fetch(url) {
      const apiUrl = `https://api.giftedtech.web.id/api/download/dlmp4?apikey=gifted&url=${encodeURIComponent(url)}`;
      const { data } = await fetchWithRetry(apiUrl, 2, 20000);
      const result = data?.result || data;
      const mp4Url = result?.download_url || result?.url || result?.mp4;
      if (!mp4Url) throw new Error('giftedtech: no mp4 in response');
      return { mp4Url, title: result?.title, thumbnail: result?.thumbnail, author: result?.author };
    }
  },
  {
    name: 'davidcyril',
    async fetch(url) {
      const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(url)}`;
      const { data } = await fetchWithRetry(apiUrl, 2, 20000);
      const result = data?.result || data;
      const mp4Url = result?.download_url || result?.url;
      if (!mp4Url) throw new Error('davidcyril: no mp4 in response');
      return { mp4Url, title: result?.title, thumbnail: result?.thumbnail, author: result?.author };
    }
  }
];

/**
 * @param {string} url YouTube video URL
 * @param {object} opts { maxDurationSec: number } — only used to decide
 *   whether the direct ytdl-core path is attempted first.
 */
async function downloadYoutube(url, opts = {}) {
  const maxDurationSec = opts.maxDurationSec || 480;

  // 1. Try direct download — fastest, no API dependency.
  try {
    const info = await ytdl.getInfo(url);
    const durationSec = parseInt(info.videoDetails.lengthSeconds || '0', 10);
    if (durationSec > 0 && durationSec <= maxDurationSec) {
      const stream = ytdl.downloadFromInfo(info, { quality: '18' });
      const buffer = await streamToBuffer(stream);
      if (buffer && buffer.length > 0) {
        return {
          buffer,
          title: info.videoDetails.title,
          author: info.videoDetails.author?.name || 'Unknown',
          thumbnail: info.videoDetails.thumbnails?.[0]?.url || null,
          source: 'ytdl-core'
        };
      }
    }
  } catch (e) {
    console.log('ytdl-core failed, trying fallback APIs:', e.message);
  }

  // 2. Walk the provider chain — first one that succeeds wins.
  const errors = [];
  for (const provider of PROVIDERS) {
    try {
      const result = await provider.fetch(url);
      const videoResp = await axios.get(result.mp4Url, {
        responseType: 'arraybuffer', timeout: 90000, maxContentLength: Infinity, maxBodyLength: Infinity
      });
      return {
        buffer: Buffer.from(videoResp.data),
        title: result.title || 'YouTube',
        author: result.author || 'Unknown',
        thumbnail: result.thumbnail || null,
        source: provider.name
      };
    } catch (e) {
      errors.push(`${provider.name}: ${e.response?.status || e.message}`);
      continue;
    }
  }

  throw new Error(`All download sources failed (${errors.join(' | ')}). YouTube may be blocking this video, or the video is unavailable — try again in a bit.`);
}

// Audio-specific providers — return a direct MP3 URL, so no local
// ffmpeg conversion is needed if one of these succeeds. Tried before
// falling back to the video-download-then-convert path below.
const AUDIO_PROVIDERS = [
  {
    name: 'proxabdullah',
    async fetch(url) {
      const apiUrl = `https://apis-proxabdullah.zone.id/api/ytmp3?url=${encodeURIComponent(url)}&apikey=PROxABDULLAH-API-08`;
      const { data } = await fetchWithRetry(apiUrl, 2, 20000);
      if (!data?.status || !data?.download_url) throw new Error('proxabdullah: no download_url in response');
      return {
        mp3Url: data.download_url,
        title: data.info?.title,
        thumbnail: data.info?.thumbnail,
        author: data.info?.uploader
      };
    }
  }
];

/**
 * Tries direct-MP3 providers first (fast, no conversion needed), then
 * falls back to downloading the video and converting it locally.
 * @param {string} url YouTube video URL
 * @param {function} [toAudio] optional (buffer) => Promise<buffer> converter
 *   used only if every direct-audio provider fails.
 */
async function downloadYoutubeAudio(url, toAudio) {
  const errors = [];
  for (const provider of AUDIO_PROVIDERS) {
    try {
      const result = await provider.fetch(url);
      const audioResp = await axios.get(result.mp3Url, {
        responseType: 'arraybuffer', timeout: 90000, maxContentLength: Infinity, maxBodyLength: Infinity
      });
      return {
        buffer: Buffer.from(audioResp.data),
        title: result.title || 'YouTube Audio',
        author: result.author || 'Unknown',
        thumbnail: result.thumbnail || null,
        source: provider.name
      };
    } catch (e) {
      errors.push(`${provider.name}: ${e.response?.status || e.message}`);
      continue;
    }
  }

  // Every direct-audio provider failed — fall back to the video chain
  // and convert locally, same as before.
  console.log(`Direct-audio providers failed (${errors.join(' | ')}), falling back to video+convert`);
  const videoResult = await downloadYoutube(url);
  if (typeof toAudio === 'function') {
    const audioBuffer = await toAudio(videoResult.buffer);
    return { ...videoResult, buffer: audioBuffer, source: videoResult.source + '+converted' };
  }
  return videoResult;
}

module.exports = { downloadYoutube, downloadYoutubeAudio, streamToBuffer, fetchWithRetry };
