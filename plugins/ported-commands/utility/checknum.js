module.exports = {
  name: 'checknum',
  category: 'utility',
  description: 'Check if a WhatsApp number is valid/unbanned or not registered.',
  usage: 'checknum 923123456789',
  aliases: ['numcheck', 'isban', 'whatsappcheck'],

  async execute(sock, msg, args, extra) {
    try {
      // 1. Check if user provided a number or replied to someone
      let targetNumber = args[0];
      
      if (!targetNumber && msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetNumber = msg.message.extendedTextMessage.contextInfo.participant.split('@')[0];
      }

      if (!targetNumber) {
        const prefix = extra.config?.prefix || '.';
        return extra.reply(
          `⚠️ *Khadim-e-Zero-MD Notice*\n\n` +
          `Sahi tareeqa istemal karein:\n` +
          `👉 \`${prefix}checknum 923001234567\`\n` +
          `_Ya kisi ke message ko reply kar ke yeh command chalayein._`
        );
      }

      // 2. Clean the number (Remove +, spaces, dashes)
      targetNumber = targetNumber.replace(/[^0-9]/g, '');

      if (targetNumber.length < 10) {
        return extra.reply(`❌ Mukammal aur sahi country code ke sath number likhein (e.g., 923XXXXXXXXX).`);
      }

      await extra.react('🔍');

      const jid = `${targetNumber}@s.whatsapp.net`;

      // 3. Check WhatsApp registration status via Baileys socket
      const [result] = await sock.onWhatsApp(jid);

      if (result && result.exists) {
        await extra.react('✅');
        return extra.reply(
          `✅ *WhatsApp Number Status Report*\n\n` +
          `📱 *Number:* \`+${targetNumber}\`\n` +
          `🟢 *Status:* *Active / Unban (Registered)*\n` +
          `🔗 *JID:* \`${result.jid}\`\n\n` +
          `_Yeh number WhatsApp par maujood aur active hai._`
        );
      } else {
        await extra.react('❌');
        return extra.reply(
          `❌ *WhatsApp Number Status Report*\n\n` +
          `📱 *Number:* \`+${targetNumber}\`\n` +
          `🔴 *Status:* *Banned / Not Registered / Invalid*\n\n` +
          `_Yeh number WhatsApp par registered nahi hai ya ban ho chuka hai._`
        );
      }

    } catch (error) {
      console.error("[CMD CHECKNUM] Error:", error.message);
      await extra.react('⚠️');
      await extra.reply(`❌ Number check karne mein koi technical kharabi aa gayi hai.`);
    }
  }
};
