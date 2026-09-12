const config = require('../../../config');

// ─── ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 PANEL CONFIG ────────────────────────────────
const TZ_PANEL_URL = "https://teamzeropanel-2414ae86a1c1.herokuapp.com/api";
const TZ_PANEL_SIG = "IPRN-SMS-PANEL-SECURE-2026";
const _tzSessions  = new Map();

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

// 🌍 BOHAT BADI COUNTRY LIST (Har country ke liye Input Mapping)
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

// 🏳️ HAR COUNTRY KA FLAG (Display ke liye)
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
  "Lebanon":"🇱🇧", "Kuwait":"🇰🇼", "Oman":"🇴🇲", "Qatar":"🇶🇦", "Bahrain":"🇧🇭",
  "Unknown":"❓"
};

function _tzResolve(inp) {
  const k = String(inp||"").trim().toLowerCase().replace(/^\+/,"");
  // Agar map mein mili toh wo return karo, warna user ki input ka pehla letter bara kar ke return kardo
  if (_tzCountryMap[k]) return _tzCountryMap[k];
  return inp.trim().charAt(0).toUpperCase() + inp.trim().slice(1).toLowerCase();
}

function _tzExtractOtp(msg) {
  const m = String(msg||"").match(/\b(\d{4,8})\b/);
  return m ? m[1] : "⏳ Pending";
}

function _tzPollSms(num, jid, sock) {
  if (_tzSessions.has(num)) clearInterval(_tzSessions.get(num).iv);
  const seen = new Set(); let tries = 0;
  
  const iv = setInterval(async () => {
    if (++tries > 45) {
      clearInterval(iv); _tzSessions.delete(num);
      await sock.sendMessage(jid, { text: `⏰ *Time Out!*\n\`${num}\` ka SMS 3 minute mein nahi aaya.\nDobara try karo: getnumber` });
      return;
    }
    try {
      const d = await _tzGet(`/sms/by-number?number=${num}`);
      if (d?.sms?.length) {
        for (const s of d.sms) {
          const uid = s.id || s.message;
          if (!seen.has(uid)) {
            seen.add(uid);
            const countryName = s.country || "Unknown";
            const fl = _tzFlags[countryName] || "🏳️";
            await sock.sendMessage(jid, { text:
              `✅ *OTP Received! — ${config.OWNER_NAME}*\n\n` +
              `📱 *Number:* \`${s.number}\`\n` +
              `${fl} *Country:* ${countryName}\n\n` +
              `🔑 *OTP:* \`${_tzExtractOtp(s.message)}\`\n\n` +
              `💬 *Full Message:*\n${s.message}\n\n` +
              `_Powered by ${config.OWNER_NAME} 🇵🇰_`
            });
          }
        }
      }
    } catch(_) {}
  }, 4000);
  _tzSessions.set(num, { jid, iv });
}

// ─── MAIN LOGIC FUNCTION ─────────────────────────────────────
// Ise alag kar diya hai taake Prefix aur Bina Prefix dono mein ek hi logic chale
async function handleGetNumberPanel(arg, sock, extra) {
  try {
    await extra.react('⏳');

    const data = await _tzGet("/numbers");
    if (!data?.success || !data.numbers?.length) {
      await extra.react('❌');
      return extra.reply("⚠️ Panel se numbers nahi mile. Baad mein try karo.");
    }

    // Agar direct command di jaye bina country ke
    if (!arg) {
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
      txt += `\n━━━━━━━━━━━━━━━━━\nLikhne ka tarika: *getnumber pakistan* ya *getnumber pk*`;
      
      await extra.react('✅');
      return extra.reply(txt);
    }

    // Country Check
    const country = _tzResolve(arg);
    const avail = data.numbers.filter(n => (n.country || "").toLowerCase() === country.toLowerCase() && !n.claimed);
    
    if (!avail.length) {
      await extra.react('😔');
      const fl = _tzFlags[country] || "🏳️";
      return extra.reply(`😔 *${fl} ${country}* mein abhi free numbers nahi hain.\nBaad mein doosra try karo.`);
    }

    // Number Selection
    const picked = avail[Math.floor(Math.random()*avail.length)];
    const numClean = picked.number.replace(/[\s\-\+]/g,"");
    const pickedCountry = picked.country || country;
    const finalFlag = _tzFlags[pickedCountry] || "🏳️";

    await extra.reply(
      `✅ *${finalFlag} ${pickedCountry} Number Mila!*\n\n` +
      `📱 *Number:* \`${picked.number}\`\n\n` +
      `⏳ *OTP auto-forward on hai...*\n_3 minute mein milega_\n\n` +
      `_${config.OWNER_NAME} 🇵🇰_`
    );
    
    await extra.react('✅');
    
    // OTP Polling Start
    _tzPollSms(numClean, extra.from, sock);

  } catch (error) {
    await extra.react('❌');
    await extra.reply(`❌ Error: ${error.message}`);
  }
}

// ─── PROBOY-MD COMMAND EXPORT ────────────────────────────────
module.exports = {
  name: 'getnumber',
  aliases: ['vnum', 'number'],
  category: 'utility',
  description: `${config.OWNER_NAME} Panel se Virtual Number aur OTP hasil karein (Bina prefix ke bhi chalta hai).`,
  usage: `getnumber [country]`,

  // 1. Agar koi Prefix laga kar chalaye (.getnumber)
  async execute(sock, msg, args, extra) {
    const arg = args.join(' ').trim();
    await handleGetNumberPanel(arg, sock, extra);
  },

  // 2. Agar koi BINA Prefix ke chalaye (Sirf 'getnumber' likhe)
  async autoRun(sock, msg, extra) {
    // Message ka text extract karna
    const body = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || 
                 msg.message?.imageMessage?.caption || 
                 "";
                 
    const text = body.trim().toLowerCase();
    
    // Bot ke current prefix ko safely lena taake crash na ho
    const prefix = config.PREFIX || ".";
    
    // Agar message already prefix se shuru ho raha hai, toh ignore karo (Kyunke execute function usay handle kar lega)
    if (text.startsWith(prefix)) return;

    // Agar text 'getnumber' se shuru hota hai (Bina kisi prefix ke)
    if (text.startsWith('getnumber')) {
      const arg = text.replace('getnumber', '').trim();
      await handleGetNumberPanel(arg, sock, extra);
    }
  }
};
