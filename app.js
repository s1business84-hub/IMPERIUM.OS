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
  document.getElementById('ob-next-1').disabled = false;
}

function pickGoal(btn) {
  document.querySelectorAll('#ob-2 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.goal = btn.dataset.v;
  document.getElementById('ob-next-2').disabled = false;
}

function pickIncome(btn) {
  document.querySelectorAll('#ob-3 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.income = parseInt(btn.dataset.v) || 0;
  document.getElementById('ob-next-3').disabled = false;
}

function goObStep(n) {
  const prev = document.getElementById('ob-' + obStep);
  const next = document.getElementById('ob-' + n);
  const forward = n > obStep;

  // Slide out current
  prev.classList.add(forward ? 'ob-exit-left' : 'ob-exit-right');
  setTimeout(() => {
    prev.classList.remove('ob-slide-active', 'ob-exit-left', 'ob-exit-right');
  }, 320);

  // Slide in next
  next.classList.add(forward ? 'ob-enter-right' : 'ob-enter-left');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    next.classList.add('ob-slide-active');
    next.classList.remove('ob-enter-right', 'ob-enter-left');
  }));

  obStep = n;

  // Progress bar
  document.getElementById('ob-fill').style.width = (n / 3 * 100) + '%';

  // Dots
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i < n));

  // Step label
  document.getElementById('ob-step-label').textContent = n + ' of 3';

  // Back button
  const back = document.getElementById('ob-back');
  back.style.visibility = n > 1 ? 'visible' : 'hidden';
}

function obBack() {
  if (obStep > 1) goObStep(obStep - 1);
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
let incomeDailyChartInst = null;
let forecastChartInst = null;
let currentInsTab = 'overview';
let chartRangeDays = 7;
let askVoiceRecognition = null;
let askVoiceActive = false;

function switchInsTab(t) {
  document.querySelectorAll('.ins-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ins-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('itab-' + t).classList.add('active');
  document.getElementById('ipanel-' + t).classList.add('active');
  currentInsTab = t;
  if (t === 'spending')  buildSpendingTab();
  if (t === 'income')    buildIncomeTab();
  if (t === 'forecast')  buildForecastTab();
}

function initInsights() {
  calcHealth();
  buildAdvice();
  buildMonthStrip();
  buildCharts();
  // Pre-build other tabs silently
  buildSpendingTab();
  buildIncomeTab();
  buildForecastTab();
}

/* ── HEALTH SCORE ─────────────────────────────────── */
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

  const svg = document.querySelector('.health-ring');
  if (svg && !svg.querySelector('defs')) {
    svg.insertAdjacentHTML('afterbegin', '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs>');
  }
}

/* ── MONTH COMPARISON STRIP ───────────────────────── */
function buildMonthStrip() {
  const strip = document.getElementById('ins-month-strip');
  if (!strip) return;
  const now = new Date();
  const months = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mo = d.getMonth(); const yr = d.getFullYear();
    const txs = S.transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === mo && td.getFullYear() === yr; });
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), inc, exp, profit: inc - exp });
  }
  const maxVal = Math.max(...months.map(m => Math.max(m.inc, m.exp)), 1);
  strip.innerHTML = months.map((m, i) => {
    const isNow = i === 2;
    const trend = i > 0 && months[i].profit > months[i-1].profit ? '↑' : i > 0 && months[i].profit < months[i-1].profit ? '↓' : '';
    const trendColor = trend === '↑' ? 'var(--green)' : trend === '↓' ? 'var(--red)' : 'var(--text3)';
    return `<div class="mstrip-col${isNow ? ' mstrip-now' : ''}">
      <div class="mstrip-bars">
        <div class="mstrip-bar mstrip-inc" style="height:${Math.max(4,(m.inc/maxVal)*60)}px" title="Income ${fmt(m.inc)}"></div>
        <div class="mstrip-bar mstrip-exp" style="height:${Math.max(4,(m.exp/maxVal)*60)}px" title="Spent ${fmt(m.exp)}"></div>
      </div>
      <div class="mstrip-label">${m.label}${trend ? ` <span style="color:${trendColor}">${trend}</span>` : ''}</div>
      <div class="mstrip-profit" style="color:${m.profit>=0?'var(--green)':'var(--red)'}">${fmt(m.profit)}</div>
    </div>`;
  }).join('');
}

