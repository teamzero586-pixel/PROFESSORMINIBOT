/**
 * YouTube Downloader Plugin
 * Primary: ytdl-core (direct from YouTube, no third-party API dependency)
 * Fallback: https://backend1.tioo.eu.org (if ytdl-core fails)
 */

const yts = require('yt-search');
const config = require('../../../config');
const { downloadYoutube } = require('../../../lib/ytDownloader');

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
        videoInfo = await downloadYoutube(input, { maxDurationSec: 300 });
      } else {
        const searchInfo = await searchYoutube(input);
        videoInfo = await downloadYoutube(searchInfo.videoUrl, { maxDurationSec: 300 });
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
