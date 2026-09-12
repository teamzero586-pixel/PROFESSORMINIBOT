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
// 🎬 YOUTUBE — .yt <url or search query>
// ---------------------------------------------
cmd({
    pattern: "yt",
    alias: ["youtube", "ytdl"],
    react: "🎬",
    desc: "Download YouTube video by URL or search query",
    category: "download",
    use: ".yt <url or search query>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const input = (q || "").trim();
        if (!input) return reply("❌ Please provide a YouTube URL or search query.\nExample: .yt believer imagine dragons");

        const isUrl = /youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\//.test(input);

        let videoUrl = input;
        let searchAuthor = null;
        if (!isUrl) {
            const s = await fetchWithRetry(`https://backend1.tioo.eu.org/yts?q=${encodeURIComponent(input)}`, {}, 3, 15000);
            if (!s.data?.status || !s.data?.videos?.length) return reply("❌ No videos found for your query.");
            videoUrl = s.data.videos[0].url;
            searchAuthor = s.data.videos[0].author?.name || null;
        }

        const d = await fetchWithRetry(`https://backend1.tioo.eu.org/YouTube?url=${encodeURIComponent(videoUrl)}`, {}, 3, 20000);
        if (!d.data?.status || !d.data?.mp4) return reply("❌ Could not extract the video. Try another link.");

        const title = d.data.title || "YouTube Video";
        const author = d.data.author || searchAuthor || "Unknown";

        await conn.sendMessage(from, {
            video: { url: d.data.mp4 },
            mimetype: "video/mp4",
            caption: `🎬 *${title}*\n👤 *Author:* ${author}\n\n${config.BOT_NAME}`
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("YT Error:", e.message);
        reply("❌ Failed to download. " + (e.code === "ECONNABORTED" ? "Request timed out." : e.message));
    }
});

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

// ---------------------------------------------
// 📁 MEDIAFIRE — .mediafire <url>
// ---------------------------------------------
cmd({
    pattern: "mediafire",
    alias: ["mf", "mfdl"],
    react: "📁",
    desc: "Download files from MediaFire",
    category: "download",
    use: ".mediafire <url>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = (q || "").trim();
        if (!url) return reply("❌ Please provide a MediaFire URL.\nExample: .mediafire https://www.mediafire.com/file/xxxx");

        const res = await fetchWithRetry(`https://backend1.tioo.eu.org/MediaFire?url=${encodeURIComponent(url)}`, {}, 3, 20000);
        const data = res.data;
        if (!data?.status || !data?.url) return reply("❌ " + (data?.message || "Invalid MediaFire link."));

        await conn.sendMessage(from, {
            document: { url: data.url },
            fileName: data.filename || "MediaFire_File",
            mimetype: data.mimetype || "application/octet-stream",
            caption: `📁 *MediaFire File*\n📄 *Name:* ${data.filename || "Unknown"}\n📦 *Size:* ${data.filesize || data.filesizeH || "Unknown"}\n\n${config.BOT_NAME}`
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("Mediafire Error:", e.message);
        reply("❌ Failed to download. " + e.message);
    }
});

// ---------------------------------------------
// 📁 GOOGLE DRIVE — .gdrive <url>
// ---------------------------------------------
cmd({
    pattern: "gdrive",
    alias: ["gd", "googledrive"],
    react: "📁",
    desc: "Download public files from Google Drive",
    category: "download",
    use: ".gdrive <url>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = (q || "").trim();
        if (!url) return reply("❌ Please provide a Google Drive URL.");

        const res = await fetchWithRetry(`https://backend1.tioo.eu.org/gdrive?url=${encodeURIComponent(url)}`, {}, 3, 20000);
        const data = res.data;
        if (!data?.success || !data?.data?.downloadUrl) return reply("❌ " + (data?.message || "Invalid Google Drive link."));

        await conn.sendMessage(from, {
            document: { url: data.data.downloadUrl },
            fileName: data.data.filename || "GoogleDrive_File",
            mimetype: "application/octet-stream",
            caption: `📁 *Google Drive File*\n📄 *Name:* ${data.data.filename || "Unknown"}\n📦 *Size:* ${data.data.filesize || "Unknown"}\n\n${config.BOT_NAME}`
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("Gdrive Error:", e.message);
        reply("❌ Failed to download. " + e.message);
    }
});

// ---------------------------------------------
// 📌 PINTEREST — .pinterest <url or search query>
// ---------------------------------------------
cmd({
    pattern: "pinterest",
    alias: ["pin", "pindl"],
    react: "📌",
    desc: "Download images from Pinterest (URL or search)",
    category: "download",
    use: ".pinterest <url or search query>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const input = (q || "").trim();
        if (!input) return reply("❌ Please provide a Pinterest URL or search query.");

        const res = await fetchWithRetry(`https://backend1.tioo.eu.org/pinterest?url=${encodeURIComponent(input)}`, {}, 3, 15000);
        const data = res.data;
        if (!data?.success || !data?.result) return reply("❌ " + (data?.message || "Nothing found."));

        const isUrl = /pin\.it\/|pinterest\.com\/pin\//i.test(input);

        function bestImage(pin) {
            if (pin.image) return pin.image;
            if (pin.images?.orig?.url) return pin.images.orig.url;
            if (pin.images?.original?.url) return pin.images.original.url;
            if (pin.images) {
                for (const size of ['736x','564x','474x','236x','170x','136x','60x60']) {
                    if (pin.images[size]?.url) return pin.images[size].url;
                }
            }
            return null;
        }

        if (isUrl) {
            const img = bestImage(data.result);
            if (!img) return reply("❌ No image found at that link.");
            await conn.sendMessage(from, { image: { url: img }, caption: `📌 *Pinterest*\n\n${config.BOT_NAME}` }, { quoted: fakevCard });
        } else {
            const pins = (data.result.result || []).slice(0, 6);
            if (!pins.length) return reply("❌ No results found.");
            let sent = 0;
            for (const pin of pins) {
                const img = bestImage(pin);
                if (!img) continue;
                await conn.sendMessage(from, { image: { url: img }, caption: `📌 *Pinterest Result ${sent + 1}*\n\n${config.BOT_NAME}` }, { quoted: fakevCard });
                sent++;
                await new Promise(r => setTimeout(r, 500));
            }
            if (!sent) reply("❌ No downloadable images found.");
        }
    } catch (e) {
        console.error("Pinterest Error:", e.message);
        reply("❌ Failed to process. " + e.message);
    }
});

// ---------------------------------------------
// 🎬 CAPCUT — .capcut <template url>
// ---------------------------------------------
cmd({
    pattern: "capcut",
    alias: ["cc", "capcuttemplate"],
    react: "🎬",
    desc: "Download the original video from a CapCut template link",
    category: "download",
    use: ".capcut <url>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const url = (q || "").trim();
        if (!url) return reply("❌ Please provide a CapCut template URL.");

        const res = await fetchWithRetry(`https://backend1.tioo.eu.org/capcut?url=${encodeURIComponent(url)}`, {}, 3, 15000);
        const data = res.data;
        if (!data?.status || data.code !== 200 || !data.originalVideoUrl) return reply("❌ " + (data?.message || "Invalid CapCut link."));

        await conn.sendMessage(from, {
            video: { url: data.originalVideoUrl },
            mimetype: "video/mp4",
            caption: `🎬 *CapCut Template*\n📌 *Title:* ${data.title || "Unknown"}\n👤 *Author:* ${data.authorName || "Unknown"}\n\n${config.BOT_NAME}`
        }, { quoted: fakevCard });
    } catch (e) {
        console.error("Capcut Error:", e.message);
        reply("❌ Failed to download. " + e.message);
    }
});

// ---------------------------------------------
// 🖼️ WALLPAPERS — .wallpapers <search term>
// ---------------------------------------------
cmd({
    pattern: "wallpapers",
    alias: ["wallpaper", "hdwallpaper", "wp"],
    react: "🖼️",
    desc: "Search and download HD wallpapers (up to 6 results)",
    category: "download",
    use: ".wallpapers <search term>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const query = (q || "").trim();
        if (!query) return reply("❌ Please provide a search term.\nExample: .wallpapers sunset");

        const res = await fetchWithRetry(`https://api.princetechn.com/api/search/wallpaper?apikey=prince&query=${encodeURIComponent(query)}`, {}, 3, 15000);
        const data = res.data;
        if (!data?.success || !data?.results?.length) return reply(`❌ No wallpapers found for *${query}*.`);

        const items = data.results.slice(0, 6);
        let sent = 0;
        for (const item of items) {
            const imageUrl = item.image?.[0];
            if (!imageUrl) continue;
            try {
                await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: `🖼️ *Wallpaper* (${item.type || "General"})\n🔍 *Query:* ${query}\n\n${config.BOT_NAME}`
                }, { quoted: fakevCard });
                sent++;
            } catch (_) {}
            await new Promise(r => setTimeout(r, 700));
        }
        if (!sent) reply("❌ Failed to download any wallpapers.");
    } catch (e) {
        console.error("Wallpapers Error:", e.message);
        reply("❌ Unexpected error: " + e.message);
    }
});

