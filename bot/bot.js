import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

dotenv.config();

// ─────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────
const TOKEN          = process.env.TELEGRAM_TOKEN || "8723944751:AAHEYNnVHqN6H7ljtDcAP6K17f7G5zYl0FI";
const OLLAMA_URL     = process.env.OLLAMA_URL  || "http://localhost:11434";
const OLLAMA_MODEL   = process.env.OLLAMA_MODEL || "llama3";
const WHISPER_MODEL  = process.env.WHISPER_MODEL || "whisper";
const APP_URL        = "https://s1business84-hub.github.io/IMPERIUM.OS";
const TEMP_DIR       = os.tmpdir();

const bot = new TelegramBot(TOKEN, { polling: true });

// ─────────────────────────────────────────────────────
//  MEMORY  —  userId → { history[], plan, tasks[], focus, name }
// ─────────────────────────────────────────────────────
const memory = new Map();

function getUser(userId) {
  if (!memory.has(userId)) {
    memory.set(userId, {
      history:  [],    // [{ role, content }]
      plan:     null,
      tasks:    [],
      focus:    null,
      name:     null,
      voiceLog: [],    // [{ ts, transcript }] — all voice messages stored
    });
  }
  return memory.get(userId);
}

function pushHistory(userId, role, content) {
  const user = getUser(userId);
  user.history.push({ role, content });
  if (user.history.length > 40) user.history.splice(0, 2);
}

// ─────────────────────────────────────────────────────
//  SYSTEM PROMPT  —  injected before every AI call
// ─────────────────────────────────────────────────────
function buildSystemPrompt(userId) {
  const user = getUser(userId);
  let ctx = `You are Imperium AI — a high-performance personal operator built into the Imperium OS app.
You act like a sharp, direct, science-backed coach. You do NOT give generic advice.
You know the user's context and use it. You challenge, guide, and optimise.
Keep replies concise (max 3-4 short paragraphs) and actionable.`;
  if (user.name)         ctx += `\nUser's name: ${user.name}.`;
  if (user.focus)        ctx += `\nUser's current FOCUS: "${user.focus}" — weave this into advice when relevant.`;
  if (user.plan)         ctx += `\nUser's active PLAN:\n${user.plan}`;
  if (user.tasks.length) ctx += `\nUser's TASK LIST:\n${user.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
  return ctx;
}

// ─────────────────────────────────────────────────────
//  OLLAMA AI CALL
// ─────────────────────────────────────────────────────
async function getAIResponse(userId, userInput) {
  const user = getUser(userId);
  const messages = [
    { role: "system", content: buildSystemPrompt(userId) },
    ...user.history,
    { role: "user", content: userInput },
  ];
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.message?.content || data.response || null;
  } catch (err) {
    console.error("Ollama error:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────
//  HELPER — send Markdown, fallback to plain text
// ─────────────────────────────────────────────────────
async function reply(chatId, text, opts = {}) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown", ...opts });
  } catch {
    await bot.sendMessage(chatId, text.replace(/[*_`[\]]/g, ""), opts);
  }
}

// ─────────────────────────────────────────────────────
//  /start
// ─────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const name = msg.from.first_name || "there";
  getUser(userId).name = name;
  reply(msg.chat.id,
    `⚡ *Welcome to Imperium, ${name}.*\n\nI'm your high-performance AI operator.\nI remember your context, track your goals, and give science-backed guidance.\n\n*Commands:*\n/plan — set your strategy\n/focus — lock in one priority\n/tasks — view task list\n/add [task] — add a task\n/done [#] — complete a task\n/voice — view voice log\n/status — see all your context\n/clear — wipe memory\n/app — open your dashboard\n/help — full guide\n\nOr just *talk to me* — text or 🎙 *voice note.* I transcribe, store, and respond.`);
});

// ─────────────────────────────────────────────────────
//  /help
// ─────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  reply(msg.chat.id,
    `*Imperium AI — Command Guide*\n\n⚡ */plan [text]* — set your current plan\n🎯 */focus [text]* — lock in one priority\n✅ */tasks* — view task list\n➕ */add [task]* — add a task\n✔️ */done [#]* — mark task complete\n🎙 */voice* — view your voice log\n📊 */status* — see all context\n🗑 */clear* — reset memory\n📱 */app* — open dashboard\n\n_Text or voice note — I transcribe, store, and respond to both._`);
});

