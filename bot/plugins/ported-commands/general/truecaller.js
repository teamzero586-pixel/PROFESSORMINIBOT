const axios = require('axios');

module.exports = {
  name: 'truecaller',
  category: 'general',
  description: 'Kisi bhi mobile number ki region, country aur operator details check karein.',
  usage: 'truecaller <phone number>',
  aliases: ['number', 'caller'],

  async execute(sock, msg, args, extra) {
    try {
      const number = args[0];
      const prefix = extra.config?.prefix || '.';

      // Agar user ne number nahi diya
      if (!number) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}truecaller +923001234567`);
      }

      await extra.react('🔍');
      await extra.reply('🔍 Number ki details search ki ja rahi hain...');

      // Free public number lookup API (No API key required)
      const cleanNumber = number.replace(/[^0-9]/g, '');
      const response = await axios.get(`https://htmlweb.ru/json/geo/tel?json&q=${cleanNumber}`);
      
      const data = response.data;

      if (!data || !data.ok) {
        return extra.reply(`❌ Is number ki koi details nahi mili. Sahi format use karein (e.g., +92...).`);
      }

      const country = data.country ? data.country.name : 'Unknown';
      const capital = data.country ? data.country.capital : 'Unknown';
      const region = data.region ? data.region.name : 'Unknown';
      const operator = data.operator ? data.operator.name : 'Unknown';
      const opRegion = data.operator ? data.operator.region : 'Unknown';

      const resultText = `*🔍 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Number Lookup*\n\n` +
        `📱 *Number:* +${cleanNumber}\n` +
        `🌍 *Country:* ${country} (${capital})\n` +
        `🏙️ *Region/State:* ${region}\n` +
        `📡 *Operator/Network:* ${operator}\n` +
        `📍 *Network Area:* ${opRegion}`;

      await extra.reply(resultText);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD TRUECALLER] Error:", error.message);
      await extra.reply(`❌ Number lookup mein masla aaya. Dobara try karein.`);
    }
  }
};
