const axios = require('axios');

// User ki active temp email store karne ke liye Map
const userEmails = new Map();

module.exports = {
  name: 'tempmail',
  category: 'general',
  description: 'Ek temporary/fake email generate karein, custom email set karein, aur inbox check karein.',
  usage: 'tempmail [create / inbox / change <name>]',
  aliases: ['fakeemail', 'mail'],

  async execute(sock, msg, args, extra) {
    try {
      const action = args[0] ? args[0].toLowerCase() : 'create';
      const param = args[1] ? args[1].toLowerCase() : '';
      const sender = extra.sender;
      const prefix = extra.config?.prefix || '.';

      // 1. CREATE TEMP EMAIL (Random)
      if (action === 'create' || action === 'new') {
        await extra.react('📧');
        await extra.reply('📧 Temporary email generate ki ja rahi hai...');

        // 1secmail free API (No API Key Required)
        const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        const email = res.data[0];

        if (!email) {
          return extra.reply('❌ Email generate nahi ho saki. Dobara try karein.');
        }

        userEmails.set(sender, email);

        const replyText = `*📧 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Temp Mail*\n\n` +
          `✅ *Aapki Temporary Email:*\n\`${email}\`\n\n` +
          `📥 *Inbox check karne ke liye likhein:*\n` +
          `_` + prefix + `tempmail inbox_\n\n` +
          `🔄 *Apni marzi ki email set karne ke liye:*\n` +
          `_` + prefix + `tempmail change <name>_`;

        return extra.reply(replyText);
      }

      // 2. CHANGE / CUSTOM EMAIL
      if (action === 'change') {
        if (!param) {
          return extra.reply(`❌ Apna naam ya prefix likhein!\nExample: ${prefix}tempmail change myname123`);
        }

        // 1secmail ke domains
        const domains = [
          '1secmail.com',
          '1secmail.org',
          '1secmail.net',
          'wwjmp.com',
          'esiix.com',
          'xojxe.com',
          'yopmail.com'
        ];
        // Random domain pick karna
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        const customEmail = `${param.replace(/[^a-zA-Z0-9._]/g, '')}@${randomDomain}`;

        userEmails.set(sender, customEmail);

        const replyText = `*📧 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Custom Temp Mail*\n\n` +
          `✅ *Aapki Custom Email Set Ho Gayi Hai:*\n\`${customEmail}\`\n\n` +
          `📥 *Inbox check karne ke liye likhein:*\n` +
          `_` + prefix + `tempmail inbox_`;

        await extra.react('✅');
        return extra.reply(replyText);
      }

      // 3. CHECK INBOX
      if (action === 'inbox' || action === 'check') {
        let savedEmail = userEmails.get(sender);

        // Agar user ki koi email pehle se save nahi hai, toh auto ek generate kar do
        if (!savedEmail) {
          try {
            const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
            savedEmail = res.data[0];
            userEmails.set(sender, savedEmail);
          } catch (e) {
            return extra.reply(`❌ Pehle ek email banayein!\nType karein: ${prefix}tempmail create`);
          }
        }

        await extra.react('📥');
        await extra.reply(`📥 *${savedEmail}* ka inbox check kiya ja raha hai...`);

        const [username, domain] = savedEmail.split('@');
        const res = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`);
        const messages = res.data;

        if (!messages || messages.length === 0) {
          return extra.reply(`📭 *Inbox Empty*\n\nAapki email (\`${savedEmail}\`) par abhi tak koi message nahi aaya.`);
        }

        // Latest message ki details fetch karna
        const latestId = messages[0].id;
        const msgRes = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${latestId}`);
        const mailData = msgRes.data;

        const inboxText = `*📥 New Message Received!*\n\n` +
          `✉️ *From:* ${mailData.from}\n` +
          `📌 *Subject:* ${mailData.subject}\n` +
          `📅 *Date:* ${mailData.date}\n\n` +
          `📝 *Message Body:*\n${mailData.textBody || mailData.htmlBody || 'No text content'}`;

        await extra.reply(inboxText);
        return extra.react('✅');
      }

      // Invalid action usage
      await extra.reply(`❌ Sahi command use karein!\n\n• ${prefix}tempmail create\n• ${prefix}tempmail change <name>\n• ${prefix}tempmail inbox`);

    } catch (error) {
      console.error("[CMD TEMPMAIL] Error:", error.message);
      await extra.reply(`❌ Temp mail service mein masla aa gaya. Dobara try karein.`);
    }
  }
};