// ─────────────────────────────────────────────────────
//  /app
// ─────────────────────────────────────────────────────
bot.onText(/\/app/, (msg) => {
  reply(msg.chat.id,
    `📱 *Imperium OS Dashboard*\n\n${APP_URL}\n\nCheck-ins, insights, spending tracker, full AI analysis.`);
});

// ─────────────────────────────────────────────────────
//  /plan
// ─────────────────────────────────────────────────────
bot.onText(/\/plan(.*)/, async (msg, match) => {
  const userId = msg.from.id;
  const user = getUser(userId);
  const input = match[1].trim();
  if (!input) {
    reply(msg.chat.id, user.plan
      ? `📋 *Your current plan:*\n\n${user.plan}\n\n_Use /plan [new plan] to update._`
      : `📋 *Set your plan:*\nUse: \`/plan [describe your goal or strategy]\``);
    return;
  }
  user.plan = input;
  bot.sendChatAction(msg.chat.id, "typing");
  const aiComment = await getAIResponse(userId, `My plan: "${input}". Give a sharp 2-sentence assessment and one tweak.`);
  pushHistory(userId, "user", `My plan: ${input}`);
  if (aiComment) pushHistory(userId, "assistant", aiComment);
  reply(msg.chat.id,
    `✅ *Plan locked:*\n_${input}_\n\n${aiComment || "Plan saved. I'll inject this context into every response."}`);
});

// ─────────────────────────────────────────────────────
//  /focus
// ─────────────────────────────────────────────────────
bot.onText(/\/focus(.*)/, async (msg, match) => {
  const userId = msg.from.id;
  const user = getUser(userId);
  const input = match[1].trim();
  if (!input) {
    reply(msg.chat.id, user.focus
      ? `🎯 *Current focus:* ${user.focus}\n\n_Use /focus [new] to change._`
      : `🎯 *Set your focus:*\nUse: \`/focus [one thing to stay locked on]\``);
    return;
  }
  user.focus = input;
  bot.sendChatAction(msg.chat.id, "typing");
  const aiComment = await getAIResponse(userId, `I'm locking my focus on: "${input}". Give one sharp sentence on why this matters and one concrete first action for the next 30 minutes.`);
  pushHistory(userId, "user", `Focus: ${input}`);
  if (aiComment) pushHistory(userId, "assistant", aiComment);
  reply(msg.chat.id,
    `🎯 *Focus locked:*\n_${input}_\n\n${aiComment || "Focus set. I'll keep this front of mind."}`);
});

// ─────────────────────────────────────────────────────
//  /tasks
// ─────────────────────────────────────────────────────
bot.onText(/\/tasks$/, (msg) => {
  const user = getUser(msg.from.id);
  if (!user.tasks.length) {
    reply(msg.chat.id, `✅ *No tasks yet.*\n\nUse \`/add [task]\` to add one.`);
    return;
  }
  const list = user.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n");
  reply(msg.chat.id, `✅ *Your tasks:*\n\n${list}\n\n_/done [#] to complete · /add [task] to add more_`);
});

// ─────────────────────────────────────────────────────
//  /add
// ─────────────────────────────────────────────────────
bot.onText(/\/add (.+)/, (msg, match) => {
  const user = getUser(msg.from.id);
  const task = match[1].trim();
  user.tasks.push(task);
  reply(msg.chat.id, `➕ Added: *${task}*\n\n${user.tasks.length} task${user.tasks.length > 1 ? "s" : ""} in queue. /tasks to view.`);
});

// ─────────────────────────────────────────────────────
//  /done
// ─────────────────────────────────────────────────────
bot.onText(/\/done (\d+)/, (msg, match) => {
  const user = getUser(msg.from.id);
  const idx = parseInt(match[1]) - 1;
  if (idx < 0 || idx >= user.tasks.length) {
    reply(msg.chat.id, `❌ Task #${idx + 1} not found. Use /tasks to see your list.`);
    return;
  }
  const done = user.tasks.splice(idx, 1)[0];
  reply(msg.chat.id, `✔️ Done: *${done}*\n\n${user.tasks.length} task${user.tasks.length !== 1 ? "s" : ""} remaining.`);
});

