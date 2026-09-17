const axios = require('axios');

/**
 * Small collection of one-off API helpers used by a couple of fun/utility
 * commands. Each function throws a clear error on failure — callers already
 * wrap calls in try/catch and show a friendly message.
 */

async function getMeme() {
    // meme-api.com — free, no key required
    const res = await axios.get('https://meme-api.com/gimme', { timeout: 15000 });
    if (!res.data || !res.data.url) throw new Error('No meme returned');
    return {
        url: res.data.url,
        title: res.data.title || 'Meme',
        subreddit: res.data.subreddit || ''
    };
}

async function screenshotWebsite(url) {
    // thum.io — free screenshot service, no key required
    const shotUrl = `https://image.thum.io/get/width/1200/${url}`;
    const res = await axios.get(shotUrl, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(res.data);
}

// ── YouTube audio/video download helpers, used by song.js / video.js.
//    Several free providers are tried in a fallback chain by the caller —
//    each function here just needs to throw on failure so the caller moves
//    on to the next provider. ──

const YT_AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json, text/plain, */*' }
};

async function getEliteProTechDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.success && res?.data?.downloadURL) {
        return { download: res.data.downloadURL, title: res.data.title };
    }
    throw new Error('EliteProTech failed');
}

async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.success && res?.data?.data?.download_url) {
        return { download: res.data.data.download_url, title: res.data.data.title };
    }
    throw new Error('Yupra failed');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.result?.mp3 || res?.data?.result?.url) {
        return { download: res.data.result.mp3 || res.data.result.url, title: res.data.result.title };
    }
    throw new Error('Okatsu failed');
}

async function getIzumiDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://izumiiiii.vercel.app/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.result?.downloadUrl || res?.data?.result?.url) {
        return { download: res.data.result.downloadUrl || res.data.result.url, title: res.data.result.title };
    }
    throw new Error('Izumi failed');
}

async function getEliteProTechVideoByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.success && res?.data?.downloadURL) {
        return { download: res.data.downloadURL, title: res.data.title };
    }
    throw new Error('EliteProTech failed');
}

async function getYupraVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.success && res?.data?.data?.download_url) {
        return { download: res.data.data.download_url, title: res.data.data.title };
    }
    throw new Error('Yupra failed');
}

async function getOkatsuVideoByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(apiUrl, YT_AXIOS_DEFAULTS);
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu failed');
}

module.exports = {
    getMeme,
    screenshotWebsite,
    getEliteProTechDownloadByUrl,
    getYupraDownloadByUrl,
    getOkatsuDownloadByUrl,
    getIzumiDownloadByUrl,
    getEliteProTechVideoByUrl,
    getYupraVideoByUrl,
    getOkatsuVideoByUrl
};
