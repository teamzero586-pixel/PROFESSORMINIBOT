/**
 * Minimal interactive-button helpers for Baileys.
 * WhatsApp's native button UI is limited/version-sensitive, so both
 * helpers degrade gracefully to a plain text message if the interactive
 * send fails for any reason — the command still delivers its result.
 */

function toNativeFlowButtons(buttons = []) {
    return buttons.map(b => {
        if (b.type === 'copy') {
            return {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({ display_text: b.displayText, copy_code: b.copyCode })
            };
        }
        if (b.type === 'url') {
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({ display_text: b.displayText, url: b.url })
            };
        }
        // default: quick_reply
        return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: b.displayText, id: b.id || b.displayText })
        };
    });
}

async function sendButtons(sock, jid, { text, footer, buttons = [], quoted } = {}) {
    try {
        return await sock.sendMessage(jid, {
            text: text || '',
            footer: footer || '',
            interactiveButtons: toNativeFlowButtons(buttons)
        }, { quoted });
    } catch (e) {
        return await sock.sendMessage(jid, { text: text || '' }, { quoted });
    }
}

async function sendInteractiveMessage(sock, jid, { text, footer, interactiveButtons = [], quoted } = {}) {
    try {
        return await sock.sendMessage(jid, {
            text: text || '',
            footer: footer || '',
            interactiveButtons
        }, { quoted });
    } catch (e) {
        return await sock.sendMessage(jid, { text: text || '' }, { quoted });
    }
}

module.exports = { sendButtons, sendInteractiveMessage };
