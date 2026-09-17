// ============================================================
// 🆕 NEW MEDIA COMMANDS — converted from uploaded media pack
// into this bot's own cmd() plugin format so they actually load
// and run (the originals used a different bot's plugin loader).
// ============================================================
const axios = require("axios");
const { cmd } = require("../arslan");
const { fakevCard } = require("../lib/fakevCard");
const config = require("../config");

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'okhttp/4.9.3'
];

async function fetchWithRetry(url, options = {}, maxRetries = 3, timeout = 15000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
      const response = await axios.get(url, {
        timeout,
        headers: { 'User-Agent': userAgent, ...(options.headers || {}) },
        ...options
      });
      return response;
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
    }
  }
  throw lastError;
}

// ---------------------------------------------
// (.yt moved to plugins/ported-commands/media/yt.js — this file used to
// register a duplicate .yt here too. Because plugins/new-media.js loads
// before the ported-commands loader, THIS weaker version — a single API
// with no ytdl-core/fallback chain — was silently winning every time,
// making the more robust fix in yt.js completely unreachable.)
// ---------------------------------------------

// ---------------------------------------------
// 📸 INSTAGRAM (extra fallback engines) — .igdl5 / .igdl6 / .igdl7
// (main .igdl / .igdl2 / .igdl4 already exist in plugins/ig-dl.js —
// these are additional fallback APIs, useful when one provider is down)
// ---------------------------------------------
cmd({
    pattern: "igdl5",
    alias: ["instasave", "igsave"],
    react: "📸",
    desc: "Download Instagram photos/reels/videos (multi-media, fallback engine 5)",
    category: "download",
    use: ".igdl5 <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !/instagram\.com|instagr\.am/.test(url)) return reply("❌ Please provide a valid Instagram link.");

        const { igdl } = require("ruhend-scraper");
        const result = await igdl(url);
        if (!result?.data?.length) return reply("❌ No media found. Post might be private or link invalid.");

        const seen = new Set();
        const unique = result.data.filter(x => x.url && !seen.has(x.url) && seen.add(x.url)).slice(0, 5);

        for (const media of unique) {
            const isVideo = media.type === "video" || /\.(mp4|mov|mkv|webm)/i.test(media.url);
            await conn.sendMessage(from, {
                [isVideo ? "video" : "image"]: { url: media.url },
                caption: `📸 *Instagram Downloader*\n\n${config.BOT_NAME}`
            }, { quoted: fakevCard });
        }
    } catch (e) {
        console.error("IGDL5 Error:", e.message);
        reply("❌ Failed to download. Try .igdl or .igdl2 instead.");
    }
});