/* ── AI ADVICE ────────────────────────────────────── */
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
  const profit = inc - spent;
  const margin = inc > 0 ? profit / inc : 0;
  const advice = [];

  // Priority-ordered advice
  if (inc === 0) {
    advice.push({ icon: '⚡', priority: 'critical', title: 'No income this month', text: 'You have zero income logged. Open the Make Money tab and generate one offer today. One client changes everything.' });
  }
  if (spent > inc && inc > 0) {
    advice.push({ icon: '🚨', priority: 'critical', title: 'Spending exceeds income', text: `You've spent ${fmt(spent)} against ${fmt(inc)} income — a ${fmt(spent-inc)} deficit. Identify and cut your top expense category immediately.` });
  }

  // Category analysis
  const catMap = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCats = Object.entries(catMap).sort((a,b) => b[1]-a[1]).slice(0,3);
  if (topCats.length) {
    const [topCat, topAmt] = topCats[0];
    const pct = spent > 0 ? (topAmt/spent*100).toFixed(0) : 0;
    advice.push({ icon: '🔍', priority: 'warn', title: `${topCat} = ${pct}% of spending`, text: `Your top expense is ${topCat} at ${fmt(topAmt)} (${pct}% of total spend). ${pct > 40 ? 'This is unusually high — consider setting a hard cap.' : 'Monitor this category weekly.'}` });
  }

  // Subscription audit
  const subs = monthTx.filter(t => t.category === 'subscription').reduce((s, t) => s + t.amount, 0);
  if (subs > 50) {
    advice.push({ icon: '✂️', priority: 'warn', title: `${fmt(subs)} in subscriptions`, text: `You're paying ${fmt(subs)}/mo in subscriptions. Cancel any you haven't actively used in the last 14 days. Most people save ${fmt(subs * 0.3)}–${fmt(subs * 0.5)} doing this audit.` });
  }

  // Margin praise / push
  if (margin > 0.5) {
    advice.push({ icon: '🚀', priority: 'good', title: `${(margin*100).toFixed(0)}% profit margin`, text: `Exceptional. Reinvest 20–30% of profit into the channel generating the most leads. Double down, don't diversify yet.` });
  } else if (margin > 0.2 && inc > 0) {
    advice.push({ icon: '🎯', priority: 'good', title: `${(margin*100).toFixed(0)}% margin — keep pushing`, text: `Solid margin. To reach 50%+, focus on raising average transaction value rather than volume. One premium offer outperforms ten cheap ones.` });
  }

  // Budget usage
  if (S.budget > 0) {
    const pctUsed = (spent / S.budget * 100).toFixed(0);
    if (spent > S.budget) {
      advice.push({ icon: '⚠️', priority: 'critical', title: `Budget exceeded by ${fmt(spent-S.budget)}`, text: `You set a ${fmt(S.budget)} budget and have spent ${fmt(spent)}. Freeze all non-essential spending for the rest of the month.` });
    } else if (spent > S.budget * 0.8) {
      advice.push({ icon: '⚠️', priority: 'warn', title: `${pctUsed}% of budget used`, text: `Only ${fmt(S.budget-spent)} remains. Slow down spending — you have the rest of the month ahead.` });
    }
  }

  // Income diversification
  const incSources = {};
  monthTx.filter(t => t.type === 'income').forEach(t => { incSources[t.category] = (incSources[t.category] || 0) + t.amount; });
  const srcCount = Object.keys(incSources).length;
  if (srcCount === 1 && inc > 0) {
    advice.push({ icon: '⚡', priority: 'warn', title: 'Single income source', text: `100% of your income comes from one source. Add a second stream — even ${fmt(inc * 0.2)} extra/mo from a side service de-risks your finances significantly.` });
  }

  // Data density
  if (monthTx.length < 5) {
    advice.push({ icon: '📊', priority: 'info', title: 'Need more data', text: `You have ${monthTx.length} transaction${monthTx.length !== 1 ? 's' : ''} logged this month. Log at least 10 for the AI to give you precise, actionable advice.` });
  }

  // Always-on strategic tip
  const tips = [
    { icon: '💡', title: 'Price anchoring', text: 'Always present a premium option 3× your target price. It makes your actual price look like a deal, increasing conversions by up to 30%.' },
    { icon: '💡', title: 'Weekly money review', text: 'Spend 10 minutes every Sunday reviewing your week\'s transactions. Awareness alone reduces spending by 15% on average.' },
    { icon: '💡', title: 'Separate accounts', text: 'Keep income and expenses in separate accounts. When you can see profit sitting untouched, you spend less of it.' },
    { icon: '💡', title: 'Invoice frequency', text: 'Bill clients weekly, not monthly. Shorter payment cycles improve cash flow without raising prices.' }
  ];
  advice.push({ ...tips[S.transactions.length % tips.length], priority: 'info' });

  const priorityOrder = { critical: 0, warn: 1, good: 2, info: 3 };
  advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  feed.innerHTML = advice.map(a => `
    <div class="advice-card advice-${a.priority}">
      <div class="advice-card-head">
        <span class="advice-icon">${a.icon}</span>
        <span class="advice-title">${a.title}</span>
      </div>
      <div class="advice-body">${a.text}</div>
    </div>`).join('');
}

