import TelegramBot from "node-telegram-bot-api";

const BOT_TOKEN = "8723944751:AAHEYNnVHqN6H7ljtDcAP6K17f7G5zYl0FI";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ── Welcome message on /start ──────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "there";
  bot.sendMessage(
    chatId,
    `⚡ *Welcome to Imperium OS, ${name}!*\n\nI'm your personal AI assistant from the Imperium OS app.\n\nYou can:\n• Ask me anything 🤖\n• Log transactions (e.g. "spent $12 on lunch")\n• Request insights ("how am I doing this week?")\n• Get motivation and habit tips\n\nJust type a message to get started!`,
    { parse_mode: "Markdown" }
  );
});

// ── Help command ───────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `*Imperium OS Bot — Commands*\n\n/start — Welcome message\n/help — Show this menu\n/app — Open Imperium OS web app\n\n*Or just chat naturally:*\n• "log $50 groceries"\n• "how am I doing?"\n• "motivate me"\n• Ask anything!`,
    { parse_mode: "Markdown" }
  );
});

// ── App link command ───────────────────────────────────
bot.onText(/\/app/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `📱 *Open Imperium OS*\n\nYour full dashboard is at:\nhttps://s1business84-hub.github.io/IMPERIUM.OS\n\nAll your data, insights, and AI tools — in one place.`,
    { parse_mode: "Markdown" }
  );
});

// ── Main message handler ───────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  // Ignore commands (handled above)
  if (!userText || userText.startsWith("/")) return;

  // Typing indicator
  bot.sendChatAction(chatId, "typing");

  // ── Transaction log shortcut ─────────────────────────
  const txMatch = userText.match(
    /(?:spent|paid|bought|logged?|added?)\s+\$?([\d.]+)\s+(?:on\s+)?(.+)/i
  );
  if (txMatch) {
    const amount = parseFloat(txMatch[1]).toFixed(2);
    const category = txMatch[2].trim();
    bot.sendMessage(
      chatId,
      `✅ Got it! I've noted:\n💸 *$${amount}* — ${category}\n\nOpen the app to sync it to your dashboard:\nhttps://s1business84-hub.github.io/IMPERIUM.OS`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // ── Motivation shortcut ──────────────────────────────
  if (/motivat|inspire|boost|hype/i.test(userText)) {
    const quotes = [
    `🔥 *\u201cThe pain you feel today is the strength you feel tomorrow.\u201d*\nKeep going, Imperium awaits.`,
    `⚡ *\u201cDiscipline is choosing between what you want now and what you want most.\u201d*\nYou've got this.`,
    `💎 *\u201cSmall daily improvements over time lead to stunning results.\u201d*\nOne step at a time.`,
    `🚀 *\u201cSuccess is the sum of small efforts, repeated day in and day out.\u201d*\nYou're building something real.`,
  ];
    const pick = quotes[Math.floor(Math.random() * quotes.length)];
    bot.sendMessage(chatId, pick, { parse_mode: "Markdown" });
    return;
  }

  // ── Default AI-style response ────────────────────────
  const response = `⚡ *Imperium AI*\n\nYou said: "${userText}"\n\nFor full AI-powered responses, analysis, and your personal dashboard, open the app:\nhttps://s1business84-hub.github.io/IMPERIUM.OS\n\n_Tip: Type /help to see what I can do here._`;

  bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
});

// ── Error handling ────────────────────────────────────
bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message);
});

console.log("✅ ImperiumOSBot is running — @ImperiumOSBot");
