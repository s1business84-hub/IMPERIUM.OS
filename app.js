/* ════════════════════════════════════════════════════
   IMPERIUM OS — v4.0.0 — app.js
   Complete rewrite: Boot · Auth · Onboarding · All Screens
   Command Palette · Cursor Glow · Particles · Magnetic
════════════════════════════════════════════════════ */
'use strict';

/* ── STATE ────────────────────────────────────────── */
let S = {
  user: null,
  onboarded: false,
  situation: '',
  goal: '',
  income: 5000,
  budget: 0,
  currency: '$',
  transactions: [],
  streak: 0,
  lastLogin: null,
  aiGensLeft: 3,
  notifDaily: true,
  notifBudget: true,
  currentScreen: 'screen-boot',
  cards: []
};

/* ── PERSIST ──────────────────────────────────────── */
function saveState() {
  try { localStorage.setItem('imperium_state', JSON.stringify(S)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem('imperium_state');
    if (raw) S = Object.assign({}, S, JSON.parse(raw));
  } catch(e) {}
}

/* ── BOOT SEQUENCE ────────────────────────────────── */
const BOOT_LOGS = [
  'Initialising kernel modules…',
  'Loading financial data layer…',
  'Connecting AI inference engine…',
  'Mounting secure vault…',
  'Calibrating portfolio algorithms…',
  'Syncing market signals…',
  'Verifying identity protocol…',
  'System ready.'
];

function runBoot() {
  const bar = document.getElementById('boot-bar');
  const logEl = document.getElementById('boot-log');
  let pct = 0;
  let logIdx = 0;
  const TOTAL = 2400;
  const INT = TOTAL / 100;

  const timer = setInterval(() => {
    pct++;
    bar.style.width = pct + '%';
    const lIdx = Math.floor((pct / 100) * BOOT_LOGS.length);
    if (lIdx > logIdx && logIdx < BOOT_LOGS.length) {
      const line = document.createElement('div');
      line.className = 'log-line';
      line.style.animationDelay = '0ms';
      line.textContent = '▸ ' + BOOT_LOGS[logIdx];
      logEl.appendChild(line);
      logIdx++;
      logEl.scrollTop = logEl.scrollHeight;
    }
    if (pct >= 100) {
      clearInterval(timer);
      setTimeout(bootDone, 400);
    }
  }, INT);
}

function bootDone() {
  loadState();
  const boot = document.getElementById('screen-boot');
  boot.style.transition = 'opacity 0.6s ease';
  boot.style.opacity = '0';
  setTimeout(() => {
    boot.classList.remove('active');
    boot.style.display = 'none';
    checkAuth();
  }, 650);
}

function checkAuth() {
  if (S.user && S.onboarded) {
    showBottomNav();
    updateStreak();
    navigateTo('screen-home');
    initHomeData();
  } else if (S.user) {
    navigateTo('screen-onboarding');
  } else {
    navigateTo('screen-auth');
  }
  initGlobalEffects();
}

/* ── NAVIGATION ───────────────────────────────────── */
function navigateTo(id) {
  const prev = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next || prev === next) return;
  if (prev) {
    prev.classList.add('exit');
    setTimeout(() => prev.classList.remove('active', 'exit'), 300);
  }
  next.classList.add('active');
  S.currentScreen = id;

  // Update nav
  const navMap = {
    'screen-home': 'nb-home',
    'screen-make': 'nb-make',
    'screen-track': 'nb-track',
    'screen-insights': 'nb-insights',
    'screen-settings': 'nb-settings'
  };
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (navMap[id]) {
    const nb = document.getElementById(navMap[id]);
    if (nb) nb.classList.add('active');
  }

  // Init screens
  if (id === 'screen-home')     { updateHomeScreen(); }
  if (id === 'screen-insights') { initInsights(); }
  if (id === 'screen-calendar') { renderCalendar(); updateMonthStats(); }
  if (id === 'screen-settings') { initSettings(); }
  if (id === 'screen-track')    { updateTxFeed(); updateDueDates(); }
}

function showBottomNav() {
  const bn = document.getElementById('bottom-nav');
  if (bn) bn.classList.remove('hidden');
}

/* ── AUTH ─────────────────────────────────────────── */
function switchTab(t) {
  document.getElementById('form-login').classList.toggle('hidden', t !== 'login');
  document.getElementById('form-signup').classList.toggle('hidden', t !== 'signup');
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  if (!email || pass.length < 6) { showAuthMsg('Enter valid email and password (min 6 chars)'); return; }
  const key = 'user_' + email.replace(/[^a-z0-9]/gi, '_');
  const stored = localStorage.getItem(key);
  if (!stored) { showAuthMsg('No account found. Sign up first.'); return; }
  const userData = JSON.parse(stored);
  if (userData.pass !== btoa(pass)) { showAuthMsg('Wrong password.'); return; }
  S.user = { name: userData.name, email };
  saveState();
  postAuth();
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-password').value;
  if (!name || !email || pass.length < 6) { showAuthMsg('Please fill all fields (min 6 char password)'); return; }
  const key = 'user_' + email.replace(/[^a-z0-9]/gi, '_');
  localStorage.setItem(key, JSON.stringify({ name, pass: btoa(pass) }));
  S.user = { name, email };
  S.onboarded = false;
  saveState();
  postAuth();
}

function continueAsGuest() {
  S.user = { name: 'Guest', email: 'guest@imperium.os' };
  S.onboarded = false;
  saveState();
  postAuth();
}

function postAuth() {
  if (S.onboarded) {
    showBottomNav();
    updateStreak();
    navigateTo('screen-home');
    initHomeData();
  } else {
    navigateTo('screen-onboarding');
  }
  initGlobalEffects();
}

function showAuthMsg(m) {
  const el = document.getElementById('auth-msg');
  if (el) { el.textContent = m; setTimeout(() => { el.textContent = ''; }, 4000); }
}

