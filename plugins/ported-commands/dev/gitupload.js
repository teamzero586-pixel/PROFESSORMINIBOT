const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../../../config');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'gitupload',
  category: 'dev',
  description: 'ZIP file ko direct GitHub repository (Public/Private/Empty) par upload aur update karein.',
  usage: `${config.PREFIX}gitupload <repo_url> <github_token>`,
  aliases: ['gitpush', 'pushzip'],
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    let extractPath = null;
    let zipPath = null;

    try {
      await extra.react('⏳');

      if (args.length < 2) {
        return extra.reply(`❌ *Galat Istemal*\n\nUsage: ${this.usage}\n\n*Tareeqa:* Kisi ZIP file par reply karein aur likhein:\n.gitupload <Repo_URL> <Token>`);
      }

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.documentMessage?.contextInfo;
      const quoted = contextInfo?.quotedMessage;

      if (!quoted) {
        return extra.reply(`❌ Bara-e-meherbani kisi ZIP file par reply karein.`);
      }

      const documentMessage = quoted.documentMessage || quoted.documentWithCaptionMessage?.message?.documentMessage;
      if (!documentMessage) {
        return extra.reply(`❌ Jiss message par aapne reply kiya hai woh koi file/document nahi hai.`);
      }

      const fileName = documentMessage.fileName || 'file.zip';
      if (!fileName.toLowerCase().endsWith('.zip')) {
        return extra.reply(`❌ Reply ki gayi file sirf ek .zip archive honi chahiye!`);
      }

      const repoUrlInput = args[0];
      const githubToken = args[1];

      const match = repoUrlInput.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+?)(?:\.git)?$/);
      if (!match) {
        return extra.reply(`❌ Invalid GitHub URL. Example: https://github.com/username/repository`);
      }
      
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');

      await extra.reply(`📥 *${owner}/${repo}* ke liye ZIP file download ki jaa rahi hai...`);

      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      zipPath = path.join(tempDir, `upload_${Date.now()}.zip`);
      extractPath = path.join(tempDir, `extract_${Date.now()}`);

      const fullQuotedMsg = {
        key: {
          remoteJid: extra.from,
          id: contextInfo.stanzaId || msg.key.id,
          participant: contextInfo.participant || extra.from
        },
        message: quoted
      };

      // --- ROBUST MEDIA DOWNLOADER (Fixes Self-Chat & DirectPath errors) ---
      let buffer;
      try {
        buffer = await downloadMediaMessage(fullQuotedMsg, 'buffer', {}, {
          logger: console,
          reconnectMode: ''
        });
      } catch (err) {
        // Fallback method for direct stream/url download if standard downloader fails
        if (documentMessage.url || documentMessage.directPath) {
          const directUrl = documentMessage.url;
          buffer = await new Promise((resolve, reject) => {
            https.get(directUrl, (res) => {
              const chunks = [];
              res.on('data', chunk => chunks.push(chunk));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', err => reject(err));
            });
          });
        } else {
          throw err;
        }
      }

      if (!buffer) {
        return extra.reply(`❌ ZIP file download karne mein masla aaya.`);
      }

      fs.writeFileSync(zipPath, buffer);

      await extra.reply(`📦 ZIP extract ki jaa rahi hai...`);

      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }

      // Real ZIP extraction via adm-zip — handles all standard zip variants
      // (including files written with data descriptors, which a manual
      // byte-parser can't reliably read, e.g. many phone/mobile zip apps).
      const AdmZip = require('adm-zip');
      let files;
      try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);
        files = zip.getEntries()
          .filter(e => !e.isDirectory)
          .map(e => ({
            path: e.entryName.replace(/\\/g, '/'),
            fullPath: path.join(extractPath, e.entryName)
          }));
      } catch (zipErr) {
        throw new Error(`ZIP file corrupt hai ya extract nahi ho saki: ${zipErr.message}`);
      }

      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

      if (files.length === 0) {
        throw new Error(`ZIP file ke andar koi valid files nahi mili.`);
      }

      let filePaths = files.map(f => f.path);
      const firstSegments = filePaths.map(p => p.split('/')[0]);
      const uniqueFirst = [...new Set(firstSegments)];

      if (uniqueFirst.length === 1) {
        const rootFolder = uniqueFirst[0];
        const subPaths = filePaths.map(p => p.substring(rootFolder.length + 1));
        const hasProjectStructure = subPaths.some(
          p => p.startsWith('commands/') || p.startsWith('utils/') || p.startsWith('settings/') || p === 'package.json' || p === 'config.js' || p === 'handler.js'
        );

        if (hasProjectStructure) {
          files.forEach(file => {
            if (file.path.startsWith(rootFolder + '/')) {
              file.path = file.path.substring(rootFolder.length + 1);
            }
          });
        }
      }

      const validFiles = files.filter(file => {
        const p = file.path;
        if (!p) return false;
        const pLower = p.toLowerCase();
        const isBlocked = 
          p.includes('node_modules/') || 
          p.includes('.git/') || 
          p.startsWith('.') || 
          pLower.includes('session') || 
          pLower.includes('auth_info') || 
          pLower.includes('creds.json') || 
          p === 'package-lock.json';
        return !isBlocked;
      });

      function githubRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
          const dataString = data ? JSON.stringify(data) : '';
          const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}${endpoint}`,
            method: method,
            headers: {
              'Authorization': `token ${githubToken}`,
              'User-Agent': 'ProBoy-MD-Bot',
              'Accept': 'application/vnd.github.v3+json',
              ...(data ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(dataString)
              } : {})
            }
          };

          const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
              try {
                const json = responseBody ? JSON.parse(responseBody) : {};
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(json);
                } else {
                  reject(new Error(json.message || `GitHub API Error Status: ${res.statusCode}`));
                }
              } catch (e) {
                reject(new Error(`Invalid JSON response from GitHub: ${responseBody}`));
              }
            });
          });

          req.on('error', (err) => { reject(err); });
          if (dataString) req.write(dataString);
          req.end();
        });
      }

      let defaultBranch = 'main';
      try {
        const repoInfo = await githubRequest('GET', '');
        defaultBranch = repoInfo.default_branch || 'main'; 
      } catch (err) {
        throw new Error(`Repo access nahi hui. URL ya Token galat hai, ya repo exist nahi karti.\nDetails: ${err.message}`);
      }

      let latestCommitSha = null;
      let baseTreeSha = null;
      let isRepoEmpty = false;

      try {
        const refRes = await githubRequest('GET', `/git/ref/heads/${defaultBranch}`);
        latestCommitSha = refRes.object.sha;
        const commitRes = await githubRequest('GET', `/git/commits/${latestCommitSha}`);
        baseTreeSha = commitRes.tree.sha;
      } catch (err) {
        isRepoEmpty = true;
        await extra.reply(`🔍 *Khali (Empty) Repository Detect Hui!*\nBot naya 'main' branch bana kar pehla commit kar raha hai...`);
      }

      if (!isRepoEmpty) {
        await extra.reply(`🚀 GitHub par ${validFiles.length} files update ki jaa rahi hain...\n\n_Note: Rate limit se bachne ke liye thora delay add kiya gaya hai._`);
      }

      const treeItems = [];
      let uploadedCount = 0;

      for (const file of validFiles) {
        const fileContent = fs.readFileSync(file.fullPath);
        const base64Content = fileContent.toString('base64');

        const blobRes = await githubRequest('POST', '/git/blobs', {
          content: base64Content,
          encoding: 'base64'
        });

        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobRes.sha
        });

        uploadedCount++;
        
        if (uploadedCount % 10 === 0) {
          await sleep(2000); 
        } else {
          await sleep(300);  
        }
      }

      const treePayload = { tree: treeItems };
      if (!isRepoEmpty && baseTreeSha) {
        treePayload.base_tree = baseTreeSha;
      }

      const newTreeRes = await githubRequest('POST', '/git/trees', treePayload);
      const newTreeSha = newTreeRes.sha;

      const commitPayload = {
        message: isRepoEmpty ? 'Initial commit via ProBoy-MD Bot' : 'Updated files via ProBoy-MD Bot (.gitupload)',
        tree: newTreeSha
      };
      
      if (!isRepoEmpty && latestCommitSha) {
        commitPayload.parents = [latestCommitSha];
      }

      const newCommitRes = await githubRequest('POST', '/git/commits', commitPayload);
      const newCommitSha = newCommitRes.sha;

      if (isRepoEmpty) {
        await githubRequest('POST', '/git/refs', { 
          ref: `refs/heads/${defaultBranch}`, 
          sha: newCommitSha 
        });
      } else {
        await githubRequest('PATCH', `/git/refs/heads/${defaultBranch}`, { 
          sha: newCommitSha, 
          force: true 
        });
      }

      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

      await extra.react('✅');
      await extra.reply(`✅ *Repository Successfully Updated!* 🎉\n\n🔗 *Repo:* ${owner}/${repo}\n🌿 *Branch:* ${defaultBranch}\n📁 *Uploaded Files:* ${validFiles.length}`);

    } catch (error) {
      console.error('[CMD ERROR] GitUpload:', error.message);
      if (extractPath && fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
      if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

      await extra.react('❌');
      await extra.reply(`❌ GitHub upload fail ho gaya:\n${error.message}`);
    }
  }
};
