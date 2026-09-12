/**
 * Set Goodbye - Customize goodbye message
 * Saved to this bot's per-number MongoDB config (GOODBYE_MESSAGE), the same
 * place `.goodbye on/off` and groupevents.js read from — so this actually
 * takes effect. (Previously called db.getGroupSettings/updateGroupSettings,
 * functions that don't exist in lib/database.js — every use of this command
 * just crashed.)
 */

const { getUserConfigFromMongoDB, updateUserConfigInMongoDB } = require('../../../lib/database');

function getBotNumber(sock) {
  return (sock?.user?.id || '').split(':')[0].split('@')[0];
}

module.exports = {
  name: 'setgoodbye',
  aliases: ['goodbyetext'],
  category: 'group',
  description: 'Set custom goodbye message',
  usage: 'setgoodbye <message> (use @user for the member who left, @group for group name)',
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
        const current = userConfig.GOODBYE_MESSAGE || '(default message — not customized yet)';
        return await sock.sendMessage(groupId, {
          text: `📝 *Current Goodbye Message*\n\n${current}\n\n*Usage:* .setgoodbye <message>\n\n*Tip:* Use @user for the member who left, @group for the group name.\n\n*Note:* Goodbye messages must also be turned ON with *.goodbye on*`
        }, { quoted: msg });
      }

      const goodbyeMessage = args.join(' ');
      if (goodbyeMessage.length > 500) {
        return await sock.sendMessage(groupId, { text: '❌ Goodbye message is too long! Maximum 500 characters.' }, { quoted: msg });
      }

      await updateUserConfigInMongoDB(botNumber, { GOODBYE_MESSAGE: goodbyeMessage });

      const preview = goodbyeMessage.replace(/@user/g, '@' + (msg.key.participant || msg.key.remoteJid).split('@')[0]);
      await sock.sendMessage(groupId, {
        text: `✅ Goodbye message updated!\n\n*Preview:*\n${preview}\n\n*Reminder:* run *.goodbye on* if you haven't already, or this won't send.`,
        mentions: msg.key.participant ? [msg.key.participant] : []
      }, { quoted: msg });

    } catch (error) {
      console.error('Set Goodbye Error:', error.message);
      await sock.sendMessage(groupId, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
  }
};