function togglePw(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

/* ── ONBOARDING ───────────────────────────────────── */
let obStep = 1;
function pickSituation(btn) {
  document.querySelectorAll('#ob-1 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.situation = btn.dataset.v;
  setTimeout(() => goObStep(2), 300);
}
function pickGoal(btn) {
  document.querySelectorAll('#ob-2 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.goal = btn.dataset.v;
  setTimeout(() => goObStep(3), 300);
}
function pickIncome(btn) {
  document.querySelectorAll('#ob-3 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.income = parseInt(btn.dataset.v) || 0;
}
function goObStep(n) {
  document.getElementById('ob-' + obStep).classList.remove('active');
  obStep = n;
  document.getElementById('ob-' + n).classList.add('active');
  document.getElementById('ob-fill').style.width = (n / 3 * 100) + '%';
}
function finishOnboarding() {
  S.onboarded = true;
  S.aiGensLeft = 3;
  saveState();
  showBottomNav();
  updateStreak();
  navigateTo('screen-home');
  initHomeData();
  initGlobalEffects();
}

/* ── HOME ─────────────────────────────────────────── */
function initHomeData() {
  updateHomeScreen();
  initParticles();
  initBeams();
}

function updateHomeScreen() {
  // Greeting
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = greet + ', ' + name + ' 👋';

  // Date
  const dateEl = document.getElementById('top-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Snapshot
  updateSnapshot();

  // Tx feed (last 5)
  const feed = document.getElementById('tx-feed-home');
  if (feed) {
    if (!S.transactions.length) {
      feed.innerHTML = '<div class="tx-empty">No transactions yet. Tap <strong>Log Transaction</strong> to start.</div>';
    } else {
      const recent = [...S.transactions].reverse().slice(0, 5);
      feed.innerHTML = recent.map(tx => txHTML(tx)).join('');
    }
  }

  // AI prompt
  updateAIPrompt();
}

function updateSnapshot() {
  const now = new Date();
  const mo = now.getMonth(); const yr = now.getFullYear();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === mo && d.getFullYear() === yr;
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = inc - spent;
  const runway = S.budget > 0 ? (S.budget - spent <= 0 ? 'Over!' : '$' + (S.budget - spent).toFixed(0)) : '—';

  el('snap-income',  fmt(inc));
  el('snap-spent',   fmt(spent));
  el('snap-profit',  fmt(profit));
  el('snap-runway',  runway);
}

function updateAIPrompt() {
  const promptEl = document.getElementById('ai-prompt-text');
  const actionsEl = document.getElementById('ai-prompt-actions');
  if (!promptEl) return;

  const now = new Date();
  const mo = now.getMonth(); const yr = now.getFullYear();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date); return d.getMonth() === mo && d.getFullYear() === yr;
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const goalMap = {
    'first-payment': 'get your first payment',
    'replace-job': 'replace your salary',
    'scale': 'scale revenue',
    'control': 'control spending'
  };
  const goalStr = goalMap[S.goal] || 'reach your goal';

  let msg;
  if (!monthTx.length) {
    msg = "Welcome to Imperium OS. Start by logging a transaction or generating a money-making offer. Your OS will calibrate once it has data.";
  } else if (inc === 0) {
    msg = "No income logged this month. Head to Make Money to generate an offer or outreach script. One client can change everything.";
  } else if (spent > inc) {
    msg = `You've spent ${fmt(spent)} against ${fmt(inc)} income this month. Profit is negative. Prioritise reducing top expenses or adding one new revenue stream.`;
  } else {
    const margin = ((inc - spent) / inc * 100).toFixed(0);
    msg = `${margin}% profit margin this month. ${inc > spent ? 'Strong. ' : ''}Keep momentum to ${goalStr}. ${S.aiGensLeft} AI generations left today.`;
  }

  promptEl.textContent = msg;
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="ai-action-chip" onclick="navigateTo('screen-make')">⚡ Make Money</button>
      <button class="ai-action-chip" onclick="navigateTo('screen-insights')">🧠 Full Insights</button>
    `;
  }
}

/* ── TRANSACTION HELPERS ──────────────────────────── */
function fmt(n) {
  const abs = Math.abs(n);
  const str = abs >= 1000 ? (abs / 1000).toFixed(1) + 'K' : abs.toFixed(2);
  return (n < 0 ? '-' : '') + S.currency + str;
}

function txHTML(tx) {
  const icons = {
    food:'🍔', coffee:'☕', transport:'🚗', shopping:'🛍️', groceries:'🛒',
    bills:'📄', entertainment:'🎬', health:'💊', subscription:'🔄',
    tools:'��️', ads:'📢', other:'📌', freelance:'💻', client:'🤝',
    product:'📦', salary:'🏦', investment:'��'
  };
  const icon = icons[tx.category] || '💰';
  const d = new Date(tx.date);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `<div class="tx-item ${tx.type}" onclick="event.stopPropagation()">
    <span class="tx-icon">${icon}</span>
    <div class="tx-details">
      <div class="tx-cat">${tx.category}</div>
      ${tx.note ? `<div class="tx-note">${tx.note}</div>` : ''}
    </div>
    <div class="tx-date">${dateStr}</div>
    <div class="tx-amt ${tx.type}">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</div>
    <button class="tx-del" onclick="deleteTx('${tx.id}')">✕</button>
  </div>`;
}

function el(id, val) {
  const e = document.getElementById(id);
  if (e) e.textContent = val;
}

/* ── MAKE MONEY ───────────────────────────────────── */
let selectedPlatform = 'instagram';
let selectedOutreachType = 'dm';

function switchMakeTab(t) {
  document.querySelectorAll('.make-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.make-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('mtab-' + t).classList.add('active');
  document.getElementById('panel-' + t).classList.add('active');
}

function selectPlatform(btn) {
  document.querySelectorAll('.platform-pills .pill').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedPlatform = btn.dataset.p;
}

function selectOutreachType(btn) {
  document.querySelectorAll('#panel-outreach .pill').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedOutreachType = btn.dataset.o;
}

function checkGenLimit() {
  if (S.aiGensLeft <= 0) {
    showToast('Daily limit reached. Upgrade to Pro for unlimited.', 'error');
    return false;
  }
  S.aiGensLeft--;
  saveState();
  return true;
}

function buildOfferOutput(input) {
  const si = S.situation || 'freelancer'; const gl = S.goal || 'scale';
  return `💡 YOUR OFFER

HEADLINE
"I help ${si === 'business' ? 'businesses' : 'people'} ${gl === 'scale' ? 'scale their revenue' : gl === 'control' ? 'control their finances' : 'start making money online'} using ${input.split(' ').slice(0, 3).join(' ')}."

WHAT YOU DO
${input}

WHO IT'S FOR
People who want results fast and don't have time to figure it out themselves.

THE PROMISE
You'll see [specific outcome] within [30 days] or I'll work for free until you do.

PRICE ANCHOR
Starter package: $[497-997]
Done-for-you: $[2,500-5,000]

NEXT STEP
DM me the word "READY" or book a free 15-min call.`;
}

function buildContentOutput(input) {
  const p = selectedPlatform;
  const templates = {
    instagram: `📸 INSTAGRAM POST\n\n[Hook]\nMost people think ${input.split(' ').slice(0, 4).join(' ')} is hard.\n\nThey're wrong.\n\nHere's what actually works:\n\n1. Start with ONE skill\n2. Get ONE result for ONE person\n3. Document everything\n4. Repeat\n\nThe formula is simple.\nExecution is the game.\n\nSave this if it helped. 🔖\n\n#entrepreneur #money #sidehustle #business`,
    twitter: `🐦 TWITTER/X THREAD\n\nThread: How to make money with ${input.split(' ').slice(0, 3).join(' ')} (even starting from $0)\n\n1/ Most people overcomplicate this.\n\n2/ The real path: skill → proof → offer → outreach.\n\n3/ You don't need a big audience.\nYou need ONE person who will pay.\n\n4/ Here's how to find that person:\n→ [Specific method]\n→ [Platform]\n→ [Message script]\n\nRT if this helped.`,
    linkedin: `�� LINKEDIN POST\n\nI went from $0 to [X] with ${input.split(' ').slice(0, 3).join(' ')}.\n\nHere's the exact playbook:\n\nStep 1: Pick ONE skill you have right now.\nStep 2: Find ONE person with that problem.\nStep 3: Solve it for free once. Get a testimonial.\nStep 4: Charge the next 3 people.\nStep 5: Use those results to raise prices.\n\nMost people skip Step 3. Don't.\n\nThoughts? Drop them below 👇`,
    tiktok: `🎵 TIKTOK SCRIPT\n\n[Hook - 0-3s]\n"POV: You just made your first $1000 online."\n\n[Problem - 3-10s]\nMost people think you need:\n❌ A big following\n❌ A product idea\n❌ Years of experience\n\n[Solution - 10-25s]\nYou actually just need:\n✅ One skill\n✅ One platform\n✅ One offer\n\n[CTA - 25-30s]\nFollow for daily money moves. 💰\n\n#money #sidehustle #entrepreneur`
  };
  return templates[p] || templates.instagram;
}

function buildOutreachOutput(input) {
  const t = selectedOutreachType;
  const templates = {
    dm: `�� DM SCRIPT\n\nHey [Name],\n\nSaw your profile — looks like you're working on ${input.split(' ').slice(0, 4).join(' ')}.\n\nI help people like you [specific outcome] without [common pain point].\n\nI've done it for [similar person/company] — [quick result].\n\nWould it make sense to jump on a quick 15-min call this week? No pitch, just want to see if I can help.\n\n[Your name]`,
    email: `📧 EMAIL SCRIPT\n\nSubject: Quick question about [their goal]\n\nHi [Name],\n\nI came across your work and noticed [specific observation].\n\nI specialise in helping [type of person] with ${input.split(' ').slice(0, 4).join(' ')}.\n\nRecently helped [similar client] achieve [specific result] in [timeframe].\n\nWould you be open to a 15-minute call this week to explore if there's a fit?\n\nBest,\n[Your Name]`,
    'follow-up': `🔄 FOLLOW-UP SCRIPT\n\nHi [Name],\n\nJust circling back on my last message.\n\nI know you're busy — that's exactly why I wanted to reach out.\n\nI've helped [X] similar people with ${input.split(' ').slice(0, 4).join(' ')} and the results have been strong.\n\nIf now isn't the right time, no worries at all. Just let me know and I'll check back in a month.\n\nEither way, hope business is going well!\n\n[Your name]`
  };
  return templates[t] || templates.dm;
}

function generateOffer() {
  if (!checkGenLimit()) return;
  const input = document.getElementById('offer-input').value.trim();
  if (!input) { showToast('Describe your skill or idea first.', 'error'); S.aiGensLeft++; saveState(); return; }
  const res = document.getElementById('offer-result');
  const body = document.getElementById('offer-result-body');
  res.classList.remove('hidden');
  body.textContent = '';
  typeOut(body, buildOfferOutput(input), 6);
  showToast('Offer generated! ⚡', 'success');
}

function generateContent() {
  if (!checkGenLimit()) return;
  const input = document.getElementById('content-input').value.trim();
  if (!input) { showToast('Describe your offer first.', 'error'); S.aiGensLeft++; saveState(); return; }
  const res = document.getElementById('content-result');
  const body = document.getElementById('content-result-body');
  res.classList.remove('hidden');
  body.textContent = '';
  typeOut(body, buildContentOutput(input), 4);
  showToast('Content ready! 📣', 'success');
}

function generateOutreach() {
  if (!checkGenLimit()) return;
  const input = document.getElementById('outreach-input').value.trim();
  if (!input) { showToast('Describe who you are reaching out to.', 'error'); S.aiGensLeft++; saveState(); return; }
  const res = document.getElementById('outreach-result');
  const body = document.getElementById('outreach-result-body');
  res.classList.remove('hidden');
  body.textContent = '';
  typeOut(body, buildOutreachOutput(input), 5);
  showToast('Script ready! 📩', 'success');
}

function refineOffer() {
  if (!checkGenLimit()) return;
  const input = document.getElementById('offer-input').value.trim() || 'my skill';
  const body = document.getElementById('offer-result-body');
  const extra = '\n\n— REFINED VERSION —\nBased on your input, here is a tighter, higher-converting version:\n\n"[SPECIFIC SKILL] for [SPECIFIC PERSON] so they can [SPECIFIC RESULT] in [TIMEFRAME] — guaranteed."\n\nThis version converts 3x better because it is specific.';
  typeOut(body, body.textContent + extra, 8);
}

function typeOut(el, text, speed) {
  let i = 0;
  el.textContent = '';
  const t = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(t);
  }, speed);
}

function copyResult(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => showToast('Copied to clipboard!', 'success'));
}

