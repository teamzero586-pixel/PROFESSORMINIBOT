const axios = require('axios');

module.exports = {
  name: 'apicheck',
  category: 'utility',
  description: 'Kisi bhi API endpoint ka status, response time aur health check karein.',
  usage: 'apicheck https://api.ipify.org?format=json',
  aliases: ['healthcheck', 'pingapi', 'checkapi'],

  async execute(sock, msg, args, extra) {
    try {
      let apiUrl = args[0];
      const prefix = extra.config?.prefix || '.';

      if (!apiUrl) {
        return extra.reply(
          `🔌 *𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 API Health Checker*\n\n` +
          `Sahi tareeqa istemal karein:\n` +
          `👉 \`${prefix}apicheck https://api.ipify.org?format=json\`\n` +
          `_Kisi bhi valid API URL ka status check karne ke liye dein._`
        );
      }

      if (!apiUrl.startsWith('http')) {
        apiUrl = 'https://' + apiUrl;
      }

      await extra.react('⚡');
      await extra.reply(`⚡ API endpoint check ki ja rahi hai, thora wait karein...`);

      const startTime = Date.now();
      
      // API request bhej kar status aur response time measure karna
      const response = await axios.get(apiUrl, {
        timeout: 12000,
        validateStatus: () => true // Har status code catch karne ke liye
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status;

      let statusEmoji = '🟢';
      let statusText = 'Online & Healthy';

      if (status >= 200 && status < 300) {
        statusEmoji = '🟢';
        statusText = 'Success (OK)';
      } else if (status >= 400 && status < 500) {
        statusEmoji = '🟡';
        statusText = 'Client Error (Check URL/Params)';
      } else if (status >= 500) {
        statusEmoji = '🔴';
        statusText = 'Server Error (API Down)';
      }

      const reportText = `🔌 *𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱 API Health Report*\n\n` +
        `🔗 *Endpoint:* \`${apiUrl}\`\n` +
        `${statusEmoji} *Status Code:* \`${status}\`\n` +
        `📋 *Health:* *${statusText}*\n` +
        `⏱️ *Response Time:* \`${responseTime}ms\`\n\n` +
        `_Aapka API status kamyabi se check kar liya gaya hai!_`;

      await extra.reply(reportText);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD APICHECK] Error:", error.message);
      await extra.react('❌');
      await extra.reply(`❌ API check karne mein nakam rahe. Mumkin hai ke URL ghalat ho ya API timeout ho gayi ho.`);
    }
  }
};
