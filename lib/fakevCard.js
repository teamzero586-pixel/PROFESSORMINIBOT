const config = require('../config');

// Used as the `{ quoted: fakevCard }` context on several replies (.menu,
// .alive, etc.) purely to give them a styled quote-card look.
//
// The previous version of this vCard was labeled FN:Meta / ORG:META AI with
// a real phone number attached — meaning every one of those replies looked
// like it was quoting/coming from the real Meta AI WhatsApp account. That's
// impersonating a real company's identity to borrow false legitimacy, not
// ordinary branding, so it's fixed to honestly represent this bot instead.
module.exports = {
    fakevCard: {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast"
        },
        message: {
            contactMessage: {
                displayName: config.BOT_NAME || "𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.BOT_NAME || "𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱"}\nORG:${config.OWNER_NAME || "𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹ 𓂃 𝛭𝐷  🇦🇱"};\nEND:VCARD`
            }
        }
    }
};
