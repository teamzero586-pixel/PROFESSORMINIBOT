const { cmd } = require('../arslan')
// Baileys ka native downloader import kar rahe hain taake download fail na ho
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')

cmd({
    pattern: "vv",
    alias: ["viewonce", "view", "open"],
    react: "😎",
    desc: "Retrieve view-once media (Owner only)",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, isCreator, reply }) => {
    try {
        // Sirf owner ke liye check
        if (!isCreator) {
            return reply("*❌ YEH COMMAND SIRF BOT OWNER KE LIYE HAI 😎*")
        }

        // Check agar kisi message ko reply nahi kiya gaya
        if (!m.quoted) {
            return reply(
                "*🥺 KISI VIEW ONCE PHOTO / VIDEO / AUDIO KO REPLY KARO*\n\n" +
                "*Phir likho:* `.vv`\n\n" +
                "*Phir dekho kamal 😎*"
            )
        }

        // Original quoted message ka data nikalna
        let msg = m.quoted.message
        if (!msg) return reply("*❌ Quoted message ka data nahi mila.*")

        // 🔥 VIEW ONCE FIX: Alag alag types ke view once messages ko handle karna
        let viewOnceMsg = 
            msg.viewOnceMessageV2?.message || 
            msg.viewOnceMessage?.message || 
            msg.viewOnceMessageV2Extension?.message || 
            msg

        // Media ki type check karna (image, video, ya audio)
        const type = Object.keys(viewOnceMsg)[0]
        
        if (type !== "imageMessage" && type !== "videoMessage" && type !== "audioMessage") {
            return reply("*❌ YEH VIEW ONCE MEDIA SUPPORT NAHI KARTA 🥺 (Sirf Image/Video/Audio support hai)*")
        }

        // Media message ka actual data (keys, url waghera)
        let mediaMessage = viewOnceMsg[type]
        
        // Baileys ke native function se stream download karna (sab se safe tareeqa)
        let streamType = type.replace('Message', '') // 'imageMessage' ban jayega 'image'
        const stream = await downloadContentFromMessage(mediaMessage, streamType)
        
        // Stream ko buffer mein convert karna
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }

        // Caption nikalna (agar view once ke sath text likha ho)
        let caption = mediaMessage.caption || ""

        // Media bhejny ki taiyari
        let content = {}

        if (type === "imageMessage") {
            content = {
                image: buffer,
                caption: `*😎 VIEW ONCE OPENED*\n\n*Caption:* ${caption}`
            }
        } 
        else if (type === "videoMessage") {
            content = {
                video: buffer,
                caption: `*😎 VIEW ONCE OPENED*\n\n*Caption:* ${caption}`
            }
        } 
        else if (type === "audioMessage") {
            content = {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: true // Isko true kiya hai taake voice note ki tarah play ho
            }
        }

        // Wapas send karna
        await conn.sendMessage(from, content, { quoted: mek })

    } catch (e) {
        console.error("VV ERROR:", e.message)
        reply(`*❌ VIEW ONCE OPEN KARNE ME ERROR AYA 🥺*\n\n*Waja:* ${e.message}`)
    }
})
