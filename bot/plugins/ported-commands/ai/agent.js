const axios = require('axios');

module.exports = {
  name: 'agent',
  category: 'ai',
  description: 'Autonomous AI Agent jo complex multi-step tasks ko plan aur execute kare.',
  usage: 'agent <task ya goal ki tafseel>',
  aliases: ['aiagent', 'taskagent', 'autonomous'],

  async execute(sock, msg, args, extra) {
    try {
      const task = args.join(' ');
      const prefix = extra.config?.prefix || '.';

      // Agar user ne task nahi diya
      if (!task) {
        return extra.reply(
          `*🤖 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 AI Agent*\n\n` +
          `Sahi tareeqa:\n` +
          `\`${prefix}agent Ek naya WhatsApp sticker command feature design aur code karo jo error handling ke sath ho\`\n\n` +
          `_Apna complex task ya goal tafseel se likhein._`
        );
      }

      await extra.react('🧠');
      await extra.reply('🧠 AI Agent task analyze kar raha hai aur multi-step execution plan bana raha hai...');

      // Autonomous Agent System Prompt
      const agentPrompt = `You are an autonomous senior AI Agent. Your job is to break down the given complex task into logical steps, reason through them, and execute/provide the final comprehensive solution. 
      
Task: ${task}

Provide your response in this format:
1. **Agent Objective & Breakdown** (Steps to achieve the goal)
2. **Execution & Logic** (Step-by-step processing)
3. **Final Result / Code / Output**`;

      // Free Pollinations AI API request
      const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(agentPrompt)}`;
      const response = await axios.get(apiUrl, { timeout: 60000 });
      
      const agentOutput = response.data;

      if (!agentOutput) {
        return extra.reply(`❌ AI Agent task complete nahi kar saka. Task ko thora clear kar ke dobara try karein.`);
      }

      const formattedReply = `*🧠 ⤹ꜛ𝑃𝑅𝜣𝐹𝛯𝑺𝑺𝜣𝑅²⁹𓂃🐼🎀 Autonomous Agent*\n\n` +
        `🎯 *Task:* ${task}\n\n` +
        `${agentOutput}`;

      await extra.reply(formattedReply);
      await extra.react('✅');

    } catch (error) {
      console.error("[CMD AGENT] Error:", error.message);
      await extra.reply(`❌ AI Agent execution mein timeout ya masla aa gaya. Dobara try karein.`);
    }
  }
};