/* ── SPENDING TAB ─────────────────────────────────── */
function buildSpendingTab() {
  const now = new Date();
  const allExpenses = S.transactions.filter(t => t.type === 'expense');
  const monthExp = allExpenses.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const totalSpent = monthExp.reduce((s, t) => s + t.amount, 0);

  // Category table
  const catMap = {};
  monthExp.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const cats = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  const catIcons = { food:'🍔',coffee:'☕',transport:'🚗',shopping:'🛍️',groceries:'🛒',bills:'📄',entertainment:'🎬',health:'💊',subscription:'🔄',tools:'🛠️',ads:'📢',other:'📌',freelance:'💻',client:'🤝',product:'📦',salary:'🏦',investment:'📈' };
  const spendingTable = document.getElementById('spending-table');
  if (spendingTable) {
    if (!cats.length) {
      spendingTable.innerHTML = '<div class="ins-empty">No expenses logged this month.</div>';
    } else {
      spendingTable.innerHTML = cats.map(([cat, amt]) => {
        const pct = totalSpent > 0 ? (amt / totalSpent * 100) : 0;
        return `<div class="spend-row glass-card">
          <span class="spend-icon">${catIcons[cat] || '📌'}</span>
          <div class="spend-details">
            <div class="spend-name-row"><span class="spend-name">${cat}</span><span class="spend-amt">${fmt(amt)}</span></div>
            <div class="spend-bar-wrap"><div class="spend-bar" style="width:${pct}%"></div></div>
          </div>
          <span class="spend-pct">${pct.toFixed(0)}%</span>
        </div>`;
      }).join('');
    }
  }

  // Biggest single expenses
  const bigTx = [...monthExp].sort((a,b) => b.amount - a.amount).slice(0, 5);
  const bigList = document.getElementById('big-tx-list');
  if (bigList) {
    bigList.innerHTML = bigTx.length
      ? bigTx.map(tx => txHTML(tx)).join('')
      : '<div class="ins-empty">No expense transactions this month.</div>';
  }

  // Doughnut chart
  buildCatChart();

  // AI block
  const aiText = document.getElementById('spending-ai-text');
  if (aiText && cats.length) {
    const [topCat, topAmt] = cats[0];
    const pct = totalSpent > 0 ? (topAmt / totalSpent * 100).toFixed(0) : 0;
    const prev = getPrevMonthData();
    const prevTotal = prev.exp;
    const change = prevTotal > 0 ? ((totalSpent - prevTotal) / prevTotal * 100).toFixed(0) : null;
    const changeTxt = change !== null ? (change > 0 ? `up ${change}% vs last month` : `down ${Math.abs(change)}% vs last month`) : '';
    aiText.textContent = `Your biggest spend is ${topCat} at ${pct}% of total expenses (${fmt(topAmt)}). Total spending this month is ${fmt(totalSpent)}${changeTxt ? ', ' + changeTxt : ''}. ${cats.length > 3 ? `You're spending across ${cats.length} categories — consolidate where possible.` : ''} ${topAmt > totalSpent * 0.4 ? `Consider a ${fmt(topAmt * 0.2)}/mo hard cap on ${topCat} to free up cash.` : 'Your spending mix looks reasonably diversified.'}`;
  } else if (aiText) {
    aiText.textContent = 'No expense data yet. Log your first transaction on the Track screen.';
  }
}

