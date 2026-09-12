module.exports = {
  name: 'calc',
  category: 'general',
  description: 'Koi bhi math ka sawal ya calculation solve karein.',
  usage: 'calc <math expression>',
  aliases: ['calculate', 'math'],

  async execute(sock, msg, args, extra) {
    try {
      const expression = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne expression nahi diya
      if (!expression) {
        return extra.reply(`Usage: ${prefix}${this.usage}\nExample: ${prefix}calc 50 + 25 * 2 _ya_ ${prefix}calc (150 * 20) / 100`);
      }

      await extra.react('🧮');

      // Security check: Sirf numbers, basic operators aur brackets allow karein taake code safe rahe
      const sanitizedExpr = expression.replace(/[^0-9+\-*/().% ]/g, '');

      if (!sanitizedExpr) {
        return extra.reply(`❌ Sahi mathematical expression likhein! (e.g., 25 + 5)`);
      }

      // Safe evaluation using Function constructor
      // Note: Percentage (%) handle karne ke liye replace logic
      let evalExpr = sanitizedExpr.replace(/([0-9.]+)%/g, '($1/100)');
      
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${evalExpr})`)();

      if (result === undefined || isNaN(result)) {
        return extra.reply(`❌ Calculation solve nahi ho saki. Apni expression check karein.`);
      }

      const resultText = `*🧮 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Calculator*\n\n` +
        `📥 *Sawal:* \`${expression}\`\n` +
        `📤 *Jawab:* \`${result}\``;

      await extra.reply(resultText);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD CALC] Error:", error.message);
      await extra.reply(`❌ Math calculation mein error aa gaya. Sahi tareeqay se likhein.`);
    }
  }
};
