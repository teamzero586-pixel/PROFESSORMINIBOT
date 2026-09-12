/**
 * Set Welcome - Customize welcome message
 * Saved to this bot's per-number MongoDB config (WELCOME_MESSAGE), the same
 * place `.welcome on/off` and groupevents.js read from.
 */

const { getUserConfigFromMongoDB, updateUserConfigInMongoDB } = require('../../../lib/database');

function getBotNumber(sock) {
  return (sock?.user?.id || '').split(':')[0].split('@')[0];
}

module.exports = {
  name: 'setwelcome',
  aliases: ['welcometext'],
  category: 'group',
  description: 'Set custom welcome message',
  usage: 'setwelcome <message> (use @user for the new member, @group for group name)',
  groupOnly: true,
  adminOnly: true,
  execute: async (sock, msg, args) => {
    const groupId = msg.key.remoteJid;
    try {
      const botNumber = getBotNumber(sock);
      if (!botNumber) {
        return await sock.sendMessage(groupId, { text: '❌ Could not detect bot number.' }, { quoted: msg });
      }

      if (!args.length) {
        const userConfig = await getUserConfigFromMongoDB(botNumber);
        const current = userConfig.WELCOME_MESSAGE || '(default message — not customized yet)';
        return await sock.sendMessage(groupId, {
          text: `📝 *Current Welcome Message*\n\n${current}\n\n*Usage:* .setwelcome <message>\n\n*Tip:* Use @user for the new member, @group for the group name.\n\n*Note:* Welcome messages must also be turned ON with *.welcome on*`
        }, { quoted: msg });
      }

      const welcomeMessage = args.join(' ');
      if (welcomeMessage.length > 500) {
        return await sock.sendMessage(groupId, { text: '❌ Welcome message is too long! Maximum 500 characters.' }, { quoted: msg });
      }

      await updateUserConfigInMongoDB(botNumber, { WELCOME_MESSAGE: welcomeMessage });

      const preview = welcomeMessage.replace(/@user/g, '@' + (msg.key.participant || msg.key.remoteJid).split('@')[0]);
      await sock.sendMessage(groupId, {
        text: `✅ Welcome message updated!\n\n*Preview:*\n${preview}\n\n*Reminder:* run *.welcome on* if you haven't already, or this won't send.`,
        mentions: msg.key.participant ? [msg.key.participant] : []
      }, { quoted: msg });

    } catch (error) {
      console.error('Set Welcome Error:', error.message);
      await sock.sendMessage(groupId, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
  }
};