/* ── INCOME TAB ───────────────────────────────────── */
function buildIncomeTab() {
  const now = new Date();
  const monthInc = S.transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalInc = monthInc.reduce((s, t) => s + t.amount, 0);
  const prev = getPrevMonthData();
  const change = prev.inc > 0 ? ((totalInc - prev.inc) / prev.inc * 100).toFixed(0) : null;

  // Stats strip
  const statsEl = document.getElementById('ins-income-stats');
  if (statsEl) {
    const avgTx = monthInc.length > 0 ? totalInc / monthInc.length : 0;
    const days = now.getDate();
    const dailyAvg = days > 0 ? totalInc / days : 0;
    const projEOM = dailyAvg * 30;
    statsEl.innerHTML = `
      <div class="inc-stat-card glass-card"><div class="inc-stat-val" style="color:var(--green)">${fmt(totalInc)}</div><div class="inc-stat-lbl">This Month</div>${change !== null ? `<div class="inc-stat-change" style="color:${change>=0?'var(--green)':'var(--red)'}">${change >= 0 ? '↑' : '↓'}${Math.abs(change)}% vs last mo</div>` : ''}</div>
      <div class="inc-stat-card glass-card"><div class="inc-stat-val">${fmt(avgTx)}</div><div class="inc-stat-lbl">Avg per Payment</div></div>
      <div class="inc-stat-card glass-card"><div class="inc-stat-val" style="color:var(--cyan)">${fmt(projEOM)}</div><div class="inc-stat-lbl">Projected EOM</div></div>`;
  }

  // Source breakdown
  const srcMap = {};
  monthInc.forEach(t => { srcMap[t.category] = (srcMap[t.category] || 0) + t.amount; });
  const sources = Object.entries(srcMap).sort((a,b) => b[1]-a[1]);
  const srcTable = document.getElementById('income-source-table');
  if (srcTable) {
    srcTable.innerHTML = sources.length
      ? sources.map(([src, amt]) => {
          const pct = totalInc > 0 ? (amt / totalInc * 100).toFixed(0) : 0;
          return `<div class="spend-row glass-card">
            <span class="spend-icon">${{freelance:'💻',client:'🤝',product:'📦',salary:'🏦',investment:'📈',other:'📌'}[src]||'💰'}</span>
            <div class="spend-details">
              <div class="spend-name-row"><span class="spend-name">${src}</span><span class="spend-amt" style="color:var(--green)">${fmt(amt)}</span></div>
              <div class="spend-bar-wrap"><div class="spend-bar" style="width:${pct}%;background:var(--green)"></div></div>
            </div>
            <span class="spend-pct">${pct}%</span>
          </div>`;
        }).join('')
      : '<div class="ins-empty">No income logged this month.</div>';
  }

  // Daily income chart
  buildIncomeDailyChart();

  // AI block
  const projEOM = now.getDate() > 0 ? (totalInc / now.getDate()) * 30 : 0;
  const aiText = document.getElementById('income-ai-text');
  if (aiText) {
    if (!monthInc.length) {
      aiText.textContent = 'No income logged this month. Use the Make Money tab to generate an offer and start outreach today.';
    } else {
      const topSrc = sources[0] ? sources[0][0] : 'unknown';
      const concentration = sources.length === 1 ? '100%' : sources[0] ? (sources[0][1]/totalInc*100).toFixed(0)+'%' : '';
      aiText.textContent = `${fmt(totalInc)} earned this month from ${sources.length} source${sources.length !== 1 ? 's' : ''}. Your primary source is ${topSrc} at ${concentration} of income. ${sources.length === 1 ? 'Single-source income is fragile — add a second stream to reduce risk.' : 'Good diversification. Focus on growing your highest-margin source.'} ${projEOM > totalInc ? `You are on track to end the month at approximately ${fmt(projEOM)}.` : ''}`;
    }
  }
}