// ─────────────────────────────────────────────────────
//  /status
// ─────────────────────────────────────────────────────
bot.onText(/\/status/, (msg) => {
  const user = getUser(msg.from.id);
  let out = `📊 *Your Imperium Context*\n\n`;
  out += user.focus ? `🎯 *Focus:* ${user.focus}\n` : `🎯 *Focus:* not set\n`;
  out += user.plan  ? `📋 *Plan:* ${user.plan}\n`   : `📋 *Plan:* not set\n`;
  if (user.tasks.length) {
    out += `\n✅ *Tasks (${user.tasks.length}):*\n${user.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
  } else {
    out += `✅ *Tasks:* none`;
  }
  out += `\n\n💬 *Conversation:* ${Math.floor(user.history.length / 2)} exchanges`;
  out += `\n🎙 *Voice notes stored:* ${user.voiceLog.length}`;
  reply(msg.chat.id, out);
});

// ─────────────────────────────────────────────────────
//  /clear
// ─────────────────────────────────────────────────────
bot.onText(/\/clear/, (msg) => {
  const userId = msg.from.id;
  const name = getUser(userId).name;
  memory.delete(userId);
  getUser(userId).name = name;
  reply(msg.chat.id, `🗑 Memory cleared. Fresh start, ${name || "operator"}.`);
});

// ─────────────────────────────────────────────────────
//  SCIENCE FALLBACKS — when Ollama is offline
// ─────────────────────────────────────────────────────
const SCIENCE = [
  "Research: naming your next action (time + place) makes you 2–3× more likely to execute. What's your next concrete step?",
  "Peak cognitive performance hits 2–4 hrs after waking. Are you protecting that window?",
  "66 reps physically rewires a habit circuit in your brain. Where are you in the rep count?",
  "A 20-min walk spikes BDNF — your brain's growth fertiliser — for 4 hours. Moved today?",
  "Writing a goal down increases achievement probability by 42%. Is yours written?",
  "Cold exposure raises dopamine 2.5× baseline for hours — more stable than caffeine.",
];

function buildFallback(userId) {
  const user = getUser(userId);
  let out = `⚡ *Imperium AI* _(AI offline — context mode)_\n\n`;
  if (user.focus) out += `🎯 *Your focus:* ${user.focus}\n\n`;
  out += SCIENCE[Math.floor(Math.random() * SCIENCE.length)];
  if (user.tasks.length) out += `\n\n*Next task:* ${user.tasks[0]}`;
  out += `\n\n_Full AI back when Ollama is running: \`ollama run llama3\`_`;
  return out;
}

// ─────────────────────────────────────────────────────
//  VOICE TRANSCRIPTION via Ollama whisper
// ─────────────────────────────────────────────────────
async function transcribeVoice(fileId) {
  // 1. Get file path from Telegram
  const fileInfo = await bot.getFile(fileId);
  const fileUrl  = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

  // 2. Download .oga file
  const ogaPath = path.join(TEMP_DIR, `voice_${fileId}.oga`);
  const wavPath = path.join(TEMP_DIR, `voice_${fileId}.wav`);

  const dlRes  = await fetch(fileUrl);
  const buffer = await dlRes.arrayBuffer();
  fs.writeFileSync(ogaPath, Buffer.from(buffer));

  // 3. Convert .oga → .wav using ffmpeg
  execSync(`ffmpeg -y -i "${ogaPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}" 2>/dev/null`);

  // 4. Read wav as base64
  const wavBase64 = fs.readFileSync(wavPath).toString("base64");

  // 5. Send to Ollama whisper
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model:  WHISPER_MODEL,
      prompt: "",
      images: [wavBase64],   // Ollama whisper accepts audio as base64 image field
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  // 6. Clean up temp files
  try { fs.unlinkSync(ogaPath); fs.unlinkSync(wavPath); } catch {}

  if (!res.ok) throw new Error(`Whisper HTTP ${res.status}`);
  const data = await res.json();
  return (data.response || "").trim();
}

// ─────────────────────────────────────────────────────
//  /voice — show stored voice log
// ─────────────────────────────────────────────────────
bot.onText(/\/voice/, (msg) => {
  const user = getUser(msg.from.id);
  if (!user.voiceLog.length) {
    reply(msg.chat.id, `🎙 *No voice messages stored yet.*\n\nSend me a voice note — I'll transcribe, store, and respond to it.`);
    return;
  }
  const log = user.voiceLog
    .slice(-10)  // last 10
    .map((v, i) => `${i + 1}. _${new Date(v.ts).toLocaleTimeString()}_ — ${v.transcript}`)
    .join("\n\n");
  reply(msg.chat.id, `🎙 *Your voice log (last ${Math.min(user.voiceLog.length, 10)}):*\n\n${log}`);
});

// ─────────────────────────────────────────────────────
//  VOICE MESSAGE HANDLER
// ─────────────────────────────────────────────────────
bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user   = getUser(userId);
  if (!user.name && msg.from.first_name) user.name = msg.from.first_name;

  bot.sendChatAction(chatId, "typing");
  reply(chatId, `🎙 _Transcribing your voice note..._`);

  let transcript;
  try {
    transcript = await transcribeVoice(msg.voice.file_id);
  } catch (err) {
    console.error("Whisper error:", err.message);
    // Fallback: ask user to type it
    reply(chatId, `⚠️ *Couldn't transcribe voice note.*\n\nMake sure Ollama whisper is pulled:\n\`ollama pull whisper\`\n\nOr just type your message instead.`);
    return;
  }

  if (!transcript) {
    reply(chatId, `⚠️ Got empty transcript. Try speaking more clearly or typing instead.`);
    return;
  }

  // Store in voice log
  user.voiceLog.push({ ts: Date.now(), transcript });
  if (user.voiceLog.length > 50) user.voiceLog.shift(); // keep last 50

  // Echo transcript back
  reply(chatId, `🎙 *Heard:* _"${transcript}"_\n\n_Thinking..._`);

  // Feed transcript into AI with full context
  bot.sendChatAction(chatId, "typing");
  pushHistory(userId, "user", transcript);
  const aiReply = await getAIResponse(userId, transcript);

  if (aiReply) {
    pushHistory(userId, "assistant", aiReply);
    reply(chatId, aiReply);
  } else {
    reply(chatId, buildFallback(userId));
  }
});