/* ── TRACK ────────────────────────────────────────── */
let currentLogType = 'expense';
let currentCategory = 'food';
let currentCardType = 'credit';
let receiptData = null;
let voiceRecognition = null;
let voiceActive = false;

function switchLogType(btn) {
  document.querySelectorAll('.log-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentLogType = btn.dataset.t;
  currentCategory = currentLogType === 'income' ? 'freelance' : 'food';
  document.getElementById('cat-grid-wrap').classList.toggle('hidden', currentLogType === 'income');
  document.getElementById('income-source-wrap').classList.toggle('hidden', currentLogType === 'expense');
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.c === currentCategory);
  });
  // Update amount symbol
  const sym = document.getElementById('amount-sym');
  if (sym) sym.textContent = S.currency;
}

function pickCat(btn) {
  const grid = btn.closest('.cat-grid');
  if (grid) grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  currentCategory = btn.dataset.c;
}

function pickCardType(btn) {
  document.querySelectorAll('.card-pill').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  currentCardType = btn.dataset.ct;
}

function toggleCardTrack() {
  const fields = document.getElementById('card-fields');
  const arrow = document.getElementById('card-track-arrow');
  const open = fields.classList.toggle('hidden');
  if (arrow) arrow.textContent = open ? '›' : '⌄';
}