/* ── FORECAST TAB ─────────────────────────────────── */
function buildForecastTab() {
  const now = new Date();
  const monthTx = S.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const days = now.getDate();
  const daysLeft = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate() - days;
  const dailyInc = days > 0 ? inc / days : 0;
  const dailyExp = days > 0 ? spent / days : 0;
  const projInc = dailyInc * 30;
  const projExp = dailyExp * 30;
  const projProfit = projInc - projExp;

  // Hero card
  const hero = document.getElementById('forecast-hero');
  if (hero) {
    hero.innerHTML = `
      <div class="fc-hero-row">
        <div class="fc-hero-item">
          <div class="fc-hero-label">Projected Income</div>
          <div class="fc-hero-val" style="color:var(--green)">${fmt(projInc)}</div>
        </div>
        <div class="fc-hero-item">
          <div class="fc-hero-label">Projected Spend</div>
          <div class="fc-hero-val" style="color:var(--red)">${fmt(projExp)}</div>
        </div>
        <div class="fc-hero-item">
          <div class="fc-hero-label">Projected Profit</div>
          <div class="fc-hero-val" style="color:${projProfit>=0?'var(--blue2)':'var(--red)'}">${fmt(projProfit)}</div>
        </div>
      </div>
      <div class="fc-hero-sub">${daysLeft} days left this month · based on ${days}-day average</div>`;
  }

  // Build forecast chart
  buildForecastChart(dailyInc, dailyExp);

  // Goal progress
  buildGoalProgress(projInc, projProfit);

  // AI block
  const aiText = document.getElementById('forecast-ai-text');
  if (aiText) {
    if (!monthTx.length) {
      aiText.textContent = 'No data yet. Log transactions and the AI will forecast your month-end financial position.';
    } else {
      const onTrack = projProfit > 0;
      const incGap = Math.max(0, (S.income || 5000) - projInc);
      aiText.textContent = `At your current pace you will ${onTrack ? 'profit' : 'lose'} ${fmt(Math.abs(projProfit))} this month. ${onTrack ? 'Keep this momentum.' : 'You need to either increase income or cut spending immediately.'} ${incGap > 0 ? `You are ${fmt(incGap)} short of your ${fmt(S.income)} income target — focus on closing ${Math.ceil(incGap / (inc/Math.max(monthTx.filter(t=>t.type==='income').length,1))) } more deals.` : 'You are ahead of your income target.'} Daily burn: ${fmt(dailyExp)}/day. To reach 50% margin, you need to earn ${fmt(dailyExp * 2)} per day.`;
    }
  }
}

