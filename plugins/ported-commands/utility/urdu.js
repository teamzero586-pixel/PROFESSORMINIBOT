const { translate } = require('@vitalets/google-translate-api');

module.exports = {
    name: 'urdu',
    alias: ['tr', 'ru'], // 'translate' hata diya gaya hai taake conflict na ho
    category: 'utility',
    desc: 'Translate any quoted message to Urdu',
    use: '<reply to a message>',
    
    async execute(client, msg, args) {
        try {
            // Check karna ke user ne kisi message ko reply (quote) kiya hai ya nahi
            const isQuoted = msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo.quotedMessage;
            
            if (!isQuoted) {
                return await client.sendMessage(msg.from, { 
                    text: '⚠️ Bhai, pehle kisi message ko reply (quote) karo aur phir `.urdu`, `.tr` ya `.ru` likho!' 
                }, { quoted: msg });
            }

            // Quoted message ka text nikalna
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const textToTranslate = quotedMsg.conversation || 
                                    quotedMsg.extendedTextMessage?.text || 
                                    quotedMsg.imageMessage?.caption || 
                                    quotedMsg.videoMessage?.caption;

            if (!textToTranslate) {
                return await client.sendMessage(msg.from, { 
                    text: '⚠️ Quoted message mein koi text nahi hai jisko translate kiya jaye!' 
                }, { quoted: msg });
            }

            // Wait message
            await client.sendMessage(msg.from, { 
                text: '⏳ *TEAM-ZERO* message translate kar raha hai...' 
            }, { quoted: msg });

            // Urdu ('ur') mein translate karna
            const result = await translate(textToTranslate, { to: 'ur' });

            const replyText = `*TEAM-ZERO TRANSLATOR* 🌐\n\n` +
                              `*Original Zabaan:* ${result.raw.src || 'Auto'}\n` +
                              `*Tarjuma:*\n${result.text}`;

            await client.sendMessage(msg.from, { 
                text: replyText 
            }, { quoted: msg });

        } catch (error) {
            console.error("Translate Command Error: ", error.message);
            await client.sendMessage(msg.from, { 
                text: '⚠️ Error aa gaya! Shayad translation server busy hai.' 
            }, { quoted: msg });
        }
    }
};