/* ── VOICE LOG ─────────────────────────────────── */
function toggleVoiceLog() {
  if (voiceActive) {
    stopVoiceLog();
  } else {
    startVoiceLog();
  }
}

function startVoiceLog() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Voice not supported on this browser.', 'error');
    return;
  }
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = 'en-US';

  const btn = document.getElementById('mic-btn');
  const hint = document.getElementById('voice-hint');
  btn.classList.add('recording');
  voiceActive = true;
  hint.textContent = 'Listening… speak now';

  voiceRecognition.onresult = (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    hint.textContent = '"' + transcript + '"';
    if (e.results[e.results.length - 1].isFinal) {
      parseVoiceInput(transcript);
      stopVoiceLog();
    }
  };

  voiceRecognition.onerror = () => {
    stopVoiceLog();
    showToast('Could not hear you. Try again.', 'error');
    hint.textContent = '"Spent $12 on coffee" or "Got paid $500 from client"';
  };

  voiceRecognition.onend = () => stopVoiceLog();
  voiceRecognition.start();
}

function stopVoiceLog() {
  voiceActive = false;
  if (voiceRecognition) { try { voiceRecognition.stop(); } catch(e) {} voiceRecognition = null; }
  const btn = document.getElementById('mic-btn');
  if (btn) btn.classList.remove('recording');
}

function parseVoiceInput(text) {
  const t = text.toLowerCase();
  // Detect amount: $12, 12 dollars, 12.50
  const amtMatch = t.match(/\$([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|rupees?|pounds?|euros?)?/);
  const amt = amtMatch ? parseFloat((amtMatch[1] || amtMatch[2]).replace(/,/g, '')) : null;

  // Detect type: income words
  const incomeWords = ['paid','received','earned','got paid','income','payment','salary','client paid','invoice','got','collected'];
  const isIncome = incomeWords.some(w => t.includes(w));
  const type = isIncome ? 'income' : 'expense';

  // Detect category from voice
  const catKeywords = {
    food: ['food','lunch','dinner','breakfast','ate','restaurant','eating','meal'],
    coffee: ['coffee','cafe','starbucks','latte','espresso'],
    transport: ['uber','ola','taxi','cab','auto','bus','metro','petrol','fuel','gas','ride','transport'],
    shopping: ['shopping','amazon','clothes','shoes','shirt','bought','purchase'],
    groceries: ['grocery','groceries','vegetables','milk','supermarket','mart'],
    bills: ['bill','electricity','water','rent','wifi','internet','phone bill','utility'],
    entertainment: ['movie','netflix','spotify','game','fun','entertainment','concert','show'],
    health: ['doctor','medicine','pharmacy','medical','health','gym'],
    subscription: ['subscription','membership','netflix','spotify','prime','annual'],
    tools: ['tools','software','app','plugin','saas'],
    ads: ['ads','advertising','facebook ads','google ads','campaign'],
    freelance: ['freelance','project','contract'],
    client: ['client','customer'],
    salary: ['salary','paycheck'],
    investment: ['investment','dividend','interest']
  };
  let detectedCat = type === 'income' ? 'client' : 'other';
  for (const [cat, words] of Object.entries(catKeywords)) {
    if (words.some(w => t.includes(w))) { detectedCat = cat; break; }
  }

  // Fill the form
  if (amt) {
    document.getElementById('tx-amount').value = amt;
  }
  // Switch type
  const typeBtn = document.getElementById('logtype-' + type);
  if (typeBtn) switchLogType(typeBtn);

  // Select category
  const catBtn = document.querySelector(`.cat-btn[data-c="${detectedCat}"]`);
  if (catBtn) pickCat(catBtn);

  // Extract note: remove amount and action words
  const cleanNote = text.replace(/\$[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:dollars?|bucks?|rupees?)/gi, '').replace(/^(spent|paid|got paid|received|earned|bought|used for)\s*/i, '').trim();
  const noteEl = document.getElementById('tx-note');
  if (noteEl && cleanNote.length > 2 && cleanNote.length < 80) noteEl.value = cleanNote;

  const hint = document.getElementById('voice-hint');
  hint.textContent = amt ? `Filled ${type}: ${S.currency}${amt} · ${detectedCat}` : 'Could not detect amount. Fill manually.';
  setTimeout(() => { hint.textContent = '"Spent $12 on coffee" or "Got paid $500 from client"'; }, 4000);

  if (amt) showToast('Voice parsed! Tap Save to confirm.', 'success');
}

/* ── RECEIPT HANDLING ──────────────────────────── */
function handleReceipt(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    receiptData = ev.target.result;
    const thumb = document.getElementById('receipt-thumb');
    const img = document.getElementById('receipt-img');
    const nameEl = document.getElementById('receipt-thumb-name');
    img.src = receiptData;
    if (nameEl) nameEl.textContent = file.name || 'Receipt attached';
    thumb.classList.remove('hidden');
    document.getElementById('receipt-scan-status').textContent = '';
  };
  reader.readAsDataURL(file);
}

function scanReceiptOCR() {
  if (!receiptData) {
    // Open file picker first
    document.getElementById('receipt-file').click();
    setTimeout(() => {
      if (receiptData) runOCRScan();
    }, 2000);
    return;
  }
  runOCRScan();
}

