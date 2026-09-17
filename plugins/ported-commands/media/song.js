/**
 * Song Downloader - Download audio from YouTube (.song / .play)
 * Uses the exact same download logic as the working .yt command to fetch
 * the video (video+audio together — this is what actually works), then
 * strips it down to MP3 with ffmpeg. This avoids depending on the
 * unreliable audio-only APIs that were failing before.
 */

const yts = require('yt-search');
const { toAudio } = require('../../utils/converter');
const { downloadYoutube } = require('../../../lib/ytDownloader');

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
