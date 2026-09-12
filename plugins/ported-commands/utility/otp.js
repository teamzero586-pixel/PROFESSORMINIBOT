const config = require('../../../config');

// ═══════════════════════════════════════════════════════════
// ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 PANEL CONFIG & GLOBAL VARIABLES
// ═══════════════════════════════════════════════════════════
const TZ_PANEL_URL = "https://teamzeropanel-2414ae86a1c1.herokuapp.com/api";
const TZ_PANEL_SIG = "IPRN-SMS-PANEL-SECURE-2026";

// 🔥 Yeh hai naya Multi-User System! Har user ka apna alag data save hoga.
const userSessions = new Map();

function getUserConfig(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      newsletter: "", 
      offlink: "", 
      numlink: "", 
      dev: `${config.OWNER_NAME} 🇵🇰`,
      running: false, 
      interval: null, 
      seenIds: new Set(),
      msgCounter: 1
    });
  }
  return userSessions.get(userId);
}

async function _tzGet(ep) {
  try {
    const r = await fetch(`${TZ_PANEL_URL}${ep}`, {
      headers: { "x-app-request-signature": TZ_PANEL_SIG },
      signal: AbortSignal.timeout(10000)
    });
    return await r.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 🌍 MASSIVE COUNTRY MAPPING
const _tzCountryMap = {
  pk:"Pakistan", pakistan:"Pakistan", "92":"Pakistan",
  in:"India", india:"India", "91":"India",
  id:"Indonesia", indonesia:"Indonesia", "62":"Indonesia",
  bd:"Bangladesh", bangladesh:"Bangladesh", "880":"Bangladesh",
  ng:"Nigeria", nigeria:"Nigeria", "234":"Nigeria",
  us:"United States", "united states":"United States", "1":"United States", usa:"United States",
  gb:"United Kingdom", uk:"United Kingdom", "united kingdom":"United Kingdom", "44":"United Kingdom",
  ru:"Russia", russia:"Russia", "7":"Russia",
  vn:"Vietnam", vietnam:"Vietnam", "84":"Vietnam",
  ph:"Philippines", philippines:"Philippines", "63":"Philippines",
  ke:"Kenya", kenya:"Kenya", "254":"Kenya",
  gh:"Ghana", ghana:"Ghana", "233":"Ghana",
  np:"Nepal", nepal:"Nepal", "977":"Nepal",
  lk:"Sri Lanka", "sri lanka":"Sri Lanka", "94":"Sri Lanka",
  mm:"Myanmar", myanmar:"Myanmar", "95":"Myanmar",
  th:"Thailand", thailand:"Thailand", "66":"Thailand",
  my:"Malaysia", malaysia:"Malaysia", "60":"Malaysia",
  uz:"Uzbekistan", uzbekistan:"Uzbekistan", "998":"Uzbekistan",
  ua:"Ukraine", ukraine:"Ukraine", "380":"Ukraine",
  mx:"Mexico", mexico:"Mexico", "52":"Mexico",
  br:"Brazil", brazil:"Brazil", "55":"Brazil",
  za:"South Africa", "south africa":"South Africa", "27":"South Africa",
  cn:"China", china:"China", "86":"China",
  jp:"Japan", japan:"Japan", "81":"Japan",
  kr:"South Korea", korea:"South Korea", "82":"South Korea",
  de:"Germany", germany:"Germany", "49":"Germany",
  fr:"France", france:"France", "33":"France",
  it:"Italy", italy:"Italy", "39":"Italy",
  es:"Spain", spain:"Spain", "34":"Spain",
  ca:"Canada", canada:"Canada",
  au:"Australia", australia:"Australia", "61":"Australia",
  ar:"Argentina", argentina:"Argentina", "54":"Argentina",
  co:"Colombia", colombia:"Colombia", "57":"Colombia",
  eg:"Egypt", egypt:"Egypt", "20":"Egypt",
  sa:"Saudi Arabia", "saudi arabia":"Saudi Arabia", "966":"Saudi Arabia",
  ae:"UAE", "united arab emirates":"UAE", "971":"UAE",
  tr:"Turkey", turkey:"Turkey", "90":"Turkey",
  ir:"Iran", iran:"Iran", "98":"Iran",
  iq:"Iraq", iraq:"Iraq", "964":"Iraq",
  ma:"Morocco", morocco:"Morocco", "212":"Morocco",
  dz:"Algeria", algeria:"Algeria", "213":"Algeria",
  kz:"Kazakhstan", kazakhstan:"Kazakhstan", "77":"Kazakhstan",
  nl:"Netherlands", netherlands:"Netherlands", "31":"Netherlands",
  se:"Sweden", sweden:"Sweden", "46":"Sweden",
  ch:"Switzerland", switzerland:"Switzerland", "41":"Switzerland",
  pl:"Poland", poland:"Poland", "48":"Poland",
  mz:"Mozambique", mozambique:"Mozambique", "258":"Mozambique",
  zw:"Zimbabwe", zimbabwe:"Zimbabwe", "263":"Zimbabwe",
  ve:"Venezuela", venezuela:"Venezuela", "58":"Venezuela",
  af:"Afghanistan", afghanistan:"Afghanistan", "93":"Afghanistan",
  bf:"Burkina Faso", "burkina faso":"Burkina Faso", "226":"Burkina Faso",
  tj:"Tajikistan", tajikistan:"Tajikistan", "992":"Tajikistan",
  ht:"Haiti", haiti:"Haiti", "509":"Haiti",
  sy:"Syria", syria:"Syria", "963":"Syria",
  jo:"Jordan", jordan:"Jordan", "962":"Jordan",
  lb:"Lebanon", lebanon:"Lebanon", "961":"Lebanon",
  kw:"Kuwait", kuwait:"Kuwait", "965":"Kuwait",
  om:"Oman", oman:"Oman", "968":"Oman",
  qa:"Qatar", qatar:"Qatar", "974":"Qatar",
  bh:"Bahrain", bahrain:"Bahrain", "973":"Bahrain"
};

// 🏳️ ALL COUNTRY FLAGS
const _tzFlags = {
  "Pakistan":"🇵🇰", "India":"🇮🇳", "Indonesia":"🇮🇩", "Bangladesh":"🇧🇩", "Nigeria":"🇳🇬",
  "United States":"🇺🇸", "United Kingdom":"🇬🇧", "Russia":"🇷🇺", "Ukraine":"🇺🇦",
  "Vietnam":"🇻🇳", "Philippines":"🇵🇭", "Kenya":"🇰🇪", "Ghana":"🇬🇭",
  "Nepal":"🇳🇵", "Sri Lanka":"🇱🇰", "Myanmar":"🇲🇲", "Thailand":"🇹🇭", "Malaysia":"🇲🇾",
  "Uzbekistan":"🇺🇿", "Mexico":"🇲🇽", "Brazil":"🇧🇷", "South Africa":"🇿🇦",
  "China":"🇨🇳", "Japan":"🇯🇵", "South Korea":"🇰🇷", "Germany":"🇩🇪", "France":"🇫🇷",
  "Italy":"🇮🇹", "Spain":"🇪🇸", "Canada":"🇨🇦", "Australia":"🇦🇺", "Argentina":"🇦🇷",
  "Colombia":"🇨🇴", "Egypt":"🇪🇬", "Saudi Arabia":"🇸🇦", "UAE":"🇦🇪", "Turkey":"🇹🇷",
  "Iran":"🇮🇷", "Iraq":"🇮🇶", "Morocco":"🇲🇦", "Algeria":"🇩🇿", "Kazakhstan":"🇰🇿",
  "Netherlands":"🇳🇱", "Sweden":"🇸🇪", "Switzerland":"🇨🇭", "Poland":"🇵🇱",
  "Mozambique":"🇲🇿", "Zimbabwe":"🇿🇼", "Venezuela":"🇻🇪", "Afghanistan":"🇦🇫",
  "Burkina Faso":"🇧🇫", "Tajikistan":"🇹🇯", "Haiti":"🇭🇹", "Syria":"🇸🇾", "Jordan":"🇯🇴",
  "Lebanon":"🇱🇧", "Kuwait":"🇰🇼", "Oman":"🇴🇲", "Qatar":"🇶🇦", "Bahrain":"🇧🇭", "Unknown":"❓"
};

function _tzResolve(inp) {
  const k = String(inp||"").trim().toLowerCase().replace(/^\+/,"");
  if (_tzCountryMap[k]) return _tzCountryMap[k];
  return inp.trim().charAt(0).toUpperCase() + inp.trim().slice(1).toLowerCase();
}

function _tzExtractOtp(msg) {
  if (!msg) return "N/A";
  const mHyphen = msg.match(/\b(\d{3}-\d{3})\b/);
  if (mHyphen) return mHyphen[1];
  const mDigits = msg.match(/\b(\d{4,8})\b/);
  if (mDigits) return mDigits[1];
  return "N/A";
}

function _tzDetectService(msg) {
  const txt = String(msg || "").toLowerCase();
  if (txt.includes("whatsapp")) return "WhatsApp";
  if (txt.includes("telegram")) return "Telegram";
  if (txt.includes("facebook")) return "Facebook";
  if (txt.includes("google")) return "Google";
  if (txt.includes("imo")) return "IMO";
  if (txt.includes("tiktok")) return "TikTok";
  if (txt.includes("instagram")) return "Instagram";
  if (txt.includes("twitter") || txt.includes("x.com")) return "X / Twitter";
  if (txt.includes("viber")) return "Viber";
  if (txt.includes("snapchat")) return "Snapchat";
  return "WhatsApp"; // Default
}

function _tzMaskNumber(num) {
  const s = String(num || "").replace(/[^\d]/g, "");
  if (s.length <= 7) return s;
  return `${s.slice(0, 4)}•••${s.slice(-4)}`;
}

function _tzGetFormattedTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ═══════════════════════════════════════════════════════════
// PROBOY-MD COMMAND EXPORT
// ═══════════════════════════════════════════════════════════
module.exports = {
  name: 'otp',
  category: 'utility',
  description: `${config.OWNER_NAME} Panel se OTP Forwarding aur Traffic check karein.`,
  usage: `${config.PREFIX}otp <command>`,

  async execute(sock, msg, args, extra) {
    try {
      const userId = msg.key.participant || msg.key.remoteJid;
      const userCfg = getUserConfig(userId);

      const sub = (args[0] || "").toLowerCase();
      const val = args.slice(1).join(" ").trim();
      const send = (txt) => extra.reply(txt);

      // ─── .otp set <newsletter_jid> ───
      if (sub === "set") {
        if (!val) return send(`❌ *Usage:* ${config.PREFIX}otp set <newsletter_jid>`);
        userCfg.newsletter = val;
        await extra.react('✅');
        return send(`✅ *Apka Apna Newsletter Set Ho Gaya!*\n📢 JID: \`${val}\`\n\nAb *${config.PREFIX}otp start* kar dein!`);
      }

      // ─── .otp offlink <url> ───
      if (sub === "offlink") {
        if (!val) return send(`❌ *Usage:* ${config.PREFIX}otp offlink <url>`);
        userCfg.offlink = val;
        await extra.react('🔗');
        return send(`✅ *Apka Official Channel Link Set!*\n🔗 ${val}`);
      }

      // ─── .otp numlink <url> ───
      if (sub === "numlink") {
        if (!val) return send(`❌ *Usage:* ${config.PREFIX}otp numlink <url>`);
        userCfg.numlink = val;
        await extra.react('🔗');
        return send(`✅ *Apka Numbers Channel Link Set!*\n🔗 ${val}`);
      }

      // ─── .otp dev <brand_name> ───
      if (sub === "dev") {
        if (!val) return send(`❌ *Usage:* ${config.PREFIX}otp dev <brand_name>`);
        userCfg.dev = val;
        await extra.react('🏷️');
        return send(`✅ *Apka Brand Tag Set!*\n🏷️ ${userCfg.dev}`);
      }
      
      // ─── .otp checknum (Check Available Numbers) ───
      if (sub === "checknum") {
        await extra.react('📊');
        const data = await _tzGet("/numbers");
        
        if (!data?.success || !data.numbers?.length) {
          return send("⚠️ Panel se numbers nahi mile. Data khali hai.");
        }

        const counts = {};
        for (const n of data.numbers) {
          const cName = n.country || "Unknown";
          counts[cName] = (counts[cName] || 0) + 1;
        }
        
        const rows = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
        
        let txt = `🌍 *${config.OWNER_NAME} — Virtual Numbers*\n━━━━━━━━━━━━━━━━━\n📊 Total: ${data.numbers.length} | Countries: ${rows.length}\n\n`;
        for (const [c, n] of rows) {
          const flag = _tzFlags[c] || "🏳️"; 
          txt += `${flag} *${c}*: ${n}\n`;
        }
        txt += `\n━━━━━━━━━━━━━━━━━\n> _Powered by ${userCfg.dev}_`;
        
        return send(txt);
      }

      // ─── .otp traffic (Check Last 10 OTPs) ───
      if (sub === "traffic") {
        await extra.react('🚦');
        const d = await _tzGet("/sms");
        const list = d?.sms || d?.otps || [];
        
        if (!list.length) return send("⚠️ Abhi koi OTP traffic nahi aa rahi.");
        
        // Sirf akhri 10 messages uthao
        const recent = list.slice(0, 10);
        let txt = `🚦 *RECENT OTP TRAFFIC (Last 10)* 🚦\n━━━━━━━━━━━━━━━━━\n\n`;
        
        recent.forEach((s, i) => {
           const rawNum = String(s.number || "").replace(/[^\d]/g, "");
           const maskedNum = _tzMaskNumber(rawNum);
           const countryName = _tzResolve(s.country || "") || s.country || "Unknown";
           const flag = _tzFlags[countryName] || "🏳️";
           const serviceName = _tzDetectService(s.message);
           
           txt += `*${i+1}.* ${flag} *${countryName}* | 📱 *${serviceName}*\n   └ Num: ${maskedNum}\n\n`;
        });
        
        txt += `━━━━━━━━━━━━━━━━━\n> _Powered by ${userCfg.dev}_`;
        return send(txt);
      }

      // ─── .otp download <country> ───
      if (sub === "download") {
        if (!val) return send(`❌ *Usage:* ${config.PREFIX}otp download <country>`);
        await extra.react('⏳');
        await send(`⏳ Fetching ${val} numbers...`);
        
        try {
          const data = await _tzGet("/numbers");
          const country = _tzResolve(val);
          const nums = (data?.numbers||[]).filter(n=>(n.country||"").toLowerCase()===country.toLowerCase());
          
          if (!nums.length) {
            await extra.react('😔');
            return send(`😔 ${country} ke numbers nahi mile.`);
          }
          
          const lines = nums.map(n => n.number).join("\n");
          await send(`📥 *${_tzFlags[country] || "🏳️"} ${country} Numbers (${nums.length})*\n\n\`\`\`\n${lines}\n\`\`\`\n\n_Powered by ${userCfg.dev}_`);
          
          try {
            await sock.sendMessage(extra.from, {
              document: Buffer.from(`# ${country} Numbers\n\n${lines}\n`, "utf8"),
              mimetype: "text/plain",
              fileName: `${country.replace(/\s+/g,"_")}_numbers.txt`
            });
            await extra.react('✅');
          } catch(_) {}
        } catch(e) { 
          await extra.react('❌');
          send(`❌ Error: ${e.message}`); 
        }
        return;
      }

      // ─── .otp start (Auto Forwarding for specific user) ───
      if (sub === "start") {
        if (!userCfg.newsletter) return send(`❌ Pehle apna newsletter set karo: ${config.PREFIX}otp set <jid>`);
        if (userCfg.running) return send(`⚠️ Aapka forwarder pehle se chal raha hai! Stop karne ke liye: ${config.PREFIX}otp stop`);
        
        userCfg.running = true;
        userCfg.seenIds = new Set();
        
        userCfg.interval = setInterval(async () => {
          if (!userCfg.running) return;
          try {
            const d = await _tzGet("/sms");
            const list = d?.sms || d?.otps || [];
            
            for (const s of list) {
              const uid = s.id || `${s.number}:${(s.message||"").slice(0,40)}`;
              if (userCfg.seenIds.has(uid)) continue;
              userCfg.seenIds.add(uid);
              
              if (userCfg.seenIds.size > 500) {
                const a = Array.from(userCfg.seenIds);
                userCfg.seenIds = new Set(a.slice(200));
              }
              
              const rawNum = String(s.number || "").replace(/[^\d]/g, "");
              const maskedNum = _tzMaskNumber(rawNum);
              const countryName = _tzResolve(s.country || "") || s.country || "Unknown";
              const flag = _tzFlags[countryName] || "🏳️";
              const serviceName = _tzDetectService(s.message);
              const otpCode = _tzExtractOtp(s.message);
              const currentTime = _tzGetFormattedTime();

              let formattedMsg = `✨ *${flag} | ${rawNum} Message ${userCfg.msgCounter++}* ⚡\n\n`;
              formattedMsg += `> *Time:* ${currentTime}\n`;
              formattedMsg += `> *Country:* ${flag} ${countryName}\n`;
              formattedMsg += `   *Number:* *${maskedNum}*\n`;
              formattedMsg += `> *Service:* ${serviceName}\n`;
              formattedMsg += `   *OTP:* *${otpCode}*\n\n`;

              if (userCfg.offlink || userCfg.numlink) {
                formattedMsg += `> *Join For Numbers:*\n`;
                if (userCfg.offlink) formattedMsg += `> 1 ${userCfg.offlink}\n`;
                if (userCfg.numlink) formattedMsg += `> 2 ${userCfg.numlink}\n`;
                formattedMsg += `\n`;
              }

              formattedMsg += `*Full Message:*\n# \n${s.message || ""}\n\n`;
              formattedMsg += `> Developed by ${userCfg.dev}`;

              try { await sock.sendMessage(userCfg.newsletter, { text: formattedMsg }); } catch(_) {}
            }
          } catch(_) {}
        }, 4000);
        
        await extra.react('🟢');
        return send(`✅ *Aapka VIP OTP Engine Start Ho Gaya!*\n📢 Forwarding to your channel: \`${userCfg.newsletter}\`\n\nBand karne ke liye: *${config.PREFIX}otp stop*`);
      }

      // ─── .otp stop ───
      if (sub === "stop") {
        if (!userCfg.running) return send(`⚠️ Aapka Forwarder pehle se band hai.`);
        
        userCfg.running = false;
        if (userCfg.interval) { 
          clearInterval(userCfg.interval); 
          userCfg.interval = null; 
        }
        
        await extra.react('🔴');
        return send(`🛑 *Aapka VIP OTP Engine Stopped!*\nOTP aana band ho gayi hain.`);
      }

      // ─── .otp (VIP MAZA MENU FOR THE USER) ───
      await extra.react('⚡');
      let vipMenu = `⚡ *${config.OWNER_NAME} — OTP FORWARDER (PERSONAL)* ⚡\n`;
      vipMenu += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      vipMenu += `👤 *User ID:* \`${userId.split('@')[0]}\`\n`;
      vipMenu += `⚙️ *STATUS:* ${userCfg.running ? "🟢 *ACTIVE & FORWARDING*" : "🔴 *STOPPED*"}\n`;
      vipMenu += `📢 *NEWSLETTER:* \`${userCfg.newsletter || "Not Set"}\`\n`;
      vipMenu += `🔗 *OFFICIAL LINK:* ${userCfg.offlink || "Not Set"}\n`;
      vipMenu += `🔢 *NUMBERS LINK:* ${userCfg.numlink || "Not Set"}\n`;
      vipMenu += `🏷️ *BRAND TAG:* ${userCfg.dev}\n\n`;
      vipMenu += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      vipMenu += `📜 *COMMANDS MENU:*\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp checknum*\n   └ Check Available Numbers by Country\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp traffic*\n   └ Check Last 10 Live OTPs Traffic\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp set <jid>*\n   └ Set WhatsApp Newsletter JID\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp offlink <url>*\n   └ Set Official Channel Link\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp numlink <url>*\n   └ Set Numbers Channel Link\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp dev <brand>*\n   └ Set Custom Brand Tag\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp download <country>*\n   └ Download Country Numbers TXT File\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp start*\n   └ Launch Auto-Forwarding\n\n`;
      vipMenu += `🔹 *${config.PREFIX}otp stop*\n   └ Stop Auto-Forwarding\n\n`;
      vipMenu += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      vipMenu += `> Developed by ${userCfg.dev}`;

      return send(vipMenu);

    } catch (error) {
      await extra.react('❌');
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
