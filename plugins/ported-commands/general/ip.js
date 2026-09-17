const axios = require('axios');

module.exports = {
  name: 'ip',
  category: 'general',
  description: 'Kisi bhi IP address ya website domain ki location aur network details check karein.',
  usage: 'ip <IP address ya domain>',
  aliases: ['iplookup', 'iptracker'],

  async execute(sock, msg, args, extra) {
    try {
      const query = args[0];
      const prefix = extra.config?.prefix || '.';

      // Agar user ne IP ya domain nahi diya
      if (!query) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}ip google.com _ya_ ${prefix}ip 8.8.8.8`);
      }

      await extra.react('🌐');
      await extra.reply('🌐 IP address ki details trace ki ja rahi hain...');

      // Free public IP lookup API (No API Key Required)
      const response = await axios.get(`http://ip-api.com/json/${query}`);
      const data = response.data;

      if (data.status === 'fail') {
        return extra.reply(`❌ IP details nahi mil saki. Sahi IP address ya domain name enter karein.`);
      }

      const resultText = `*🌐 𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 IP Lookup*\n\n` +
        `🎯 *Target:* ${query}\n` +
        `📍 *IP:* ${data.query}\n` +
        `🌍 *Country:* ${data.country} (${data.countryCode})\n` +
        `🏙️ *City/Region:* ${data.city}, ${data.regionName}\n` +
        `📮 *Postal Code:* ${data.zip || 'N/A'}\n` +
        `📡 *ISP/Network:* ${data.isp}\n` +
        `🏢 *Organization:* ${data.org || 'N/A'}\n` +
        `🗺️ *Coordinates:* Lat ${data.lat}, Lon ${data.lon}`;

      await extra.reply(resultText);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD IP] Error:", error.message);
      await extra.reply(`❌ IP trace karte waqt masla aa gaya. Dobara try karein.`);
    }
  }
};