function buildGoalProgress(projInc, projProfit) {
  const card = document.getElementById('goal-progress-card');
  if (!card) return;
  const goalLabel = { 'first-payment':'First Payment', 'replace-job':'Replace Job Income', 'scale':'Scale to 2× Revenue', 'control':'Control Spending' }[S.goal] || 'Financial Goal';
  const target = S.goal === 'replace-job' ? (S.income || 5000) : S.goal === 'scale' ? (S.income || 5000) * 2 : S.goal === 'first-payment' ? 1 : S.budget || 1000;
  const current = S.goal === 'control' ? Math.max(0, target - (S.transactions.filter(t => { const d = new Date(t.date); const n = new Date(); return t.type==='expense' && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear(); }).reduce((s,t)=>s+t.amount,0))) : projInc;
  const pct = Math.min(100, target > 0 ? (current / target * 100) : 0);
  card.innerHTML = `
    <div class="gp-title">${goalLabel}</div>
    <div class="gp-vals"><span>${fmt(current)}</span><span style="color:var(--text3)">of ${fmt(target)}</span></div>
    <div class="gp-bar-wrap"><div class="gp-bar" style="width:${pct}%"></div></div>
    <div class="gp-pct">${pct.toFixed(0)}% complete</div>`;
}

/* ── CHART RANGE ──────────────────────────────────── */
function setChartRange(days, btn) {
  chartRangeDays = days;
  document.querySelectorAll('.crp').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  buildCharts();
}

function buildCharts() {
  const data = getRangeData(chartRangeDays);
  buildIncomeChart(data);
}

function getRangeData(days) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = days <= 7
      ? d.toLocaleDateString('en-US', { weekday: 'short' })
      : days <= 30
        ? d.getDate() + ''
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStr = d.toDateString();
    const dayTx = S.transactions.filter(t => new Date(t.date).toDateString() === dayStr);
    result.push({
      label,
      income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    });
  }
  return result;
}

// kept for backward compat
function getLast7DayData() { return getRangeData(7); }

function getPrevMonthData() {
  const now = new Date();
  const mo = now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1;
  const yr = now.getMonth() - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
  const txs = S.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === mo && d.getFullYear() === yr; });
  return {
    inc: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    exp: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  };
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
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.5)', font: { size: 11 }, maxTicksLimit: 10 } },
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

function buildIncomeDailyChart() {
  const canvas = document.getElementById('income-daily-chart');
  if (!canvas) return;
  if (incomeDailyChartInst) { incomeDailyChartInst.destroy(); incomeDailyChartInst = null; }
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const labels = [], vals = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = new Date(now.getFullYear(), now.getMonth(), d).toDateString();
    const dayInc = S.transactions.filter(t => t.type === 'income' && new Date(t.date).toDateString() === dayStr).reduce((s,t) => s+t.amount, 0);
    labels.push(d);
    vals.push(dayInc);
  }
  incomeDailyChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Income', data: vals, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#10b981' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 }, maxTicksLimit: 10 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } } }
      }
    }
  });
}

function buildForecastChart(dailyInc, dailyExp) {
  const canvas = document.getElementById('forecast-chart');
  if (!canvas) return;
  if (forecastChartInst) { forecastChartInst.destroy(); forecastChartInst = null; }
  const labels = [], incData = [], expData = [], profitData = [];
  let cumInc = 0, cumExp = 0;
  const now = new Date();
  const daysLogged = now.getDate();
  // Past: actual cumulative
  for (let d = 1; d <= daysLogged; d++) {
    const dayStr = new Date(now.getFullYear(), now.getMonth(), d).toDateString();
    const dayInc = S.transactions.filter(t => t.type === 'income' && new Date(t.date).toDateString() === dayStr).reduce((s,t)=>s+t.amount,0);
    const dayExp = S.transactions.filter(t => t.type === 'expense' && new Date(t.date).toDateString() === dayStr).reduce((s,t)=>s+t.amount,0);
    cumInc += dayInc; cumExp += dayExp;
    labels.push(d); incData.push(cumInc); expData.push(cumExp); profitData.push(cumInc - cumExp);
  }
  // Future: projected
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  for (let d = daysLogged + 1; d <= daysInMonth; d++) {
    cumInc += dailyInc; cumExp += dailyExp;
    labels.push(d); incData.push(parseFloat(cumInc.toFixed(2))); expData.push(parseFloat(cumExp.toFixed(2))); profitData.push(parseFloat((cumInc - cumExp).toFixed(2)));
  }
  forecastChartInst = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: incData, borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderDash: daysLogged < labels.length ? [0] : [] },
        { label: 'Expenses', data: expData, borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0 },
        { label: 'Profit', data: profitData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.3, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: 'rgba(240,244,255,0.6)', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 }, maxTicksLimit: 10 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,244,255,0.4)', font: { size: 10 } } }
      }
    }
  });
}

