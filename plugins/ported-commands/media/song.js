/**
 * Song Downloader - Download audio from YouTube (.song / .play)
 * Tries direct-MP3 APIs first (fast, no conversion needed); if every one
 * of those is down, falls back to downloading the video (video+audio
 * together — proven to work) and stripping it to MP3 with ffmpeg.
 */

const yts = require('yt-search');
const { toAudio } = require('../../utils/converter');
const { downloadYoutubeAudio } = require('../../../lib/ytDownloader');

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

      const audioInfo = await downloadYoutubeAudio(videoUrl, (buf) => toAudio(buf, 'mp4'));
      const finalTitle = audioInfo.title || title || 'song';

      const mp3Buffer = audioInfo.buffer;
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