// ─────────────────────────────────────────────────────
//  MAIN MESSAGE HANDLER
// ─────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text   = msg.text;
  if (!text || text.startsWith("/")) return;

  const user = getUser(userId);
  if (!user.name && msg.from.first_name) user.name = msg.from.first_name;

  // Transaction shortcut
  const txMatch = text.match(/(?:spent|paid|bought|logged?|added?)\s+\$?([\d.]+)\s+(?:on\s+)?(.+)/i);
  if (txMatch) {
    const amount   = parseFloat(txMatch[1]).toFixed(2);
    const category = txMatch[2].trim();
    pushHistory(userId, "user", text);
    pushHistory(userId, "assistant", `Logged $${amount} on ${category}.`);
    reply(chatId, `💸 Logged: *$${amount}* — ${category}\n\nSync to dashboard: ${APP_URL}`);
    return;
  }

  bot.sendChatAction(chatId, "typing");
  pushHistory(userId, "user", text);
  const aiReply = await getAIResponse(userId, text);

  if (aiReply) {
    pushHistory(userId, "assistant", aiReply);
    reply(chatId, aiReply);
  } else {
    const fallback = buildFallback(userId);
    reply(chatId, fallback);
  }
});

// ─────────────────────────────────────────────────────
//  ERROR HANDLING
// ─────────────────────────────────────────────────────
bot.on("polling_error", (err) => console.error("Polling error:", err.message));
process.on("unhandledRejection", (err) => console.error("Unhandled:", err));

console.log("⚡ Imperium Bot running — @ImperiumOSBot");
console.log(`   Model : ${OLLAMA_MODEL} @ ${OLLAMA_URL}`);
console.log("   Memory: in-process per userId");