cmd({
    pattern: "igdl6",
    alias: ["igtio"],
    react: "📸",
    desc: "Download Instagram video (fallback engine 6)",
    category: "download",
    use: ".igdl6 <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url || !/instagram\.com|instagr\.am/.test(url)) return reply("❌ Please provide a valid Instagram link.");

        const res = await fetchWithRetry(`https://backend1.tioo.eu.org/igdl?url=${encodeURIComponent(url)}`, {}, 3, 15000);
        const data = res.data;
        if (!Array.isArray(data) || !data.length || !data[0]?.url) return reply("❌ No media found at that link.");

        await conn.sendMessage(from, {
            video: { url: data[0].url },
            mimetype: "video/mp4",
            caption: `📸 *Instagram Downloader*\n\n${config.BOT_NAME}`
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("IGDL6 Error:", e.message);
        reply("❌ Failed to download. Try .igdl or .igdl5 instead.");
    }
});

cmd({
    pattern: "igdl7",
    alias: ["igvreden"],
    react: "📸",
    desc: "Download Instagram photo/video (fallback engine 7)",
    category: "download",
    use: ".igdl7 <Instagram URL>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = q || m.quoted?.text;
        if (!url) return reply("❌ Please provide a valid Instagram link.");

        const res = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(url)}`, { timeout: 15000 });
        if (!res.data?.status || !res.data.result?.length) return reply("❌ No media found. Make sure the link is public.");

        for (const item of res.data.result) {
            await conn.sendMessage(from, {
                [item.type === "video" ? "video" : "image"]: { url: item.url },
                caption: `📸 *Instagram Downloader*\n\n${config.BOT_NAME}`
            }, { quoted: fakevCard });
        }
    } catch (e) {
        console.error("IGDL7 Error:", e.message);
        reply("❌ Failed to download. Try .igdl or .igdl5 instead.");
    }
});

// ---------------------------------------------
// 📘 FACEBOOK HD — .fbhd <url> [hd]
// (plugins/fb.js already has .fb — this is an HD-capable alternative)
// ---------------------------------------------
cmd({
    pattern: "fbhd",
    alias: ["facebook2", "fbdl2"],
    react: "📘",
    desc: "Download Facebook video (supports HD quality)",
    category: "download",
    use: ".fbhd <url> [hd]",
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {
    try {
        const url = args[0];
        if (!url) return reply("❌ Please provide a Facebook video URL.\nExample: .fbhd https://fb.watch/xxxx hd");

        const wantHD = (args.slice(1).join(" ").trim().toLowerCase() === "hd");
        const res = await fetchWithRetry(`https://backend1.tioo.eu.org/fbdown?url=${encodeURIComponent(url)}`, {}, 3, 15000);
        const data = res.data;
        if (!data?.status) return reply("❌ Failed to fetch this video. Check the link.");

        let videoUrl = wantHD ? (data.HD || data.hd || data.Normal_video || data.normal_video)
                               : (data.Normal_video || data.normal_video || data.HD || data.hd);
        if (!videoUrl) return reply("❌ No downloadable video found at that link.");

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: "video/mp4",
            caption: `📘 *Facebook Video*\n\n${config.BOT_NAME}`
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("FBHD Error:", e.message);
        reply("❌ Failed to download. Try .fb instead.");
    }
});

// (.mediafire moved to plugins/ported-commands/media/mediafire.js — was duplicated here)

// (.gdrive moved to plugins/ported-commands/media/gdrive.js — was duplicated here)

// (.pinterest moved to plugins/ported-commands/media/pinterest.js — was duplicated here)

// (.capcut moved to plugins/ported-commands/media/capcut.js — was duplicated here)

// (.wallpapers moved to plugins/ported-commands/media/wallpapers.js — was duplicated here)

// (.img moved to plugins/ported-commands/media/img.js — was duplicated here)

// ---------------------------------------------
// 📱 APK DOWNLOAD (alt engine) — .apk2 <app name>
// (plugins/apk.js already has .apk — this is an alternative engine)
// ---------------------------------------------
cmd({
    pattern: "apk2",
    alias: ["apkdownload2", "getapk2"],
    react: "📱",
    desc: "Download an Android APK by app name (alternative engine)",
    category: "download",
    use: ".apk2 <app name>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const appName = (q || "").trim();
        if (!appName) return reply("❌ Please provide an app name.\nExample: .apk2 WhatsApp");

        const info = await fetchWithRetry(`https://api.princetechn.com/api/download/apkdl?apikey=prince&appName=${encodeURIComponent(appName)}`, {}, 3, 15000);
        if (!info.data?.success || !info.data?.result) return reply(`❌ No APK found for *${appName}*.`);

        const { appname, appicon, developer, download_url } = info.data.result;
        if (!download_url) return reply(`❌ Download URL not available for *${appname}*.`);

        await reply(`📥 Downloading *${appname}*, please wait...`);

        const apkRes = await fetchWithRetry(download_url, { responseType: "arraybuffer" }, 2, 60000);
        const apkBuffer = Buffer.from(apkRes.data);

        const messageOptions = {
            document: apkBuffer,
            fileName: `${appname.replace(/[^a-zA-Z0-9]/g, "_")}.apk`,
            mimetype: "application/vnd.android.package-archive",
            caption: `📱 *${appname}*\n👤 *Developer:* ${developer || "Unknown"}\n\n${config.BOT_NAME}`
        };

        if (appicon) {
            try {
                const iconRes = await axios.get(appicon, { responseType: "arraybuffer", timeout: 10000 });
                messageOptions.thumbnail = Buffer.from(iconRes.data);
            } catch (_) {}
        }

        await conn.sendMessage(from, messageOptions, { quoted: fakevCard });
    } catch (e) {
        console.error("Apk2 Error:", e.message);
        reply("❌ Failed to download. Try .apk instead.");
    }
});