// ---------------------------------------------
// 🖼️ GOOGLE IMAGE SEARCH — .img <search term>
// ---------------------------------------------
cmd({
    pattern: "img",
    alias: ["googleimage", "imagesearch"],
    react: "🔍",
    desc: "Search Google Images (up to 6 results)",
    category: "download",
    use: ".img <search term>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        const query = (q || "").trim();
        if (!query) return reply("❌ Please provide a search term.\nExample: .img cute cat");

        const res = await fetchWithRetry(`https://api.princetechn.com/api/search/googleimage?apikey=prince&query=${encodeURIComponent(query)}`, {}, 3, 15000);
        const data = res.data;
        if (!data?.success || !data?.results?.length) return reply(`❌ No images found for *${query}*.`);

        const urls = data.results.slice(0, 6);
        let sent = 0;
        for (const url of urls) {
            try {
                await conn.sendMessage(from, { image: { url }, caption: `🖼️ *Image search:* ${query}\n\n${config.BOT_NAME}` }, { quoted: fakevCard });
                sent++;
            } catch (_) {}
            await new Promise(r => setTimeout(r, 700));
        }
        if (!sent) reply("❌ Failed to download any images.");
    } catch (e) {
        console.error("Img Error:", e.message);
        reply("❌ Unexpected error: " + e.message);
    }
});

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
