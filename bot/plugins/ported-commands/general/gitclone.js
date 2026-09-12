const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'gitclone',
  category: 'general',
  description: 'Kisi bhi public GitHub repository ka link dein, bot saari files download kar ke zip file mein bhej dega.',
  usage: 'gitclone <GitHub Repository URL>',
  aliases: ['clone', 'githubzip'],

  async execute(sock, msg, args, extra) {
    try {
      const repoUrl = args[0];
      const prefix = extra.config?.prefix || '.';

      // Agar user ne link nahi diya
      if (!repoUrl) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}gitclone https://github.com/proboy315/ProBoy-MD`);
      }

      // GitHub URL format validate karna aur owner/repo extract karna
      const regex = /github\.com\/([^\/]+)\/([^\/]+)/i;
      const match = repoUrl.match(regex);

      if (!match) {
        return extra.reply(`❌ Sahi GitHub repository link dein!\nExample: ${prefix}gitclone https://github.com/proboy315/ProBoy-MD`);
      }

      const owner = match[1];
      // Repository naam se aakhri trailing slash ya .git hata dena
      const repo = match[2].replace(/\.git$/, '').replace(/\/$/, '');

      await extra.react('📦');
      await extra.reply(`📦 GitHub Repository (*${owner}/${repo}*) download aur zip ki ja rahi hai, thora wait karein...`);

      // GitHub ki default branch (main/master) ki zip archive ka direct URL
      // GitHub khud automatically repo ko zip bana kar deta hai bina git install kiye!
      const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
      const masterZipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;

      let downloadUrl = zipUrl;
      let response;

      try {
        // Pehle main branch try karenge
        response = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'arraybuffer',
          validateStatus: (status) => status === 200
        });
      } catch (err) {
        // Agar main branch na mile toh master branch try karenge
        try {
          downloadUrl = masterZipUrl;
          response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'arraybuffer',
            validateStatus: (status) => status === 200
          });
        } catch (innerErr) {
          return extra.reply(`❌ Repository download nahi ho saki. Check karein ke link public hai ya branch (main/master) mojood hai.`);
        }
      }

      // Temporary folder check aur create karna
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `${repo}_source.zip`;
      const filePath = path.join(tempDir, fileName);

      // File system par zip save karein
      fs.writeFileSync(filePath, response.data);

      const captionText = `*📦 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Git Cloner*\n\n` +
        `📂 *Repo:* ${owner}/${repo}\n` +
        `✅ Zip archive successfully generate ho gaya hai!`;

      // WhatsApp par document (zip) send karein
      await sock.sendMessage(
        msg.key.remoteJid,
        { 
          document: { url: filePath }, 
          mimetype: 'application/zip', 
          fileName: fileName,
          caption: captionText
        },
        { quoted: msg }
      );

      // RAM/Storage optimize karne ke liye temporary file delete kar dein
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await extra.react('✅');

    } catch (error) {
      console.error("[CMD GITCLONE] Error:", error.message);
      await extra.reply(`❌ Git clone karte waqt error aa gaya. Link dobara check karein.`);
    }
  }
};
