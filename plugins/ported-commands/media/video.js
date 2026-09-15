/**
 * Video Downloader - Download video from YouTube
 * Uses the exact same download logic as the working .yt command:
 * Primary: @distube/ytdl-core (direct from YouTube)
 * Fallback: https://backend1.tioo.eu.org (if ytdl-core fails)
 */

const yts = require('yt-search');
const { downloadYoutube } = require('../../../lib/ytDownloader');

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

      const videoInfo = await downloadYoutube(videoUrl, { maxDurationSec: 300 });

      await sock.sendMessage(chatId, {
        video: videoInfo.buffer,
        mimetype: 'video/mp4',
        fileName: `${(videoInfo.title || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
        caption: `*${videoInfo.title}*\n\n> © 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱`
      }, { quoted: msg });

    } catch (error) {
      console.error('Video command error:', error.message);
      await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
  }
};
