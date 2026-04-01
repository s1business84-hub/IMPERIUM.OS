import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

dotenv.config();

// ─────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────
// ── Startup: validate required env vars ──────────────────
const TOKEN         = process.env.TELEGRAM_TOKEN;
const OLLAMA_URL    = process.env.OLLAMA_URL    || "http://localhost:11434";
const OLLAMA_MODEL  = process.env.OLLAMA_MODEL  || "llama3";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "whisper";
const APP_URL       = process.env.APP_URL        || "https://imperium-os.vercel.app";
const EMAIL_USER    = process.env.EMAIL_USER;
const EMAIL_PASS    = process.env.EMAIL_PASS;
const ADMIN_ID      = Number(process.env.ADMIN_ID);
const TEMP_DIR      = os.tmpdir();

if (!TOKEN) {
  console.error("❌ TELEGRAM_TOKEN is not set. Add it to bot/.env and restart.");
  process.exit(1);
}
console.log(`✅ TELEGRAM_TOKEN loaded — ...${TOKEN.slice(-6)}`);

const bot = new TelegramBot(TOKEN, { polling: true });

// ─────────────────────────────────────────────────────
//  EMAIL — nodemailer via Gmail
// ─────────────────────────────────────────────────────
const mailer = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
  : null;

async function sendEmail(to, subject, html) {
  if (!mailer) { console.warn("⚠️ Email not configured — skipping send"); return; }
  try {
    await mailer.sendMail({ from: `"Imperium OS" <${EMAIL_USER}>`, to, subject, html });
    console.log(`📧 Email sent → ${to}`);
  } catch (err) {
    console.error("Email error:", err.message);
  }
}

async function sendWelcomeEmail(name, email) {
  await sendEmail(
    email,
    "⚡ Welcome to Imperium OS",
    `<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
      <h1 style="color:#7c3aed;margin-bottom:4px">⚡ Imperium OS</h1>
      <p style="color:#a0a0a0;margin-top:0">High-Performance Operating System</p>
      <hr style="border-color:#222;margin:24px 0">
      <p>Hey <strong>${name}</strong>,</p>
      <p>Your Imperium account is live.</p>
      <p><strong>Your login credentials:</strong></p>
      <table style="background:#111;border-radius:8px;padding:16px;width:100%">
        <tr><td style="color:#a0a0a0;padding:4px 8px">Email</td><td style="padding:4px 8px"><code>${email}</code></td></tr>
        <tr><td style="color:#a0a0a0;padding:4px 8px">Password</td><td style="padding:4px 8px">The one you just set in Telegram</td></tr>
      </table>
      <p style="margin-top:16px">Use these to sign in on any device via the Telegram bot or the dashboard.</p>
      <a href="${APP_URL}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Open Imperium OS →</a>
      <hr style="border-color:#222;margin:24px 0">
      <p style="color:#555;font-size:12px">Imperium OS · Built by Sanskaar Nair &amp; Kashish Devnani</p>
    </div>`
  );
}

async function sendSignInEmail(name, email) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  await sendEmail(
    email,
    "🔐 Imperium OS — Sign In Confirmed",
    `<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
      <h1 style="color:#7c3aed;margin-bottom:4px">⚡ Imperium OS</h1>
      <p style="color:#a0a0a0;margin-top:0">Sign In Confirmed</p>
      <hr style="border-color:#222;margin:24px 0">
      <p>Hey <strong>${name}</strong>,</p>
      <p>You just signed in to your Imperium AI bot.</p>
      <p style="color:#a0a0a0;font-size:13px">Time: ${time} IST</p>
      <p>If this wasn't you, reply to this email immediately.</p>
      <a href="${APP_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Open Dashboard →</a>
      <hr style="border-color:#222;margin:24px 0">
      <p style="color:#555;font-size:12px">Imperium OS · Built by Sanskaar Nair &amp; Kashish Devnani</p>
    </div>`
  );
}