/* ── ASK AI ───────────────────────────────────────── */
function askQuick(q) {
  const input = document.getElementById('ask-input');
  if (input) input.value = q;
  askAI();
}

function toggleAskMic() {
  if (askVoiceActive) {
    stopAskMic();
  } else {
    startAskMic();
  }
}

function startAskMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { showToast('Voice not supported.', 'error'); return; }
  askVoiceRecognition = new SpeechRecognition();
  askVoiceRecognition.lang = 'en-US';
  askVoiceRecognition.interimResults = false;
  const btn = document.getElementById('ask-mic-btn');
  if (btn) btn.classList.add('recording');
  askVoiceActive = true;
  askVoiceRecognition.onresult = (e) => {
    const t = e.results[0][0].transcript;
    const input = document.getElementById('ask-input');
    if (input) input.value = t;
    stopAskMic();
    askAI();
  };
  askVoiceRecognition.onerror = () => stopAskMic();
  askVoiceRecognition.onend = () => stopAskMic();
  askVoiceRecognition.start();
}

function stopAskMic() {
  askVoiceActive = false;
  if (askVoiceRecognition) { try { askVoiceRecognition.stop(); } catch(e) {} askVoiceRecognition = null; }
  const btn = document.getElementById('ask-mic-btn');
  if (btn) btn.classList.remove('recording');
}

