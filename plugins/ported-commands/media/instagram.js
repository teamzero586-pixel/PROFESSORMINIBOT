const { igdl } = require("ruhend-scraper");

// Function to extract unique media URLs with simple deduplication
function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    
    for (const media of mediaData) {
        if (!media.url) continue;
        if (!seenUrls.has(media.url)) {
            seenUrls.add(media.url);
            uniqueMedia.push(media);
        }
    }
    return uniqueMedia;
}

async function instagramCommand(sock, chatId, message) {
    try {
        const messageContent = message.message?.ephemeralMessage?.message || message.message?.viewOnceMessage?.message || message.message?.viewOnceMessageV2?.message || message.message;
        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();
        const query = text.replace(/^\.(insta|ig|instagram)\s+/i, '').trim();
        
        if (!query || query.startsWith('.')) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide an Instagram link."
            }, { quoted: message });
        }

        // Check for various Instagram URL formats
        const instagramPatterns = [
            /https?:\/\/(?:www\.)?instagram\.com\//,
            /https?:\/\/(?:www\.)?instagr\.am\//
        ];

        const isValidUrl = instagramPatterns.some(pattern => pattern.test(query));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Invalid Instagram link."
            }, { quoted: message });
        }

        const loadEmojis = ['📥', '⏳', '📸'];
        for (const emoji of loadEmojis) {
            await sock.sendMessage(chatId, { react: { text: emoji, key: message.key } });
        }

        const downloadData = await igdl(query);
        
        if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ No media found. The post might be private or the link is invalid."
            }, { quoted: message });
        }

        const uniqueMedia = extractUniqueMedia(downloadData.data);
        const mediaToDownload = uniqueMedia.slice(0, 5); // Limit to 5 to avoid flooding
        
        for (let i = 0; i < mediaToDownload.length; i++) {
            try {
                const media = mediaToDownload[i];
                const mediaUrl = media.url;
                const isVideo = media.type === 'video' || /\.(mp4|mov|avi|mkv|webm)/i.test(mediaUrl);

                if (isVideo) {
                    await sock.sendMessage(chatId, {
                        video: { url: mediaUrl },
                        caption: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀"
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, {
                        image: { url: mediaUrl },
                        caption: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀"
                    }, { quoted: message });
                }
            } catch (mediaError) {
                console.error(`Media error:`, mediaError.message);
            }
        }

    } catch (error) {
        console.error('Instagram error:', error);
        await sock.sendMessage(chatId, { text: "❌ Error processing Instagram link." }, { quoted: message });
    }
}

module.exports = instagramCommand;