function runOCRScan() {
  const statusEl = document.getElementById('receipt-scan-status');
  const scanBtn = document.getElementById('scan-receipt-btn');
  if (statusEl) statusEl.textContent = 'Scanning…';
  if (scanBtn) scanBtn.classList.add('scanning');

  // Simulate OCR by parsing the image filename / data URL length as a proxy
  // In production this would call a real OCR API (Tesseract.js or backend)
  setTimeout(() => {
    if (scanBtn) scanBtn.classList.remove('scanning');
    // Try to extract amount from the image data (heuristic: data length → mock amounts)
    // Real OCR: use Tesseract.js parseFromBase64 → regex on text
    const mockAmounts = [12.50, 34.99, 89.00, 245.00, 1299.00, 56.80, 22.40];
    const mockCategories = ['food', 'shopping', 'bills', 'entertainment', 'health', 'groceries', 'transport'];
    const seed = receiptData.length % mockAmounts.length;
    const detectedAmt = mockAmounts[seed];
    const detectedCat = mockCategories[seed];

    document.getElementById('tx-amount').value = detectedAmt;
    const catBtn = document.querySelector(`.cat-btn[data-c="${detectedCat}"]`);
    if (catBtn) { pickCat(catBtn); }
    if (statusEl) statusEl.textContent = `✓ Auto-filled ${S.currency}${detectedAmt}`;
    showToast(`Receipt scanned: ${S.currency}${detectedAmt} · ${detectedCat}`, 'success');
  }, 1200);
}

function rmReceipt() {
  receiptData = null;
  document.getElementById('receipt-thumb').classList.add('hidden');
  document.getElementById('receipt-file').value = '';
  const s = document.getElementById('receipt-scan-status');
  if (s) s.textContent = '';
}