function askAI() {
  const input = document.getElementById('ask-input');
  const resultEl = document.getElementById('ask-result');
  if (!input || !resultEl) return;
  const q = input.value.trim();
  if (!q) return;

  resultEl.classList.remove('hidden');
  resultEl.textContent = '🤖 Thinking…';

  const now = new Date();
  const monthTx = S.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = inc - spent;
  const catMap = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCat = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];
  const ql = q.toLowerCase();

  setTimeout(() => {
    let answer = '';
    const ctx = `Based on your data (income: ${fmt(inc)}, expenses: ${fmt(spent)}, profit: ${fmt(profit)}): `;

    if (ql.includes('increas') || ql.includes('more money') || ql.includes('earn') || ql.includes('revenue')) {
      answer = ctx + `To increase income fast: (1) Upsell your existing clients — offer an add-on at 30% of your current price. It's 5× easier than finding new clients. (2) Launch a targeted outreach campaign to 10 new prospects per day using the Outreach tool. (3) If you have a digital product, run a 48-hour flash sale at 40% off to generate quick cash. Expect ${fmt(inc * 0.15)}–${fmt(inc * 0.3)} additional income within 2 weeks.`;
    } else if (ql.includes('save') || ql.includes('cut') || ql.includes('reduc') || ql.includes('leak')) {
      const topCatStr = topCat ? ` Start with your top category: ${topCat[0]} at ${fmt(topCat[1])}.` : '';
      answer = ctx + `To reduce spending: (1) Do a subscription audit tonight — cancel anything unused in 14 days.${topCatStr} (2) Set a daily spending limit of ${fmt(spent / 30)} max. (3) Automate ${Math.round(Math.max(profit * 0.2, 0))} into a savings account the moment income arrives. You could realistically save ${fmt(spent * 0.2)}–${fmt(spent * 0.35)} this month.`;
    } else if (ql.includes('invest')) {
      const runway = spent > 0 ? (inc / spent).toFixed(1) : '∞';
      answer = ctx + `Before investing: ensure you have a ${fmt(spent * 3)}–${fmt(spent * 6)} cash runway (you currently have ${runway} months of runway). Once secured, invest in: (1) your own business first — highest ROI; (2) index funds for passive growth; (3) only then alternative assets. At your current burn of ${fmt(spent/30)}/day, build ${fmt(spent*3)} in reserves first.`;
    } else if (ql.includes('runway') || ql.includes('survive') || ql.includes('cash')) {
      const runway = spent > 0 ? Math.floor(inc / (spent / 30)) : '∞';
      answer = ctx + `Your current runway is approximately ${runway} months at today's burn rate (${fmt(spent/30)}/day). Minimum safe runway is 3 months (${fmt(spent * 3)}). ${typeof runway === 'number' && runway < 3 ? 'You are below the safety threshold — reduce burn immediately.' : 'You are in the safe zone.'} To extend runway by 1 month: cut ${fmt(spent/30)} from monthly expenses.`;
    } else if (ql.includes('goal') || ql.includes('target') || ql.includes('faster')) {
      const goalTarget = S.goal === 'replace-job' ? (S.income || 5000) : S.goal === 'scale' ? (S.income || 5000) * 2 : 1000;
      const gap = Math.max(0, goalTarget - inc);
      answer = ctx + `Your goal: ${S.goal || 'financial growth'}. Target: ${fmt(goalTarget)}/mo. Gap: ${fmt(gap)}/mo. To close this gap: (1) raise prices by 20% on your next offer — most entrepreneurs are undercharging; (2) add one recurring revenue product (retainer, subscription); (3) run outreach 5 days a week. At current growth rate, you could hit your goal in approximately ${gap > 0 && inc > 0 ? Math.ceil(gap / (inc * 0.15)) : '?'} months.`;
    } else if (ql.includes('budget')) {
      const budgetTxt = S.budget > 0 ? `Your budget is ${fmt(S.budget)}/mo. You have used ${fmt(spent)} (${(spent/S.budget*100).toFixed(0)}%). ${spent > S.budget ? 'You are over budget.' : `${fmt(S.budget - spent)} remaining.`}` : 'You have not set a budget yet. Set one in Settings → Budget.';
      answer = budgetTxt + ` Rule of thumb: allocate 50% of income to essentials, 30% to growth/investment, 20% to profit-taking.`;
    } else if (ql.includes('risk') || ql.includes('problem') || ql.includes('worry')) {
      const risks = [];
      if (inc === 0) risks.push('zero income this month');
      if (spent > inc) risks.push('expenses exceeding income');
      if (Object.keys(catMap).length === 1) risks.push('all expenses in one category');
      const srcMap = {}; monthTx.filter(t=>t.type==='income').forEach(t=>{srcMap[t.category]=(srcMap[t.category]||0)+t.amount;});
      if (Object.keys(srcMap).length === 1 && inc > 0) risks.push('single income source');
      answer = risks.length
        ? `Your top financial risks right now: ${risks.map((r,i) => `(${i+1}) ${r}`).join('; ')}. Address them in order.`
        : ctx + 'No critical risks detected based on your current data. Keep logging consistently for more precise analysis.';
    } else {
      answer = ctx + `Key insight: profit is ${fmt(profit)} (${inc > 0 ? (profit/inc*100).toFixed(0) : 0}% margin). The highest-leverage action for a ${S.situation || 'business owner'} at your stage is increasing average transaction value before increasing volume. One $${Math.round(inc/Math.max(monthTx.filter(t=>t.type==='income').length,1)*1.3)} deal beats three small ones.`;
    }
    typeOut(resultEl, answer, 6);
  }, 500);
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
