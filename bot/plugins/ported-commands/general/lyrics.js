const axios = require('axios');

module.exports = {
  name: 'lyrics',
  category: 'general',
  description: 'Kisi bhi gaane ka naam likh kar uske lyrics (bol) search karein.',
  usage: 'lyrics <gaane ka naam>',
  aliases: ['songlyrics', 'bol'],

  async execute(sock, msg, args, extra) {
    try {
      const songQuery = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne gaane ka naam nahi diya
      if (!songQuery) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}lyrics Afreen Afreen`);
      }

      await extra.react('🎵');
      await extra.reply('🎵 Lyrics talash kiye ja rahe hain...');

      // Free public lyrics API (No API Key Required)
      const response = await axios.get(`https://some-random-api.com/others/lyrics?title=${encodeURIComponent(songQuery)}`);
      const data = response.data;

      if (!data || !data.lyrics) {
        return extra.reply(`❌ Is gaane ke lyrics nahi mile. Koi doosra gaana try karein.`);
      }

      const title = data.title || songQuery;
      const artist = data.author || 'Unknown Artist';
      const lyrics = data.lyrics;

      // Agar lyrics bohot lambey hon toh text truncate ya split ho sakta hai, lekin aam taur par yeh fit aa jate hain
      const resultText = `*🎵 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Lyrics Finder*\n\n` +
        `🎤 *Title:* ${title}\n` +
        `👤 *Artist:* ${artist}\n\n` +
        `📜 *Lyrics:*\n${lyrics}`;

      // Agar message bohot lamba ho toh safe side ke liye chunking ya direct reply
      if (resultText.length > 4000) {
        await extra.reply(resultText.substring(0, 4000) + "\n\n_(Lyrics bohot lambey thay isliye cut kar diye gaye hain)_");
      } else {
        await extra.reply(resultText);
      }

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD LYRICS] Error:", error.message);
      await extra.reply(`❌ Lyrics find karte waqt masla aa gaya. Sahi gaane ka naam likhein.`);
    }
  }
};