/* ── SAVE TRANSACTION ──────────────────────────── */
function saveTransaction() {
  const amtEl = document.getElementById('tx-amount');
  const amt = parseFloat(amtEl.value);
  if (!amt || amt <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  const note = document.getElementById('tx-note').value.trim();

  // Card data
  const cardName = (document.getElementById('card-name') || {}).value || '';
  const cardLast4 = (document.getElementById('card-last4') || {}).value || '';
  const cardDue = (document.getElementById('card-due') || {}).value || '';
  const hasCard = cardName.trim().length > 0;

  const tx = {
    id: 'tx_' + Date.now(),
    type: currentLogType,
    amount: amt,
    category: currentCategory,
    note,
    date: new Date().toISOString(),
    receipt: receiptData || null,
    card: hasCard ? {
      name: cardName.trim(),
      last4: cardLast4.trim().slice(-4),
      due: cardDue,
      type: currentCardType
    } : null
  };
  S.transactions.push(tx);

  // Track card in cards list for due date reminders
  if (hasCard && cardDue) {
    const cardKey = (cardName.trim() + cardLast4.trim()).toLowerCase();
    const existing = S.cards.findIndex(c => (c.name + c.last4).toLowerCase() === cardKey);
    if (existing >= 0) {
      S.cards[existing].due = cardDue;
    } else {
      S.cards.push({ name: cardName.trim(), last4: cardLast4.trim().slice(-4), due: cardDue, type: currentCardType });
    }
  }

  saveState();
  amtEl.value = '';
  document.getElementById('tx-note').value = '';
  if (document.getElementById('card-name')) document.getElementById('card-name').value = '';
  if (document.getElementById('card-last4')) document.getElementById('card-last4').value = '';
  if (document.getElementById('card-due')) document.getElementById('card-due').value = '';
  rmReceipt();
  showToast(currentLogType === 'income' ? '💰 Income logged!' : '💸 Expense logged!', 'success');
  updateTxFeed();
  updateDueDates();
  updateHomeScreen();
}

function updateTxFeed() {
  const feed = document.getElementById('tx-feed-full');
  const count = document.getElementById('tx-count');
  if (!feed) return;
  if (count) count.textContent = S.transactions.length;
  if (!S.transactions.length) {
    feed.innerHTML = '<div class="tx-empty">No transactions yet.</div>';
    return;
  }
  feed.innerHTML = [...S.transactions].reverse().map(tx => txHTML(tx)).join('');
  updateDueDates();
}

function updateDueDates() {
  const feed = document.getElementById('due-dates-feed');
  const header = document.getElementById('due-dates-header');
  if (!feed) return;

  const today = new Date();
  const soon = new Date(today); soon.setDate(today.getDate() + 30);

  // Gather all cards with due dates from S.cards + from transactions
  const cardMap = {};
  S.transactions.forEach(tx => {
    if (tx.card && tx.card.due) {
      const key = (tx.card.name + tx.card.last4).toLowerCase();
      cardMap[key] = tx.card;
    }
  });
  S.cards.forEach(c => {
    const key = (c.name + c.last4).toLowerCase();
    cardMap[key] = c;
  });

  const dueCards = Object.values(cardMap).filter(c => c.due);
  if (!dueCards.length) {
    if (header) header.style.display = 'none';
    feed.innerHTML = '';
    return;
  }
  if (header) header.style.display = '';

  dueCards.sort((a, b) => new Date(a.due) - new Date(b.due));
  feed.innerHTML = dueCards.map(c => {
    const dueDate = new Date(c.due);
    const diff = Math.ceil((dueDate - today) / 86400000);
    let urgency = 'due-ok';
    let label = 'Due in ' + diff + ' days';
    if (diff < 0) { urgency = 'due-overdue'; label = 'Overdue by ' + Math.abs(diff) + ' days'; }
    else if (diff <= 3) { urgency = 'due-critical'; label = diff === 0 ? 'Due TODAY' : 'Due in ' + diff + ' day' + (diff !== 1 ? 's' : ''); }
    else if (diff <= 7) { urgency = 'due-warn'; }

    // Total owed on this card this month
    const now = new Date();
    const monthOwed = S.transactions
      .filter(t => t.type === 'expense' && t.card && (t.card.name + t.card.last4).toLowerCase() === (c.name + c.last4).toLowerCase())
      .filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((sum, t) => sum + t.amount, 0);

    return `<div class="due-card glass-card ${urgency}">
      <div class="due-card-left">
        <div class="due-card-icon">${c.type === 'credit' ? '💳' : c.type === 'debit' ? '🏦' : '📱'}</div>
        <div class="due-card-info">
          <div class="due-card-name">${c.name}${c.last4 ? ' ••' + c.last4 : ''}</div>
          <div class="due-card-sub">${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${c.type}</div>
        </div>
      </div>
      <div class="due-card-right">
        ${monthOwed > 0 ? `<div class="due-card-owed">${fmt(monthOwed)}</div><div class="due-card-owed-lbl">this month</div>` : ''}
        <div class="due-chip ${urgency}">${label}</div>
      </div>
    </div>`;
  }).join('');
}

function deleteTx(id) {
  S.transactions = S.transactions.filter(t => t.id !== id);
  saveState();
  updateTxFeed();
  updateHomeScreen();
  showToast('Deleted.', 'success');
}

/* ── INSIGHTS ─────────────────────────────────────── */
let incomeChartInst = null;
let catChartInst = null;

function initInsights() {
  calcHealth();
  buildAdvice();
  buildCharts();
}

function calcHealth() {
  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = inc - spent;
  const margin = inc > 0 ? profit / inc : 0;
  const savingsRate = inc > 0 ? Math.max(0, profit / inc) : 0;
  const burnRate = spent / 30;
  const runwayMonths = burnRate > 0 && inc > 0 ? (inc / burnRate).toFixed(1) : '—';

  let score = 0;
  if (margin > 0.5) score += 35; else if (margin > 0.2) score += 20; else if (margin > 0) score += 10;
  if (inc > 0) score += 25;
  if (S.budget > 0 && spent < S.budget) score += 20; else if (!S.budget) score += 10;
  if (S.transactions.length > 5) score += 10;
  if (runwayMonths !== '—' && parseFloat(runwayMonths) > 3) score += 10;
  score = Math.min(100, score);

  const ringFill = document.getElementById('health-ring-fill');
  if (ringFill) {
    const circ = 263.9;
    const offset = circ - (score / 100) * circ;
    setTimeout(() => { ringFill.style.strokeDashoffset = offset; }, 100);
  }
  el('health-score', score);
  el('hb-margin', inc > 0 ? (margin * 100).toFixed(0) + '%' : '—');
  el('hb-runway', runwayMonths !== '—' ? runwayMonths + ' mo' : '—');
  el('hb-burn', fmt(burnRate) + '/day');
  el('hb-savings', inc > 0 ? (savingsRate * 100).toFixed(0) + '%' : '—');

  // Add gradient to SVG
  const svg = document.querySelector('.health-ring');
  if (svg && !svg.querySelector('defs')) {
    svg.insertAdjacentHTML('afterbegin', '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs>');
  }
}

function buildAdvice() {
  const feed = document.getElementById('advice-feed');
  if (!feed) return;
  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  if (!monthTx.length) {
    feed.innerHTML = '<div class="advice-empty">Log some transactions to get personalised AI advice.</div>';
    return;
  }
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const advice = [];

  if (inc === 0) advice.push({ icon: '⚡', text: 'No income logged this month. Use the Make Money tools to generate an offer and start outreach today.' });
  if (spent > inc && inc > 0) advice.push({ icon: '🚨', text: `You are spending more than you earn. Cut the top expense category immediately.` });
  if (inc > 0 && (inc - spent) / inc > 0.4) advice.push({ icon: '🎯', text: `Profit margin of ${((inc - spent) / inc * 100).toFixed(0)}% is healthy. Reinvest 20% into ads or tools to scale.` });
  const subs = monthTx.filter(t => t.category === 'subscription').reduce((s, t) => s + t.amount, 0);
  if (subs > 100) advice.push({ icon: '✂️', text: `${fmt(subs)} in subscriptions this month. Audit and cut any you haven't used in 30 days.` });
  if (monthTx.length < 5) advice.push({ icon: '📊', text: 'Log more transactions for better AI accuracy. More data = more precise advice.' });
  if (S.budget > 0 && spent > S.budget * 0.8) advice.push({ icon: '⚠️', text: `You have used ${((spent / S.budget) * 100).toFixed(0)}% of your monthly budget. Slow down spending.` });
  advice.push({ icon: '💡', text: `Focus on one income stream this week: the one closest to generating revenue.` });

  feed.innerHTML = advice.map(a => `<div class="advice-card">${a.icon} ${a.text}</div>`).join('');
}

function askAI() {
  const input = document.getElementById('ask-input');
  const resultEl = document.getElementById('ask-result');
  if (!input || !resultEl) return;
  const q = input.value.trim();
  if (!q) return;
  if (!checkGenLimit()) return;

  resultEl.classList.remove('hidden');
  resultEl.textContent = 'Thinking…';

  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  setTimeout(() => {
    let answer = `Based on your data this month (income: ${fmt(inc)}, expenses: ${fmt(spent)}): `;
    const ql = q.toLowerCase();
    if (ql.includes('increas') || ql.includes('more money') || ql.includes('earn')) {
      answer += `To increase income, focus on upselling existing clients first — it's 5x easier than finding new ones. Then launch one outreach campaign targeting 10 prospects per day using the Outreach tool.`;
    } else if (ql.includes('save') || ql.includes('cut') || ql.includes('reduc')) {
      answer += `Identify your top 3 expense categories and cut the non-essential one by 50%. Then automate ${Math.min(20, 20)}% of profit into a separate savings account the moment it arrives.`;
    } else if (ql.includes('invest')) {
      answer += `Build a ${S.budget > 0 ? '3-6 month' : '6-month'} cash runway before investing. With your current burn rate, focus on cash-flowing assets like client work before moving to passive investments.`;
    } else if (ql.includes('runway') || ql.includes('survive') || ql.includes('budget')) {
      answer += `At your current burn rate of ${fmt(spent / 30)}/day, ensure you have ${fmt(spent * 3)} saved as minimum runway. Set a hard budget cap and review it weekly.`;
    } else {
      answer += `Key insight: your profit is ${fmt(inc - spent)}. The fastest lever for your situation (${S.situation || 'entrepreneur'}) is increasing frequency of income before optimising expenses.`;
    }
    typeOut(resultEl, answer, 8);
  }, 600);
}

function buildCharts() {
  const last7 = getLast7DayData();
  buildIncomeChart(last7);
  buildCatChart();
}

function getLast7DayData() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayStr = d.toDateString();
    const dayTx = S.transactions.filter(t => new Date(t.date).toDateString() === dayStr);
    days.push({
      label,
      income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    });
  }
  return days;
}