// ─────────────────────────────────────────────────────
//  USER REGISTRY — persisted to users.json
// ─────────────────────────────────────────────────────
const USERS_FILE = path.join(path.dirname(new URL(import.meta.url).pathname), "users.json");

// Temporary in-memory store: userId → { name, email, action }
// action: "set_password" | "change_password"
const pendingPassword = new Map();

function loadRegistry() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch { return {}; }
}

function saveRegistry(reg) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(reg, null, 2));
}

function isRegistered(userId) {
  const reg = loadRegistry();
  return !!reg[userId]?.passwordHash; // only fully registered once password is set
}

function registerUser(userId, name, email, passwordHash) {
  const reg = loadRegistry();
  reg[userId] = {
    name,
    email,
    passwordHash,
    tasks: reg[userId]?.tasks || [],
    registeredAt: reg[userId]?.registeredAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveRegistry(reg);
}

function saveUserTasks(userId, tasks) {
  const reg = loadRegistry();
  if (reg[userId]) {
    reg[userId].tasks = tasks;
    saveRegistry(reg);
  }
}

// Save partial (no password yet) — used during signup flow
function preRegisterUser(userId, name, email) {
  const reg = loadRegistry();
  reg[userId] = { name, email, passwordHash: null, registeredAt: new Date().toISOString() };
  saveRegistry(reg);
}

function getRegisteredUser(userId) {
  return loadRegistry()[userId] || null;
}

// ─────────────────────────────────────────────────────
//  AUTH GUARD — call before any protected handler
// ─────────────────────────────────────────────────────
function requireAuth(msg) {
  if (isRegistered(msg.from.id)) return true;
  bot.sendMessage(msg.chat.id,
    `🔐 *Please sign up or sign in first.*\n\n` +
    `➡️ /signup YourName your@email.com\n` +
    `➡️ /signin your@email.com\n\n` +
    `_All features unlock after authentication._`,
    { parse_mode: "Markdown" }
  );
  return false;
}

// ─────────────────────────────────────────────────────
const memory = new Map();

function getUser(userId) {
  if (!memory.has(userId)) {
    const saved = getRegisteredUser(userId);
    memory.set(userId, {
      history:  [],
      plan:     null,
      tasks:    saved?.tasks || [],   // ← restored from users.json
      focus:    null,
      name:     saved?.name  || null,
      voiceLog: [],
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
  } catch (mdErr) {
    // Markdown parse failed — retry as plain text
    try {
      await bot.sendMessage(chatId, text.replace(/[*_`\[\]]/g, ""), opts);
    } catch (err) {
      console.error(`reply() failed to chatId ${chatId}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────
//  VISUAL HELPERS
// ─────────────────────────────────────────────────────
function progressBar(done, total, len = 12) {
  if (total === 0) return "░".repeat(len) + " 0%";
  const filled = Math.round((done / total) * len);
  const pct    = Math.round((done / total) * 100);
  return "█".repeat(filled) + "░".repeat(len - filled) + ` ${pct}%`;
}

// Build a QuickChart URL (no install needed — uses free API)
function quickChartUrl(config) {
  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&backgroundColor=rgb(10,10,10)&width=600&height=300`;
}

async function sendChart(chatId, config, caption) {
  try {
    const url = quickChartUrl(config);
    await bot.sendPhoto(chatId, url, { caption, parse_mode: "Markdown" });
  } catch (err) {
    console.error("Chart send error:", err.message);
  }
}

// ─────────────────────────────────────────────────────
//  /start
// ─────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const name   = msg.from.first_name || "there";

  if (!isRegistered(userId)) {
    reply(msg.chat.id,
      `⚡ *Welcome to Imperium, ${name}.*\n\n` +
      `I'm your high-performance AI operator.\n\n` +
      `🔐 *New here? Create your account:*\n` +
      `\`/signup YourName your@email.com\`\n` +
      `_Then type your password when prompted._\n\n` +
      `✅ *Already have an account? Sign in:*\n` +
      `\`/signin your@email.com yourpassword\`\n\n` +
      `_All features unlock after authentication._`);
    return;
  }

  const regUser = getRegisteredUser(userId);
  getUser(userId).name = regUser.name;
  reply(msg.chat.id,
    `⚡ *Welcome back, ${regUser.name}.*\n\nYour AI operator is ready.\n\n` +
    `*Strategy:*\n/plan — set your strategy\n/focus — lock in one priority\n\n` +
    `*Tasks:*\n/tasks — view task list\n/add [task] — add a task\n/done [#] — complete a task\n\n` +
    `*AI:*\n/insights — today's AI performance brief\n/dashboard — your full context card\n/status — see all context\n\n` +
    `*Logs:*\n/voice — view voice log\n/clear — wipe memory\n\n` +
    `*Other:*\n/app — open dashboard\n/help — full guide\n\n` +
    `Or just *talk to me* — text or 🎙 *voice note.*`);
});

// ─────────────────────────────────────────────────────
//  /signup — register new user + send welcome email
// ─────────────────────────────────────────────────────
bot.onText(/\/signup (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const parts  = match[1].trim().split(/\s+/);

  if (parts.length < 2) {
    reply(msg.chat.id, `⚠️ Usage: \`/signup YourName your@email.com\``);
    return;
  }

  const email = parts[parts.length - 1];
  const name  = parts.slice(0, -1).join(" ");

  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    reply(msg.chat.id, `❌ Invalid email. Try: \`/signup YourName your@email.com\``);
    return;
  }

  if (isRegistered(userId)) {
    const existing = getRegisteredUser(userId);
    reply(msg.chat.id, `✅ Already signed up as *${existing.name}* (${existing.email}).\n\nUse /start to begin.`);
    return;
  }

  // Check if email already taken
  const reg = loadRegistry();
  const taken = Object.values(reg).find(u => u.email === email && u.passwordHash);
  if (taken) {
    reply(msg.chat.id, `❌ That email is already registered.\n\nSign in instead: \`/signin ${email} yourpassword\``);
    return;
  }

  // Pre-register and prompt for password
  preRegisterUser(userId, name, email);
  pendingPassword.set(userId, { name, email, action: "set_password" });

  reply(msg.chat.id,
    `👤 *Almost there, ${name}!*\n\n` +
    `📧 Email: *${email}*\n\n` +
    `🔐 Now set your password.\n` +
    `_Just type it in the chat (min 6 characters). It will be encrypted and stored securely._`);
});

// ─────────────────────────────────────────────────────
//  /signin — authenticate existing user + send confirmation email
// ─────────────────────────────────────────────────────
bot.onText(/\/signin (.+)/, async (msg, match) => {
  const userId = msg.from.id;
  const parts  = match[1].trim().split(/\s+/);

  if (parts.length < 2) {
    reply(msg.chat.id, `⚠️ Usage: \`/signin your@email.com yourpassword\``);
    return;
  }

  const email    = parts[0];
  const password = parts.slice(1).join(" "); // allow spaces in password

  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    reply(msg.chat.id, `❌ Invalid email. Usage: \`/signin your@email.com yourpassword\``);
    return;
  }

  const reg    = loadRegistry();
  const entry  = Object.entries(reg).find(([, u]) => u.email === email && u.passwordHash);

  if (!entry) {
    reply(msg.chat.id,
      `❌ No account found for *${email}*\n\nSign up first: \`/signup YourName ${email}\``);
    return;
  }

  const [, userData] = entry;
  const match2 = await bcrypt.compare(password, userData.passwordHash);

  if (!match2) {
    reply(msg.chat.id, `❌ *Wrong password.* Try again or use /forgotpassword.`);
    return;
  }

  // Bind this Telegram userId to the account
  registerUser(userId, userData.name, email, userData.passwordHash);
  getUser(userId).name = userData.name;

  bot.sendChatAction(msg.chat.id, "typing");
  await sendSignInEmail(userData.name, email);

  reply(msg.chat.id,
    `🔐 *Signed in, ${userData.name}!*\n\n` +
    `📧 Confirmation sent to *${email}*\n\n` +
    `Your AI operator is active. Use /start to see all commands.`);
});


// ─────────────────────────────────────────────────────
//  /admin — owner-only user list
// ─────────────────────────────────────────────────────
bot.onText(/\/admin/, (msg) => {
  if (msg.from.id !== ADMIN_ID) {
    reply(msg.chat.id, `❌ Not authorised.`);
    return;
  }

  const reg     = loadRegistry();
  const entries = Object.entries(reg);

  if (!entries.length) {
    reply(msg.chat.id, `📊 *No users yet.*`);
    return;
  }

  const verified   = entries.filter(([, u]) => u.passwordHash);
  const unverified = entries.filter(([, u]) => !u.passwordHash);

  let out = `📊 *Imperium Users — ${verified.length} registered*\n`;
  out += `_${unverified.length} pending (no password set)_\n\n`;

  verified.forEach(([id, u], i) => {
    const date = new Date(u.registeredAt).toLocaleDateString("en-IN");
    out += `${i + 1}\. *${u.name}*\n`;
    out += `   📧 ${u.email}\n`;
    out += `   📅 Joined: ${date}\n\n`;
  });

  if (unverified.length) {
    out += `*Pending (signup started, no password):*\n`;
    unverified.forEach(([, u]) => {
      out += `• ${u.name} — ${u.email}\n`;
    });
  }

  reply(msg.chat.id, out);
});

// ─────────────────────────────────────────────────────
//  /changepassword
// ─────────────────────────────────────────────────────
bot.onText(/\/changepassword/, (msg) => {
  if (!requireAuth(msg)) return;
  const user = getRegisteredUser(msg.from.id);
  pendingPassword.set(msg.from.id, { name: user.name, email: user.email, action: "change_password" });
  reply(msg.chat.id,
    `🔐 *Change Password*\n\nType your new password now (min 6 characters).\n_It will be encrypted immediately._`);
});

// ─────────────────────────────────────────────────────
//  /forgotpassword
// ─────────────────────────────────────────────────────
bot.onText(/\/forgotpassword/, (msg) => {
  // If already linked to this Telegram account, allow direct reset
  if (isRegistered(msg.from.id)) {
    const user = getRegisteredUser(msg.from.id);
    pendingPassword.set(msg.from.id, { name: user.name, email: user.email, action: "change_password" });
    reply(msg.chat.id,
      `🔐 *Reset Password*\n\nType your new password now (min 6 characters):`);
  } else {
    reply(msg.chat.id,
      `⚠️ You need to be signed in to reset your password.\n\nIf you\'re locked out, contact us at imperiumosx@gmail.com`);
  }
});

// ─────────────────────────────────────────────────────
//  /help
// ─────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  reply(msg.chat.id,
    `*Imperium AI — Command Guide*\n\n` +
    `*Auth:*\n` +
    `/signup Name email — create account\n` +
    `/signin email password — sign in\n` +
    `/changepassword — update your password\n` +
    `/forgotpassword — reset your password\n\n` +
    `*Strategy:*\n` +
    `/plan [text] — set your strategy\n` +
    `/focus [text] — lock in one priority\n\n` +
    `*Tasks:*\n` +
    `/tasks — view task list\n` +
    `/add [task] — add a task\n` +
    `/done [#] — mark task complete\n\n` +
    `*AI Insights:*\n` +
    `/insights — today's AI performance brief\n` +
    `/dashboard — your full context card\n` +
    `/status — see all context\n\n` +
    `*Logs:*\n` +
    `/voice — view your voice log\n` +
    `/clear — reset memory\n` +
    `/app — open dashboard\n\n` +
    `_Text or voice note — I transcribe, store, and respond to both._`);
});

// ─────────────────────────────────────────────────────
//  /app
// ─────────────────────────────────────────────────────
bot.onText(/\/app/, (msg) => {
  reply(msg.chat.id,
    `📱 *Imperium OS Dashboard*\n\n${APP_URL}\n\nCheck-ins, insights, spending tracker, full AI analysis.`);
});

// ─────────────────────────────────────────────────────
//  /insights — AI daily performance brief
// ─────────────────────────────────────────────────────
bot.onText(/\/insights(@\w+)?\s*$/, async (msg) => {
  if (!requireAuth(msg)) return;
  const userId = msg.from.id;
  const user   = getUser(userId);
  bot.sendChatAction(msg.chat.id, "typing");

  const taskSummary = user.tasks.length
    ? `Tasks: ${user.tasks.map((t, i) => `${i + 1}. ${t}`).join(", ")}`
    : "No tasks set.";
  const prompt =
    `Give me a sharp, personalised daily performance brief for today. ` +
    `Be direct and science-backed. Structure your response with these exact headers: ` +
    `**Momentum** (1 honest sentence about current state), ` +
    `**Highest Leverage Action** (one concrete thing to do in next 2 hours), ` +
    `**Science Insight** (one physiology or psychology fact relevant to my situation). ` +
    `Context — Focus: "${user.focus || "not set"}". Plan: "${user.plan || "not set"}". ${taskSummary}. ` +
    `Max 150 words total. Be direct.`;

  const aiReply = await getAIResponse(userId, prompt);
  if (aiReply) {
    pushHistory(userId, "assistant", aiReply);
    reply(msg.chat.id, `📊 *Today's Insights*\n\n${aiReply}`);
  } else {
    reply(msg.chat.id, buildFallback(userId));
  }

  // Readiness radar chart
  const focusScore = user.focus ? 3 : 0;
  const planScore  = user.plan  ? 3 : 0;
  const taskScore  = Math.min(user.tasks.length, 3);
  const chatScore  = Math.min(Math.floor(user.history.length / 2), 3);
  const voiceScore = Math.min(user.voiceLog.length, 3);

  await sendChart(msg.chat.id, {
    type: "radar",
    data: {
      labels: ["Focus", "Plan", "Tasks", "AI Usage", "Voice"],
      datasets: [{
        label: "Readiness",
        data: [focusScore, planScore, taskScore, chatScore, voiceScore],
        backgroundColor: "rgba(124,58,237,0.3)",
        borderColor: "#7c3aed",
        pointBackgroundColor: "#a78bfa",
        borderWidth: 2
      }]
    },
    options: {
      scales: { r: { min: 0, max: 3, ticks: { display: false }, grid: { color: "#333" }, pointLabels: { color: "#ffffff", font: { size: 13 } } } },
      plugins: {
        title:  { display: true, text: "Operator Readiness", color: "#ffffff", font: { size: 15 } },
        legend: { display: false }
      }
    }
  }, "⚡ Readiness radar");
});

// ─────────────────────────────────────────────────────
//  /dashboard — full context card
// ─────────────────────────────────────────────────────
bot.onText(/\/dashboard(@\w+)?\s*$/, async (msg) => {
  if (!requireAuth(msg)) return;
  const userId = msg.from.id;
  const user   = getUser(userId);
  const reg    = getRegisteredUser(userId);
  const now    = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Text card
  let out = `📱 *Imperium Dashboard*\n_${now} IST_\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  out += `👤 *${reg?.name || user.name || "Operator"}*  📧 ${reg?.email || "—"}\n\n`;
  out += `🎯 *Focus*\n${user.focus || "_not set — /focus_"}\n\n`;
  out += `📋 *Plan*\n${user.plan   || "_not set — /plan_"}\n\n`;

  if (user.tasks.length) {
    out += `✅ *Tasks (${user.tasks.length})*\n`;
    out += user.tasks.map((t, i) => `${i + 1}. ◻️ ${t}`).join("\n");
    out += "\n\n";
  } else {
    out += `✅ *Tasks* — _none yet_\n\n`;
  }
  out += `💬 ${Math.floor(user.history.length / 2)} AI exchanges  🎙 ${user.voiceLog.length} voice notes\n\n🔗 ${APP_URL}`;

  reply(msg.chat.id, out);

  // Activity bar chart
  const chartConfig = {
    type: "bar",
    data: {
      labels: ["Tasks", "AI Chats", "Voice Notes", "Focus Set", "Plan Set"],
      datasets: [{
        label: "Activity",
        data: [
          user.tasks.length,
          Math.floor(user.history.length / 2),
          user.voiceLog.length,
          user.focus ? 1 : 0,
          user.plan  ? 1 : 0
        ],
        backgroundColor: ["#7c3aed", "#a78bfa", "#c4b5fd", "#6d28d9", "#4c1d95"],
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        title:  { display: true, text: `${reg?.name || "Operator"}'s Activity — Imperium OS`, color: "#ffffff", font: { size: 15 } },
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: "#aaaaaa" }, grid: { color: "#222" } },
        y: { ticks: { color: "#aaaaaa", stepSize: 1 }, grid: { color: "#222" }, beginAtZero: true }
      }
    }
  };

  await sendChart(msg.chat.id, chartConfig, `📊 Activity snapshot — ${now} IST`);
});