function buildIncomeChart(data) {
  const canvas = document.getElementById('income-chart');
  if (!canvas) return;
  if (incomeChartInst) { incomeChartInst.destroy(); incomeChartInst = null; }
  incomeChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Income', data: data.map(d => d.income), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, borderSkipped: false },
        { label: 'Expenses', data: data.map(d => d.expense), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: 'rgba(240,244,255,0.6)', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 11 } } }
      }
    }
  });
}

function buildCatChart() {
  const canvas = document.getElementById('cat-chart');
  if (!canvas) return;
  if (catChartInst) { catChartInst.destroy(); catChartInst = null; }
  const expTx = S.transactions.filter(t => t.type === 'expense');
  if (!expTx.length) return;
  const catMap = {};
  expTx.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const labels = Object.keys(catMap);
  const vals = Object.values(catMap);
  const colors = ['#10b981','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#8b5cf6','#14b8a6','#64748b'];
  catChartInst = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: vals, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: 'rgba(240,244,255,0.6)', font: { size: 11 }, padding: 12 } } },
      cutout: '65%'
    }
  });
}

/* ── CALENDAR ─────────────────────────────────────── */
let calYear, calMonth;

function renderCalendar() {
  const now = new Date();
  if (!calYear) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  const first = new Date(calYear, calMonth, 1).getDay();
  const days = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  el('cal-month', monthName);
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  let html = '';
  for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= days; d++) {
    const dateStr = new Date(calYear, calMonth, d).toDateString();
    const dayTx = S.transactions.filter(t => new Date(t.date).toDateString() === dateStr);
    const hasInc = dayTx.some(t => t.type === 'income');
    const hasExp = dayTx.some(t => t.type === 'expense');
    const isToday = dateStr === now.toDateString();
    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (dayTx.length) cls += hasInc ? ' has-income' : ' has-tx';
    html += `<div class="${cls}" onclick="selectDay(${d})">${d}</div>`;
  }
  grid.innerHTML = html;
}

function selectDay(d) {
  document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
  const cells = document.querySelectorAll('.cal-day:not(.empty)');
  if (cells[d - 1]) cells[d - 1].classList.add('selected');
  const dateStr = new Date(calYear, calMonth, d).toDateString();
  const dayTx = S.transactions.filter(t => new Date(t.date).toDateString() === dateStr);
  const head = document.getElementById('cal-detail-head');
  const total = document.getElementById('cal-detail-total');
  const list = document.getElementById('cal-detail-list');
  if (!head) return;
  head.textContent = new Date(calYear, calMonth, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (!dayTx.length) {
    total.textContent = '';
    list.innerHTML = '<p class="cal-empty-msg">No transactions on this day.</p>';
    return;
  }
  const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  total.textContent = 'Income: ' + fmt(inc) + ' · Spent: ' + fmt(exp);
  list.innerHTML = dayTx.map(tx => txHTML(tx)).join('');
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
  updateMonthStats();
}

function updateMonthStats() {
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  el('ms-income', fmt(inc));
  el('ms-spent', fmt(spent));
  el('ms-profit', fmt(inc - spent));
}

/* ── SETTINGS ─────────────────────────────────────── */
function initSettings() {
  if (S.user) {
    el('p-name', S.user.name || 'Imperium User');
    const av = document.getElementById('pav-icon');
    if (av && S.user.name) av.textContent = S.user.name[0].toUpperCase();
  }
  el('p-sub', 'Goal: ' + (S.goal || '—'));
  el('p-streak', S.streak + ' day streak 🔥');
  el('s-budget', S.budget > 0 ? fmt(S.budget) + '/mo' : 'Not set');
  el('s-currency', S.currency + ' ' + (S.currency === '$' ? 'USD' : S.currency === '€' ? 'EUR' : 'GBP'));
  const nd = document.getElementById('n-daily');
  const nb = document.getElementById('n-budget');
  if (nd) nd.checked = S.notifDaily;
  if (nb) nb.checked = S.notifBudget;
}

function openBudgetModal() {
  const m = document.getElementById('modal-budget');
  if (m) { m.classList.remove('hidden'); document.getElementById('budget-val').value = S.budget || ''; }
}
function closeBudgetModal() { const m = document.getElementById('modal-budget'); if (m) m.classList.add('hidden'); }
function saveBudget() {
  const v = parseFloat(document.getElementById('budget-val').value);
  if (v > 0) { S.budget = v; saveState(); el('s-budget', fmt(v) + '/mo'); showToast('Budget set!', 'success'); }
  closeBudgetModal();
}

function openCurrencyModal() {
  const currencies = ['$', '€', '£', '₹', '¥', 'A$', 'C$'];
  const idx = currencies.indexOf(S.currency);
  S.currency = currencies[(idx + 1) % currencies.length];
  saveState();
  el('s-currency', S.currency);
  showToast('Currency: ' + S.currency, 'success');
}

function openProModal() { const m = document.getElementById('modal-pro'); if (m) m.classList.remove('hidden'); }
function closeProModal() { const m = document.getElementById('modal-pro'); if (m) m.classList.add('hidden'); }

function exportData() {
  const data = JSON.stringify({ transactions: S.transactions, settings: { budget: S.budget, currency: S.currency } }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'imperium-export.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

function resetApp() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  S.transactions = [];
  S.budget = 0;
  S.streak = 0;
  S.aiGensLeft = 3;
  saveState();
  updateHomeScreen();
  showToast('Data cleared.', 'success');
}

/* ── STREAK ───────────────────────────────────────── */
function updateStreak() {
  const today = new Date().toDateString();
  if (S.lastLogin === today) return;
  if (S.lastLogin) {
    const last = new Date(S.lastLogin);
    const diff = (new Date(today) - last) / 86400000;
    if (diff <= 1.5) S.streak++;
    else S.streak = 1;
  } else {
    S.streak = 1;
  }
  S.lastLogin = today;
  S.aiGensLeft = 3;
  saveState();
}

/* ── TOAST ────────────────────────────────────────── */
function showToast(msg, type) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast ' + (type || '');
  requestAnimationFrame(() => { t.offsetHeight; t.classList.add('show'); });
  setTimeout(() => { t.classList.remove('show'); }, 2800);
}

/* ── PARTICLES ────────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  let mouseX = -9999, mouseY = -9999;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1
    });
  }

  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      const dx = mouseX - p.x, dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        p.vx -= (dx / dist) * 0.06;
        p.vy -= (dy / dist) * 0.06;
      }
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.98; p.vy *= 0.98;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(96,165,250,${p.alpha})`;
      ctx.fill();
    });
    // Connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(96,165,250,${0.08 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}

/* ── BEAMS CANVAS ─────────────────────────────────── */
function initBeams() {
  const canvas = document.getElementById('beams-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);
  const beams = Array.from({ length: 6 }, (_, i) => ({
    x: (i / 5) * window.innerWidth,
    y: 0,
    angle: Math.PI / 6 + (Math.random() - 0.5) * 0.3,
    speed: 0.0008 + Math.random() * 0.0008,
    phase: Math.random() * Math.PI * 2,
    color: i % 2 === 0 ? '59,130,246' : '168,85,247'
  }));
  function loop() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now();
    beams.forEach(b => {
      const alpha = 0.03 + 0.02 * Math.sin(t * b.speed + b.phase);
      const grad = ctx.createLinearGradient(b.x, 0, b.x + Math.tan(b.angle) * H, H);
      grad.addColorStop(0, `rgba(${b.color},0)`);
      grad.addColorStop(0.4, `rgba(${b.color},${alpha})`);
      grad.addColorStop(1, `rgba(${b.color},0)`);
      ctx.beginPath();
      ctx.moveTo(b.x, 0);
      ctx.lineTo(b.x + Math.tan(b.angle) * H + 60, H);
      ctx.lineTo(b.x + Math.tan(b.angle) * H - 60, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ── CURSOR GLOW ─────────────────────────────────── */
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  let cx = -9999, cy = -9999;
  let ax = cx, ay = cy;
  document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
  function update() {
    ax += (cx - ax) * 0.12;
    ay += (cy - ay) * 0.12;
    glow.style.left = ax + 'px';
    glow.style.top = ay + 'px';
    requestAnimationFrame(update);
  }
  update();
}

/* ── MAGNETIC BUTTONS ─────────────────────────────── */
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) * 0.22;
      const dy = (e.clientY - cy) * 0.22;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0,0)';
    });
  });
}

/* ── COMMAND PALETTE ──────────────────────────────── */
const COMMANDS = [
  { icon: '🏠', label: 'Go to Home',        action: () => navigateTo('screen-home'),     badge: '' },
  { icon: '⚡', label: 'Make Money',         action: () => navigateTo('screen-make'),     badge: '' },
  { icon: '➕', label: 'Log Transaction',    action: () => navigateTo('screen-track'),    badge: 'Track' },
  { icon: '🧠', label: 'AI Insights',        action: () => navigateTo('screen-insights'), badge: '' },
  { icon: '📅', label: 'Calendar',           action: () => navigateTo('screen-calendar'), badge: '' },
  { icon: '⚙️', label: 'Settings',           action: () => navigateTo('screen-settings'), badge: '' },
  { icon: '💡', label: 'Generate Offer',     action: () => { navigateTo('screen-make'); switchMakeTab('offer'); }, badge: 'AI' },
  { icon: '📣', label: 'Generate Content',   action: () => { navigateTo('screen-make'); switchMakeTab('content'); }, badge: 'AI' },
  { icon: '📩', label: 'Generate Outreach',  action: () => { navigateTo('screen-make'); switchMakeTab('outreach'); }, badge: 'AI' },
  { icon: '🎯', label: 'Set Monthly Budget', action: openBudgetModal,                     badge: '' },
  { icon: '📤', label: 'Export Data',        action: exportData,                          badge: '' },
  { icon: '💳', label: 'Upgrade to Pro',     action: openProModal,                        badge: 'PRO' }
];

let cmdFocusIdx = 0;
let filteredCmds = [...COMMANDS];

function openCommand() {
  const overlay = document.getElementById('cmd-overlay');
  const input = document.getElementById('cmd-input');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  filteredCmds = [...COMMANDS];
  renderCmdList();
  if (input) { input.value = ''; input.focus(); }
  cmdFocusIdx = 0;
}

function closeCommand() {
  const overlay = document.getElementById('cmd-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function filterCommands(q) {
  const ql = q.toLowerCase();
  filteredCmds = COMMANDS.filter(c => c.label.toLowerCase().includes(ql));
  cmdFocusIdx = 0;
  renderCmdList();
}

function renderCmdList() {
  const list = document.getElementById('cmd-list');
  if (!list) return;
  if (!filteredCmds.length) {
    list.innerHTML = '<div class="cmd-empty">No commands match your search.</div>';
    return;
  }
  list.innerHTML = filteredCmds.map((c, i) => `
    <div class="cmd-item${i === cmdFocusIdx ? ' focused' : ''}" onclick="execCmd(${i})">
      <span class="cmd-item-icon">${c.icon}</span>
      <span class="cmd-item-label">${c.label}</span>
      ${c.badge ? `<span class="cmd-item-badge">${c.badge}</span>` : ''}
    </div>
  `).join('');
}

function execCmd(i) {
  closeCommand();
  setTimeout(() => filteredCmds[i] && filteredCmds[i].action(), 150);
}

function cmdKeyNav(e) {
  if (e.key === 'ArrowDown') { cmdFocusIdx = Math.min(cmdFocusIdx + 1, filteredCmds.length - 1); renderCmdList(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { cmdFocusIdx = Math.max(cmdFocusIdx - 1, 0); renderCmdList(); e.preventDefault(); }
  if (e.key === 'Enter') { execCmd(cmdFocusIdx); e.preventDefault(); }
  if (e.key === 'Escape') { closeCommand(); }
}

// Keyboard shortcut: Cmd/Ctrl + K
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCommand(); }
  if (e.key === 'Escape') { closeCommand(); }
});

/* ── GLOBAL EFFECTS ───────────────────────────────── */
function initGlobalEffects() {
  initCursorGlow();
  initMagnetic();
  // Refresh magnetic on screen changes
  setInterval(initMagnetic, 2000);
}

/* ── BOOT ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  runBoot();
});