// ─────────────────────────────────────────────────────
//  /plan
// ─────────────────────────────────────────────────────
bot.onText(/\/plan(.*)/, async (msg, match) => {
  if (!requireAuth(msg)) return;
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
  if (!requireAuth(msg)) return;
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
bot.onText(/\/tasks(@\w+)?\s*$/, (msg) => {
  if (!requireAuth(msg)) return;
  const user = getUser(msg.from.id);
  if (!user.tasks.length) {
    reply(msg.chat.id,
      `✅ *No tasks yet.*\n\nUse \`/add [task]\` to add one.\n\n_Tip: /add finish pitch deck_`);
    return;
  }
  const total     = user.tasks.length;
  const bar       = progressBar(0, total); // all pending
  const list      = user.tasks.map((t, i) => `${i + 1}. ◻️ ${t}`).join("\n");
  reply(msg.chat.id,
    `✅ *Tasks — ${total} pending*\n` +
    `\`${bar}\`\n\n` +
    `${list}\n\n` +
    `_/done [#] to complete · /add [task] to add_`);
});

// ─────────────────────────────────────────────────────
//  /add
// ─────────────────────────────────────────────────────
bot.onText(/\/add(?:@\w+)?\s+(.+)/, (msg, match) => {
  if (!requireAuth(msg)) return;
  const userId = msg.from.id;
  const user = getUser(userId);
  const task = match[1].trim();
  if (!task) { reply(msg.chat.id, `⚠️ Usage: \`/add [task description]\``); return; }
  user.tasks.push(task);
  saveUserTasks(userId, user.tasks);
  reply(msg.chat.id, `➕ Added: *${task}*\n\n${user.tasks.length} task${user.tasks.length > 1 ? "s" : ""} in queue. /tasks to view.`);
});

// ─────────────────────────────────────────────────────
//  /done
// ─────────────────────────────────────────────────────
bot.onText(/\/done(?:@\w+)?\s+(\d+)/, async (msg, match) => {
  if (!requireAuth(msg)) return;
  const userId = msg.from.id;
  const user = getUser(userId);
  const idx = parseInt(match[1]) - 1;
  if (idx < 0 || idx >= user.tasks.length) {
    reply(msg.chat.id, `❌ Task #${idx + 1} not found. Use /tasks to see your list.`);
    return;
  }
  const done     = user.tasks.splice(idx, 1)[0];
  const remaining = user.tasks.length;
  saveUserTasks(userId, user.tasks);

  const bar = progressBar(0, remaining === 0 ? 1 : remaining);
  reply(msg.chat.id,
    `✔️ *Done:* _${done}_\n\n` +
    (remaining > 0
      ? `${remaining} task${remaining !== 1 ? "s" : ""} remaining\n\`${progressBar(0, remaining)}\``
      : `🏆 *All tasks complete!* Queue is clear.`)
  );

  // Send completion chart when all tasks are done
  if (remaining === 0) {
    await sendChart(msg.chat.id, {
      type: "doughnut",
      data: {
        labels: ["Complete", "Remaining"],
        datasets: [{ data: [1, 0], backgroundColor: ["#7c3aed", "#333"], borderWidth: 0 }]
      },
      options: {
        plugins: {
          title: { display: true, text: "Task Queue — All Done ✓", color: "#ffffff", font: { size: 16 } },
          legend: { labels: { color: "#ffffff" } }
        }
      }
    }, "⚡ Queue cleared.");
  }
});

// ─────────────────────────────────────────────────────
//  /status
// ─────────────────────────────────────────────────────
bot.onText(/\/status/, (msg) => {
  if (!requireAuth(msg)) return;
  const user    = getUser(msg.from.id);
  const exchBar = progressBar(Math.min(user.history.length / 2, 20), 20);
  const vocBar  = progressBar(Math.min(user.voiceLog.length, 10), 10);

  let out = `📊 *Imperium Status*\n\n`;

  out += user.focus
    ? `🎯 *Focus*\n_${user.focus}_\n\n`
    : `🎯 *Focus* — _not set_\n\n`;

  out += user.plan
    ? `📋 *Plan*\n_${user.plan}_\n\n`
    : `📋 *Plan* — _not set_\n\n`;

  if (user.tasks.length) {
    out += `✅ *Tasks (${user.tasks.length} pending)*\n`;
    out += user.tasks.map((t, i) => `${i + 1}. ${t}`).join("\n");
    out += "\n\n";
  } else {
    out += `✅ *Tasks* — _none_\n\n`;
  }

  out += `💬 *AI Activity*\n\`${exchBar}\`  ${Math.floor(user.history.length / 2)} exchanges\n\n`;
  out += `🎙 *Voice Notes*\n\`${vocBar}\`  ${user.voiceLog.length} stored`;
  reply(msg.chat.id, out);
});

// ─────────────────────────────────────────────────────
//  /clear
// ─────────────────────────────────────────────────────
bot.onText(/\/clear/, (msg) => {
  if (!requireAuth(msg)) return;
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
//  VOICE TRANSCRIPTION via openai-whisper CLI
// ─────────────────────────────────────────────────────
const WHISPER_BIN = process.env.WHISPER_BIN || "/Users/sanskaarnair/Desktop/BRAINANCE/BRAINANCE/.venv/bin/whisper";

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

  // 4. Run whisper CLI on the wav file, output txt to TEMP_DIR
  execSync(
    `"${WHISPER_BIN}" "${wavPath}" --model base --output_format txt --output_dir "${TEMP_DIR}" --fp16 False 2>/dev/null`,
    { timeout: 120000 }
  );

  // 5. Read the transcript (whisper names output file as <basename>.txt)
  const txtPath = wavPath.replace(/\.wav$/, ".txt");
  const transcript = fs.existsSync(txtPath)
    ? fs.readFileSync(txtPath, "utf8").trim()
    : "";

  // 6. Clean up temp files
  try { fs.unlinkSync(ogaPath); fs.unlinkSync(wavPath); fs.unlinkSync(txtPath); } catch {}

  return transcript;
}

// ─────────────────────────────────────────────────────
//  /voice — show stored voice log
// ─────────────────────────────────────────────────────
bot.onText(/\/voice/, (msg) => {
  if (!requireAuth(msg)) return;
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
  if (!requireAuth(msg)) return;
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user   = getUser(userId);
  console.log(`🎙 [${new Date().toISOString()}] @${msg.from.username || msg.from.first_name} (${userId}): voice note (${msg.voice.duration}s)`);
  if (!user.name && msg.from.first_name) user.name = msg.from.first_name;

  bot.sendChatAction(chatId, "typing");
  reply(chatId, `🎙 _Transcribing your voice note..._`);

  let transcript;
  try {
    transcript = await transcribeVoice(msg.voice.file_id);
  } catch (err) {
    console.error("Whisper error:", err.message);
    reply(chatId, `⚠️ *Couldn't transcribe voice note.*\n\n_${err.message}_\n\nJust type your message instead — full AI still works.`);
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

  // ── Password setup flow ────────────────────────────────────
  if (pendingPassword.has(userId)) {
    const { name, email, action } = pendingPassword.get(userId);

    if (text.length < 6) {
      reply(chatId, `❌ Password too short. Must be at least 6 characters. Try again:`);
      return;
    }

    bot.sendChatAction(chatId, "typing");
    const hash = await bcrypt.hash(text, 12);

    if (action === "set_password") {
      registerUser(userId, name, email, hash);
      getUser(userId).name = name;
      pendingPassword.delete(userId);
      await sendWelcomeEmail(name, email);
      reply(chatId,
        `✅ *Account created, ${name}!*\n\n` +
        `🔐 Password set and encrypted\n` +
        `📧 Welcome email sent to *${email}*\n\n` +
        `*Your login credentials:*\n` +
        `Email: \`${email}\`\n` +
        `Password: the one you just set\n\n` +
        `Use /start to begin.`);

    } else if (action === "change_password") {
      const reg = loadRegistry();
      const existing = reg[userId];
      registerUser(userId, existing.name, existing.email, hash);
      pendingPassword.delete(userId);
      reply(chatId, `✅ *Password updated successfully.*\n\nYour new password is active for \`${existing.email}\`.`);
    }
    return;
  }

  if (!requireAuth(msg)) return;

  const user = getUser(userId);
  console.log(`📨 [${new Date().toISOString()}] @${msg.from.username || msg.from.first_name} (${userId}): ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`);

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

// ─────────────────────────────────────────────────────
//  STARTUP — confirm bot identity via Telegram API
// ─────────────────────────────────────────────────────
(async () => {
  try {
    const me = await bot.getMe();
    console.log("\n⚡ Imperium Bot initialised successfully");
    console.log(`   Username : @${me.username}`);
    console.log(`   Bot ID   : ${me.id}`);
    console.log(`   Token    : ...${TOKEN.slice(-6)}  (last 6 chars)`);
    console.log(`   Model    : ${OLLAMA_MODEL} @ ${OLLAMA_URL}`);
    console.log(`   Email    : ${EMAIL_USER || "not configured"}`);
    console.log(`   App URL  : ${APP_URL}`);
    console.log(`   Memory   : in-process per userId`);
    console.log("   Status   : polling for messages...\n");

    // Register command menu with Telegram (shows / autocomplete)
    await bot.setMyCommands([
      { command: "start",     description: "Launch Imperium" },
      { command: "plan",      description: "Create a strategic plan" },
      { command: "focus",     description: "Set your main focus" },
      { command: "tasks",     description: "View task list" },
      { command: "add",       description: "Add a new task" },
      { command: "done",      description: "Complete a task" },
      { command: "insights",  description: "View AI insights + radar chart" },
      { command: "dashboard", description: "Full dashboard + activity chart" },
      { command: "status",    description: "View your context" },
      { command: "voice",     description: "View voice log" },
      { command: "clear",     description: "Reset memory" },
      { command: "app",       description: "Open web dashboard" },
      { command: "help",      description: "Full guide" },
    ]);
    console.log("   Commands : registered with Telegram ✓\n");
  } catch (err) {
    console.error("❌ Bot failed to connect to Telegram:", err.message);
    console.error("   Check your TELEGRAM_TOKEN and internet connection.");
    process.exit(1);
  }
})();

