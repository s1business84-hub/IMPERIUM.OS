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
  notifDaily: true,
  notifBudget: true,
  currentScreen: 'screen-boot',
  cards: [],
  xp: 0,
  level: 1,
  totalXp: 0,
  achievements: [],
  dayLogs: {}
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

/* ── XP & GAMIFICATION SYSTEM ─────────────────────── */
const LEVELS = [
  { level: 1,  title: 'Beginner',    xpNeeded: 0    },
  { level: 2,  title: 'Focused',     xpNeeded: 100  },
  { level: 3,  title: 'Disciplined', xpNeeded: 250  },
  { level: 4,  title: 'Strategic',   xpNeeded: 500  },
  { level: 5,  title: 'Consistent',  xpNeeded: 900  },
  { level: 6,  title: 'Systematic',  xpNeeded: 1400 },
  { level: 7,  title: 'Operator',    xpNeeded: 2100 },
  { level: 8,  title: 'Elite',       xpNeeded: 3000 },
  { level: 9,  title: 'Architect',   xpNeeded: 4200 },
  { level: 10, title: 'Imperium',    xpNeeded: 6000 }
];

const ACHIEVEMENTS = [
  { id: 'first-log',     icon: '📝', name: 'First Log',      desc: 'Log your first transaction',        xp: 50  },
  { id: 'streak-3',      icon: '🔥', name: '3-Day Streak',   desc: 'Log in 3 days in a row',            xp: 75  },
  { id: 'streak-7',      icon: '💎', name: 'Week Warrior',   desc: '7-day login streak',                xp: 150 },
  { id: 'tx-10',         icon: '💰', name: 'Tracker',        desc: 'Log 10 transactions',               xp: 100 },
  { id: 'tx-30',         icon: '🏆', name: 'Money Master',   desc: 'Log 30 transactions',               xp: 200 },
  { id: 'brain-visit',   icon: '🧠', name: 'Brain Tap',      desc: 'Visit AI Brain for the first time', xp: 50  },
  { id: 'budget-set',    icon: '🎯', name: 'Budgeted',       desc: 'Set a monthly budget',              xp: 75  },
  { id: 'day-log-1',     icon: '☀️', name: 'Day One',        desc: 'Complete your first day log',       xp: 30  },
  { id: 'day-log-5',     icon: '🌟', name: 'Habit Builder',  desc: 'Complete 5 day logs',               xp: 100 },
  { id: 'income-logged', icon: '💸', name: 'Earner',         desc: 'Log your first income',             xp: 60  },
];

function grantXP(amount, reason) {
  if (!S.xp) S.xp = 0;
  if (!S.totalXp) S.totalXp = 0;
  const prevLevel = S.level || 1;
  S.xp += amount;
  S.totalXp += amount;
  const newLevel = computeLevel(S.xp);
  S.level = newLevel;
  saveState();
  showToast('+' + amount + ' XP' + (reason ? ' · ' + reason : ''), 'success');
  updateHomeXPChip();
  if (newLevel > prevLevel) {
    setTimeout(() => showLevelUpOverlay(newLevel), 600);
  }
}

function computeLevel(xp) {
  let lv = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) { lv = LEVELS[i].level; break; }
  }
  return lv;
}

function getLevelInfo(level) {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

function getXPForNextLevel(level) {
  const next = LEVELS.find(l => l.level === level + 1);
  return next ? next.xpNeeded : null;
}

function updateHomeXPChip() {
  const lvEl = document.getElementById('home-xp-lvl');
  const barEl = document.getElementById('home-xp-bar');
  if (!lvEl || !barEl) return;
  const lv = S.level || 1;
  const xp = S.xp || 0;
  const curr = getLevelInfo(lv);
  const nextXp = getXPForNextLevel(lv);
  const pct = nextXp ? Math.min(100, ((xp - curr.xpNeeded) / (nextXp - curr.xpNeeded)) * 100) : 100;
  lvEl.textContent = 'Lv ' + lv;
  barEl.style.width = pct + '%';
}

function showLevelUpOverlay(level) {
  const info = getLevelInfo(level);
  const nextXp = getXPForNextLevel(level);
  const elById = (id) => document.getElementById(id);
  if (elById('xp-ov-level')) elById('xp-ov-level').textContent = 'Level ' + level;
  if (elById('xp-ov-title')) elById('xp-ov-title').textContent = info.title;
  if (elById('xp-ov-sub'))   elById('xp-ov-sub').textContent = nextXp ? ((S.xp - info.xpNeeded) + ' / ' + (nextXp - info.xpNeeded) + ' XP to Level ' + (level + 1)) : 'MAX LEVEL';
  const overlay = document.getElementById('xp-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    setTimeout(() => { const b = document.getElementById('xp-ov-bar'); if (b) b.style.width = '0%'; }, 50);
  }
}

function closeXPOverlay() {
  const overlay = document.getElementById('xp-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function unlockAchievement(id) {
  if (!S.achievements) S.achievements = [];
  if (S.achievements.includes(id)) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  S.achievements.push(id);
  saveState();
  if (ach.xp) grantXP(ach.xp, ach.name);
  showToast('🏆 Achievement: ' + ach.name, 'success');
}

function checkAchievements() {
  if (!S.achievements) S.achievements = [];
  if (S.transactions && S.transactions.length >= 1) unlockAchievement('first-log');
  if (S.transactions && S.transactions.length >= 10) unlockAchievement('tx-10');
  if (S.transactions && S.transactions.length >= 30) unlockAchievement('tx-30');
  if (S.transactions && S.transactions.some(t => t.type === 'income')) unlockAchievement('income-logged');
  if (S.streak >= 3) unlockAchievement('streak-3');
  if (S.streak >= 7) unlockAchievement('streak-7');
  if (S.budget > 0) unlockAchievement('budget-set');
  const dayLogCount = S.dayLogs ? Object.keys(S.dayLogs).length : 0;
  if (dayLogCount >= 1) unlockAchievement('day-log-1');
  if (dayLogCount >= 5) unlockAchievement('day-log-5');
}

/* ── DAY LOG ──────────────────────────────────────── */
function logDayActivity(btn) {
  const act = btn.dataset.act;
  const today = new Date().toDateString();
  if (!S.dayLogs) S.dayLogs = {};
  if (!S.dayLogs[today]) S.dayLogs[today] = [];

  const alreadyLogged = S.dayLogs[today].includes(act);
  if (alreadyLogged) {
    S.dayLogs[today] = S.dayLogs[today].filter(a => a !== act);
    btn.classList.remove('selected');
    saveState();
    return;
  }

  S.dayLogs[today].push(act);
  btn.classList.add('selected');
  saveState();
  grantXP(20, act.replace(/-/g, ' '));
  checkAchievements();

  const followUps = {
    'studied':      'Nice — what did you study? Understanding how your learning compounds over time is part of your Imperium picture.',
    'worked-out':   'Physical output drives mental output. Log any money moves today too — disciplined bodies, disciplined money.',
    'worked':       'Work logged. Tie it to income: did you produce anything billable today? Tell me and I\'ll log it.',
    'built':        'You built something today — that\'s compounding. Did it have revenue potential? Tell me more and I\'ll track it.',
    'social-media': 'Noted. Research shows social media time inversely correlates with income focus. Keep it to a hard limit.',
    'idea':         'Ideas are assets. Describe it and I\'ll log it to your Brain patterns. What was the idea?',
    'earned':       'You earned today — tell me exactly how much and from what: "Earned $X from [source]" and I\'ll log it now.',
    'wasted':       'Awareness is the first step. What pulled your attention? We can build a pattern around this in your Brain.'
  };
  const reply = followUps[act] || 'Logged your day activity.';
  addHomeBotMessage('ai', reply);
}

function restoreTodayDayChips() {
  const today = new Date().toDateString();
  if (!S.dayLogs || !S.dayLogs[today]) return;
  S.dayLogs[today].forEach(act => {
    const btn = document.querySelector(`.day-chip[data-act="${act}"]`);
    if (btn) btn.classList.add('selected');
  });
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
    'screen-brain': 'nb-brain',
    'screen-settings': 'nb-settings'
  };
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (navMap[id]) {
    const nb = document.getElementById(navMap[id]);
    if (nb) nb.classList.add('active');
  }

  // Init screens
  if (id === 'screen-home')     { updateHomeScreen(); }
  if (id === 'screen-brain')    { initBrain(); unlockAchievement('brain-visit'); }
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
  saveState();
  showBottomNav();
  updateStreak();
  grantXP(100, 'System Activated');
  navigateTo('screen-home');
  initHomeData();
  initGlobalEffects();
}

/* ── HOME — VOICE BOT HUB ─────────────────────────── */
let homeVoiceActive = false;
let homeRecognition = null;
let homeChatHistory = [];

function initHomeData() {
  updateHomeGreeting();
  initParticles();
  initBeams();
  initDottedGlow();
  updateHomeXPChip();
  restoreTodayDayChips();
  // Show welcome message if first time, otherwise show context
  if (!homeChatHistory.length) {
    const now = new Date();
    const mo = now.getMonth(); const yr = now.getFullYear();
    const monthTx = S.transactions.filter(t => {
      const d = new Date(t.date); return d.getMonth() === mo && d.getFullYear() === yr;
    });
    const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    let welcomeMsg;
    if (!monthTx.length) {
      welcomeMsg = `Hey ${S.user ? S.user.name.split(' ')[0] : 'there'} 👋 I'm your Imperium AI. Tell me what you spent or earned today, or ask me anything about your finances. I'll log it and analyse it for you.`;
    } else if (exp > inc) {
      welcomeMsg = `Welcome back. This month you've spent ${fmt(exp)} against ${fmt(inc)} income — you're in the red by ${fmt(exp - inc)}. Want me to break that down or log something new?`;
    } else {
      const margin = inc > 0 ? ((inc - exp) / inc * 100).toFixed(0) : 0;
      welcomeMsg = `Welcome back. You're tracking well this month — ${margin}% profit margin with ${fmt(inc)} income logged. What would you like to do?`;
    }
    addHomeBotMessage('ai', welcomeMsg);
  }
}

function updateHomeGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = greet + ', ' + name;
  const dateEl = document.getElementById('top-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

// Called every time we navigate back to home
function updateHomeScreen() {
  updateHomeGreeting();
}

function toggleHomeVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice not supported in this browser', 'error');
    return;
  }
  if (homeVoiceActive) {
    stopHomeVoice();
    return;
  }
  homeVoiceActive = true;
  const orbWrap = document.getElementById('home-orb-wrap');
  const orbBtn = document.getElementById('home-orb-btn');
  const label = document.getElementById('home-orb-label');
  if (orbWrap) orbWrap.classList.add('listening');
  if (orbBtn) orbBtn.classList.add('recording');
  if (label) label.textContent = 'Listening…';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  homeRecognition = new SR();
  homeRecognition.lang = 'en-US';
  homeRecognition.interimResults = false;
  homeRecognition.maxAlternatives = 1;
  homeRecognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    stopHomeVoice();
    homeChat(text);
  };
  homeRecognition.onerror = () => { stopHomeVoice(); showToast('Could not hear you, try again', 'error'); };
  homeRecognition.onend = () => { stopHomeVoice(); };
  homeRecognition.start();
}

function stopHomeVoice() {
  homeVoiceActive = false;
  if (homeRecognition) { try { homeRecognition.stop(); } catch(e){} homeRecognition = null; }
  const orbWrap = document.getElementById('home-orb-wrap');
  const orbBtn = document.getElementById('home-orb-btn');
  const label = document.getElementById('home-orb-label');
  if (orbWrap) orbWrap.classList.remove('listening');
  if (orbBtn) orbBtn.classList.remove('recording');
  if (label) label.textContent = 'Tap to speak · or type below';
}

function homeChat(q) {
  const inputEl = document.getElementById('home-input');
  const text = q || (inputEl ? inputEl.value.trim() : '');
  if (!text) return;
  if (inputEl && !q) inputEl.value = '';

  addHomeBotMessage('user', text);

  // Hide hints after first message
  const hint = document.getElementById('home-orb-hint');
  if (hint) hint.style.display = 'none';

  // Check if it's a logging intent
  const parsed = parseHomeTx(text);
  if (parsed) {
    logFromHomeBot(parsed, text);
  } else {
    generateHomeResponse(text);
  }
}

function parseHomeTx(text) {
  const t = text.toLowerCase();
  // Income patterns
  const incomeKw = ['got paid', 'received', 'earned', 'made', 'income', 'client paid', 'payment from', 'sold', 'revenue'];
  const expenseKw = ['spent', 'bought', 'paid for', 'paid', 'spent on', 'cost', 'purchase'];
  const isIncome = incomeKw.some(kw => t.includes(kw));
  const isExpense = expenseKw.some(kw => t.includes(kw));
  if (!isIncome && !isExpense) return null;
  // Extract amount
  const amtMatch = text.match(/[\$£€]?\s?(\d+(?:[.,]\d{1,2})?)/);
  if (!amtMatch) return null;
  const amount = parseFloat(amtMatch[1].replace(',', ''));
  if (isNaN(amount) || amount <= 0) return null;
  // Extract category
  const catMap = {
    coffee: 'coffee', cafe: 'coffee', starbucks: 'coffee',
    food: 'food', eat: 'food', lunch: 'food', dinner: 'food', breakfast: 'food', restaurant: 'food', pizza: 'food', burger: 'food',
    groceries: 'groceries', grocery: 'groceries', supermarket: 'groceries',
    uber: 'transport', lyft: 'transport', taxi: 'transport', transport: 'transport', fuel: 'transport', gas: 'transport', bus: 'transport',
    netflix: 'subscription', spotify: 'subscription', subscription: 'subscription',
    gym: 'health', doctor: 'health', pharmacy: 'health', medicine: 'health',
    rent: 'bills', electricity: 'bills', internet: 'bills', bill: 'bills', bills: 'bills',
    shopping: 'shopping', amazon: 'shopping', clothes: 'shopping',
    client: 'client', freelance: 'freelance', salary: 'salary', salary: 'salary'
  };
  let category = isIncome ? 'freelance' : 'other';
  for (const [kw, cat] of Object.entries(catMap)) {
    if (t.includes(kw)) { category = cat; break; }
  }
  // Extract note from "on X" or "for X" or "from X"
  const noteMatch = text.match(/(?:on|for|from|at)\s+(.+?)(?:\s*$)/i);
  const note = noteMatch ? noteMatch[1].replace(/[$£€\d.,]/g, '').trim() : '';

  return { amount, type: isIncome ? 'income' : 'expense', category, note };
}

function logFromHomeBot(parsed, originalText) {
  const tx = {
    id: Date.now().toString(),
    type: parsed.type,
    amount: parsed.amount,
    category: parsed.category,
    note: parsed.note || originalText,
    date: new Date().toISOString()
  };
  S.transactions.push(tx);
  saveState();
  const sign = tx.type === 'income' ? '+' : '-';
  const emoji = tx.type === 'income' ? '✅' : '📝';
  addHomeBotMessage('ai', `${emoji} Logged! ${sign}${fmt(tx.amount)} · ${tx.category}${tx.note ? ' · ' + tx.note : ''}. Your AI Brain has been updated. Want to log another or see your summary?`);
  homeChatHistory.push({ role: 'user', text: originalText });
  homeChatHistory.push({ role: 'ai', text: 'Logged.' });
}

function generateHomeResponse(text) {
  const t = text.toLowerCase();
  const now = new Date();
  const mo = now.getMonth(); const yr = now.getFullYear();
  const monthTx = S.transactions.filter(tx => {
    const d = new Date(tx.date); return d.getMonth() === mo && d.getFullYear() === yr;
  });
  const inc = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const exp = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

  let reply = '';
  if (t.includes('summary') || t.includes('how am i') || t.includes('on track')) {
    if (!monthTx.length) {
      reply = "No transactions logged this month yet. Tell me what you've spent or earned and I'll start tracking.";
    } else {
      const margin = inc > 0 ? ((inc - exp) / inc * 100).toFixed(0) : 0;
      const status = exp > inc ? '⚠️ You\'re in the red' : margin > 30 ? '💚 You\'re crushing it' : '📊 You\'re doing OK';
      reply = `${status} this month.\n\n💰 Income: ${fmt(inc)}\n💸 Spent: ${fmt(exp)}\n📈 Profit: ${fmt(inc - exp)}\n🎯 Margin: ${margin}%\n\nTap Brain for deeper analysis.`;
    }
  } else if (t.includes('top spend') || t.includes('spent most') || t.includes('biggest expense')) {
    const catMap = {};
    monthTx.filter(tx => tx.type === 'expense').forEach(tx => { catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount; });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) {
      reply = "No expense data this month. Log some transactions first!";
    } else {
      reply = `Your top 3 spend categories this month:\n\n${sorted.slice(0, 3).map((e, i) => `${i + 1}. ${e[0]} — ${fmt(e[1])}`).join('\n')}\n\nWant me to help you cut any of these?`;
    }
  } else if (t.includes('income') || t.includes('earn') || t.includes('revenue')) {
    const sources = {};
    monthTx.filter(tx => tx.type === 'income').forEach(tx => { sources[tx.category] = (sources[tx.category] || 0) + tx.amount; });
    const sorted = Object.entries(sources).sort((a, b) => b[1] - a[1]);
    reply = sorted.length
      ? `This month's income breakdown:\n\n${sorted.map(e => `• ${e[0]}: ${fmt(e[1])}`).join('\n')}\n\nTotal: ${fmt(inc)}`
      : "No income logged this month. Tell me when you get paid — just say 'Got paid $X from client'.";
  } else if (t.includes('budget')) {
    const budget = S.budget || 0;
    if (!budget) {
      reply = "You haven't set a monthly budget yet. Go to Settings to set one, or tell me your budget and I'll set it. E.g. 'My budget is $2000 this month'.";
    } else {
      const remaining = budget - exp;
      const pct = (exp / budget * 100).toFixed(0);
      reply = remaining > 0
        ? `Budget: ${fmt(budget)}\nSpent: ${fmt(exp)} (${pct}%)\nRemaining: ${fmt(remaining)} — ${remaining > budget * 0.3 ? "you're doing well!" : "getting tight, be careful."}`
        : `⚠️ You've exceeded your budget by ${fmt(Math.abs(remaining))}. Time to pause discretionary spending.`;
    }
  } else if (t.includes('advice') || t.includes('help') || t.includes('what should')) {
    if (!monthTx.length) {
      reply = "Start by logging everything you spend and earn. Even one week of data gives me enough to give you personalised advice. Just tell me as you go!";
    } else if (exp > inc) {
      reply = `You're spending ${fmt(exp - inc)} more than you earn. My top 3 actions:\n\n1. Identify your top expense category and cut 20%\n2. Find one extra income source this week\n3. Open AI Brain → Patterns for the full breakdown`;
    } else {
      reply = `You're profitable this month. My advice:\n\n1. If you're not saving 20%+ of income, start now\n2. Open Brain → Behaviour for your full profile\n3. Your next goal should be adding another income stream`;
    }
  } else {
    reply = `I can help you:\n\n• Log transactions ("Spent $40 on food")\n• Check your summary ("How am I doing?")\n• Find top spending ("What am I spending most on?")\n• Budget check ("How's my budget?")\n• Get advice ("What should I do?")\n\nOr tap 🧠 Brain for deep AI analysis.`;
  }
  addHomeBotMessage('ai', reply);
  homeChatHistory.push({ role: 'user', text }, { role: 'ai', text: reply });
}

function addHomeBotMessage(role, text) {
  const feed = document.getElementById('home-chat-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = `hcm hcm-${role}`;
  const icon = role === 'ai'
    ? `<div class="hcm-av">🧠</div>`
    : `<div class="hcm-av hcm-av-user">${S.user ? S.user.name[0].toUpperCase() : 'U'}</div>`;
  const formattedText = text.replace(/\n/g, '<br>');
  div.innerHTML = role === 'ai'
    ? `${icon}<div class="hcm-bubble">${formattedText}</div>`
    : `<div class="hcm-bubble">${formattedText}</div>${icon}`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
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

/* ── AI BRAIN ─────────────────────────────────────── */
let brainPatternChartInst = null;
let brainMicActive = false;
let brainRecognition = null;
let brainChatHistory = [];
let brainInitialised = false;

function initBrain() {
  buildBrainPulse();
  buildPatterns();
  buildBehaviourTab();
  brainInitialised = true;
}

function switchBrainTab(tab) {
  document.querySelectorAll('.brain-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.brain-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('btab-' + tab).classList.add('active');
  document.getElementById('bpanel-' + tab).classList.add('active');
  if (tab === 'chat' && !brainChatHistory.length) initBrainChat();
}

/* ── PULSE TAB ── */
function buildBrainPulse() {
  buildBrainScoreCard();
  buildBrainAlerts();
  buildBrainNudges();
}

function buildBrainScoreCard() {
  const scoreEl = document.getElementById('brain-score-card');
  if (!scoreEl) return;
  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const daysGone = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projInc = daysGone > 0 ? (inc / daysGone) * daysInMonth : 0;
  const projExp = daysGone > 0 ? (exp / daysGone) * daysInMonth : 0;
  let score = 50;
  if (inc > 0) score += 15;
  if (inc > exp) score += 20;
  if (exp / (inc || 1) < 0.7) score += 15;
  const sources = [...new Set(monthTx.filter(t => t.type === 'income').map(t => t.category))].length;
  if (sources > 1) score += 10;
  if (daysGone >= 7 && monthTx.length >= 5) score += 10;
  score = Math.min(100, Math.max(0, score));
  const grade = score >= 85 ? { label: 'Excellent', color: '#10b981' }
    : score >= 70 ? { label: 'Good', color: '#3b82f6' }
    : score >= 50 ? { label: 'Fair', color: '#f59e0b' }
    : { label: 'Needs Work', color: '#ef4444' };
  scoreEl.innerHTML = `
    <div class="bsc-header">
      <div class="bsc-left">
        <div class="bsc-label">Financial Health Score</div>
        <div class="bsc-score" style="color:${grade.color}">${score}</div>
        <div class="bsc-grade" style="color:${grade.color}">${grade.label}</div>
      </div>
      <div class="bsc-right">
        <div class="bsc-stat"><span class="bsc-sv" style="color:var(--green)">${fmt(inc)}</span><span class="bsc-sl">Income</span></div>
        <div class="bsc-stat"><span class="bsc-sv" style="color:var(--red)">${fmt(exp)}</span><span class="bsc-sl">Spent</span></div>
        <div class="bsc-stat"><span class="bsc-sv" style="color:${inc >= exp ? 'var(--blue2)' : 'var(--red)'}">${fmt(inc - exp)}</span><span class="bsc-sl">Profit</span></div>
      </div>
    </div>
    <div class="bsc-proj">📈 Projected month-end: <strong style="color:${projInc - projExp >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(projInc - projExp)}</strong> profit at current pace</div>`;
}

function buildBrainAlerts() {
  const alertsEl = document.getElementById('brain-alerts');
  if (!alertsEl) return;
  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const alerts = [];
  if (!monthTx.length) {
    alerts.push({ icon: '👀', level: 'info', text: 'No data yet. Start logging to activate your AI Brain.' });
  } else {
    if (exp > inc) alerts.push({ icon: '🚨', level: 'critical', text: `Spending exceeds income by ${fmt(exp - inc)}. Immediate action needed.` });
    const subs = monthTx.filter(t => t.category === 'subscription').reduce((s, t) => s + t.amount, 0);
    if (inc > 0 && subs > inc * 0.15) alerts.push({ icon: '⚠️', level: 'warn', text: `Subscriptions are ${(subs / inc * 100).toFixed(0)}% of income — industry average is 5-8%. Audit now.` });
    const catMap = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    if (topCat && exp > 0 && topCat[1] > exp * 0.4) alerts.push({ icon: '📌', level: 'warn', text: `${topCat[0]} is ${(topCat[1] / exp * 100).toFixed(0)}% of all spending. High concentration risk.` });
    const sources = [...new Set(monthTx.filter(t => t.type === 'income').map(t => t.category))].length;
    if (sources <= 1 && inc > 0) alerts.push({ icon: '⚡', level: 'warn', text: 'Single income source detected. Research shows 3+ streams increases financial resilience 4x.' });
    if (inc > 0 && exp / inc < 0.5) alerts.push({ icon: '✅', level: 'good', text: `Excellent expense ratio: ${(exp / inc * 100).toFixed(0)}%. You're saving ${(100 - exp / inc * 100).toFixed(0)}% of income.` });
  }
  alertsEl.innerHTML = alerts.map(a => `
    <div class="brain-alert brain-alert-${a.level}">
      <span class="ba-icon">${a.icon}</span>
      <span class="ba-text">${a.text}</span>
    </div>`).join('');
}

function buildBrainNudges() {
  const nudgesEl = document.getElementById('brain-nudges');
  if (!nudgesEl) return;
  const nudges = [
    { icon: '🧪', title: 'The 24-Hour Rule', text: 'Before any purchase over $50, wait 24 hours. Studies show this reduces impulse spending by 32% (Journal of Consumer Research, 2019).', tag: 'Behaviour Science' },
    { icon: '📊', title: 'Track → Reduce', text: 'People who log every expense spend 18% less automatically. Awareness alone is the intervention (Ariely, 2008).', tag: 'Research Finding' },
    { icon: '💡', title: 'Income Diversification', text: 'Having 3+ income sources reduces income shock probability by 78%. Add one small stream every 90 days.', tag: 'Risk Management' },
    { icon: '🎯', title: 'The 50/30/20 Rule', text: '50% needs, 30% wants, 20% savings/investments. Compare this to your current ratios in the Insights tab.', tag: 'Framework' },
    { icon: '🔄', title: 'Subscription Creep', text: 'The average person underestimates their subscription spend by 2.5x. Every 3 months, cancel everything and re-subscribe only to what you missed.', tag: 'Money Leak' },
  ];
  const now = new Date();
  const nudgeIdx = (now.getDate() + now.getMonth()) % nudges.length;
  const n = nudges[nudgeIdx];
  nudgesEl.innerHTML = `
    <div class="brain-section-label">Today's Behavioural Insight</div>
    <div class="brain-nudge-card glass-card">
      <div class="bnc-tag">${n.tag}</div>
      <div class="bnc-icon">${n.icon}</div>
      <div class="bnc-title">${n.title}</div>
      <div class="bnc-text">${n.text}</div>
    </div>`;
}

/* ── PATTERNS TAB ── */
function buildPatterns() {
  buildPatternList();
  buildPatternChart();
  buildStreakRow();
}

function buildPatternList() {
  const listEl = document.getElementById('pattern-list');
  if (!listEl) return;
  const tx = S.transactions;
  if (!tx.length) { listEl.innerHTML = '<div class="tx-empty">Log at least 7 days of transactions to detect patterns.</div>'; return; }
  const patterns = detectPatterns(tx);
  listEl.innerHTML = patterns.map(p => `
    <div class="pattern-card glass-card">
      <div class="pc-header">
        <span class="pc-icon">${p.icon}</span>
        <div class="pc-info">
          <div class="pc-title">${p.title}</div>
          <div class="pc-sub">${p.sub}</div>
        </div>
        <div class="pc-badge pc-badge-${p.type}">${p.type}</div>
      </div>
      <div class="pc-insight">${p.insight}</div>
    </div>`).join('');
}

function detectPatterns(tx) {
  const patterns = [];
  const daySpend = Array(7).fill(0);
  tx.filter(t => t.type === 'expense').forEach(t => { daySpend[new Date(t.date).getDay()] += t.amount; });
  const maxDay = daySpend.indexOf(Math.max(...daySpend));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (daySpend[maxDay] > 0) {
    patterns.push({
      icon: '📅', title: 'Peak Spending Day',
      sub: `${dayNames[maxDay]} — ${fmt(daySpend[maxDay])} total`,
      type: 'pattern',
      insight: `You spend most on ${dayNames[maxDay]}s. This is likely habitual. Set a ${dayNames[maxDay]} spending alert to break the cycle.`
    });
  }
  const catMap = {};
  tx.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const totalExp = Object.values(catMap).reduce((s, v) => s + v, 0);
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (topCat && totalExp > 0) {
    const pct = (topCat[1] / totalExp * 100).toFixed(0);
    patterns.push({
      icon: pct > 40 ? '🔴' : '🟡',
      title: `${topCat[0]} = ${pct}% of expenses`,
      sub: `${fmt(topCat[1])} across all time`,
      type: pct > 40 ? 'risk' : 'pattern',
      insight: pct > 40
        ? `High concentration. A single category eating ${pct}% creates financial fragility. Target a 30% max cap.`
        : `Your largest expense category is ${topCat[0]}. Normal range is 20-35% for a single category.`
    });
  }
  const last4Weeks = [];
  for (let w = 0; w < 4; w++) {
    const from = new Date(); from.setDate(from.getDate() - (w + 1) * 7);
    const to = new Date(); to.setDate(to.getDate() - w * 7);
    last4Weeks.push(tx.filter(t => { const d = new Date(t.date); return t.type === 'income' && d >= from && d < to; }).reduce((s, t) => s + t.amount, 0));
  }
  const avgWeekInc = last4Weeks.reduce((s, v) => s + v, 0) / 4;
  const variance = last4Weeks.map(w => Math.abs(w - avgWeekInc)).reduce((s, v) => s + v, 0) / 4;
  if (avgWeekInc > 0) {
    const cv = variance / avgWeekInc;
    patterns.push({
      icon: cv > 0.5 ? '📉' : '📈',
      title: cv > 0.5 ? 'Volatile Income Pattern' : 'Consistent Income Pattern',
      sub: `Avg ${fmt(avgWeekInc)}/week over 4 weeks`,
      type: cv > 0.5 ? 'risk' : 'positive',
      insight: cv > 0.5
        ? `High income variability (${(cv * 100).toFixed(0)}% coefficient of variation). Build a 3-month emergency buffer to handle income gaps.`
        : `Steady income stream. Consistency like this compounds — small increases each week add up dramatically.`
    });
  }
  const subs = tx.filter(t => t.category === 'subscription');
  if (subs.length > 0) {
    const subTotal = subs.reduce((s, t) => s + t.amount, 0);
    patterns.push({
      icon: '🔄', title: 'Recurring Subscription Load',
      sub: `${subs.length} logged subscriptions`,
      type: 'pattern',
      insight: `Total logged subscription spend: ${fmt(subTotal)}. Per the "pain of paying" principle (Prelec & Loewenstein), auto-renewals anesthetise spending awareness. Review each one.`
    });
  }
  if (!patterns.length) {
    patterns.push({ icon: '📊', title: 'Keep logging to detect patterns', sub: 'Need more data', type: 'info', insight: 'Log transactions daily for 2+ weeks to unlock pattern detection.' });
  }
  return patterns;
}

function buildPatternChart() {
  const canvas = document.getElementById('brain-pattern-chart');
  if (!canvas) return;
  if (brainPatternChartInst) { brainPatternChartInst.destroy(); brainPatternChartInst = null; }
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayInc = Array(7).fill(0);
  const dayExp = Array(7).fill(0);
  S.transactions.forEach(t => {
    const d = new Date(t.date).getDay();
    if (t.type === 'income') dayInc[d] += t.amount;
    else dayExp[d] += t.amount;
  });
  brainPatternChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dayNames,
      datasets: [
        { label: 'Income', data: dayInc, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
        { label: 'Spend', data: dayExp, backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: 'rgba(240,244,255,.6)', font: { size: 11 } } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(240,244,255,.5)', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(240,244,255,.5)', font: { size: 10 } } }
      }
    }
  });
}

function buildStreakRow() {
  const streakEl = document.getElementById('pattern-streak-row');
  if (!streakEl) return;
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const has = S.transactions.some(t => new Date(t.date).toDateString() === d.toDateString());
    if (has) streak++;
    else if (i > 0) break;
  }
  const txPerMonth = (S.transactions.length / 3).toFixed(0);
  streakEl.innerHTML = `
    <div class="streak-card glass-card"><div class="sc-val">${streak}</div><div class="sc-lbl">Day Logging Streak</div></div>
    <div class="streak-card glass-card"><div class="sc-val">${S.transactions.length}</div><div class="sc-lbl">Total Entries</div></div>
    <div class="streak-card glass-card"><div class="sc-val">${txPerMonth}</div><div class="sc-lbl">Avg per Month</div></div>`;
}

/* ── BEHAVIOUR TAB ── */
function buildBehaviourTab() {
  buildBehaviourList();
  buildStudyCards();
}

function buildBehaviourList() {
  const blistEl = document.getElementById('behaviour-list');
  if (!blistEl) return;
  const behaviours = analyseBehaviours(S.transactions);
  blistEl.innerHTML = `<div class="brain-section-label">Your Behavioural Profile</div>` +
    behaviours.map(b => `
      <div class="behaviour-item glass-card">
        <div class="bi-header">
          <span class="bi-icon">${b.icon}</span>
          <div class="bi-info">
            <div class="bi-title">${b.title}</div>
            <div class="bi-score-bar"><div class="bi-score-fill" style="width:${b.score}%;background:${b.color}"></div></div>
          </div>
          <div class="bi-pct" style="color:${b.color}">${b.score}%</div>
        </div>
        <div class="bi-desc">${b.desc}</div>
        <div class="bi-action">${b.action}</div>
      </div>`).join('');
}

function analyseBehaviours(tx) {
  const behaviours = [];
  const now = new Date();
  const monthTx = tx.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const smallPurchases = monthTx.filter(t => t.type === 'expense' && t.amount < 20).length;
  const totalPurchases = monthTx.filter(t => t.type === 'expense').length;
  const impulseScore = totalPurchases > 0 ? Math.max(0, 100 - (smallPurchases / totalPurchases * 100)) : 50;
  behaviours.push({
    icon: '🧠', title: 'Impulse Control',
    score: Math.round(impulseScore),
    color: impulseScore > 70 ? '#10b981' : impulseScore > 40 ? '#f59e0b' : '#ef4444',
    desc: `${smallPurchases} micro-purchases (under $20) this month = ${(smallPurchases / Math.max(1, totalPurchases) * 100).toFixed(0)}% of all transactions.`,
    action: impulseScore < 60 ? '⚡ Use the 24-hour rule for all non-essential purchases.' : '✅ Good impulse control. Maintain awareness.'
  });
  const budget = S.budget || 0;
  const budgetScore = budget > 0 ? Math.max(0, Math.min(100, (1 - exp / budget) * 100)) : (inc > 0 && exp / inc < 0.8 ? 70 : 40);
  behaviours.push({
    icon: '📋', title: 'Budget Discipline',
    score: Math.round(budgetScore),
    color: budgetScore > 70 ? '#10b981' : budgetScore > 40 ? '#f59e0b' : '#ef4444',
    desc: budget > 0 ? `Spent ${fmt(exp)} of ${fmt(budget)} budget (${(exp / budget * 100).toFixed(0)}%).` : 'No budget set. Set one in Settings to track discipline.',
    action: budgetScore < 50 ? '🎯 Set a hard monthly budget ceiling in Settings.' : '✅ Staying within budget. Keep the discipline.'
  });
  const last4 = [];
  for (let w = 0; w < 4; w++) {
    const from = new Date(); from.setDate(from.getDate() - (w + 1) * 7);
    const to = new Date(); to.setDate(to.getDate() - w * 7);
    last4.push(tx.filter(t => { const d = new Date(t.date); return t.type === 'income' && d >= from && d < to; }).reduce((s, t) => s + t.amount, 0));
  }
  const avg = last4.reduce((s, v) => s + v, 0) / 4;
  const cv = avg > 0 ? last4.map(w => Math.abs(w - avg)).reduce((s, v) => s + v, 0) / 4 / avg : 1;
  const consistencyScore = Math.max(0, Math.min(100, (1 - cv) * 100));
  behaviours.push({
    icon: '📈', title: 'Income Consistency',
    score: Math.round(consistencyScore),
    color: consistencyScore > 70 ? '#10b981' : consistencyScore > 40 ? '#3b82f6' : '#f59e0b',
    desc: `Weekly income variability: ${(cv * 100).toFixed(0)}%. Avg weekly income: ${fmt(avg)}.`,
    action: consistencyScore < 60 ? '💡 Retainers and recurring clients smooth income dramatically.' : '✅ Consistent earnings. Stack on top with a passive income layer.'
  });
  const sources = [...new Set(tx.filter(t => t.type === 'income').map(t => t.category))].length;
  const divScore = Math.min(100, sources * 25);
  behaviours.push({
    icon: '🌐', title: 'Income Diversification',
    score: divScore,
    color: divScore >= 75 ? '#10b981' : divScore >= 50 ? '#3b82f6' : '#f59e0b',
    desc: `${sources} income source${sources !== 1 ? 's' : ''} detected all-time. Optimal is 3+.`,
    action: divScore < 75 ? '🚀 Identify one more income stream you could activate this month.' : '✅ Well diversified. Focus on growing the highest-margin source.'
  });
  return behaviours;
}

function buildStudyCards() {
  const studyEl = document.getElementById('study-cards');
  if (!studyEl) return;
  const studies = [
    { icon: '🔬', ref: 'Kahneman & Tversky, 1979', finding: 'Loss Aversion', detail: 'Losses feel 2x worse than equivalent gains. Use this: frame every cost-cut as "recovering" money, not sacrificing it.' },
    { icon: '📊', ref: 'Thaler, 1985', finding: 'Mental Accounting', detail: 'People treat "bonus money" differently and spend it frivolously. Break this bias: all money is equal — put windfalls straight into savings.' },
    { icon: '🧠', ref: 'Ariely, 2008', finding: 'Anchoring Effect', detail: 'The first price you see anchors all future comparisons. When negotiating rates, always anchor high — it shifts the entire range in your favour.' },
    { icon: '⚡', ref: 'Baumeister, 1998', finding: 'Ego Depletion', detail: 'Willpower is finite. Financial decisions made when tired are worse. Schedule important money decisions in the morning when cognitive resources are full.' },
  ];
  studyEl.innerHTML = `<div class="brain-section-label" style="margin-top:16px">Research-Backed Insights</div>` +
    studies.map(s => `
      <div class="study-card glass-card">
        <div class="sc-ref">${s.icon} ${s.ref}</div>
        <div class="sc-finding">${s.finding}</div>
        <div class="sc-detail">${s.detail}</div>
      </div>`).join('');
}

/* ── BRAIN CHAT TAB ── */
function initBrainChat() {
  brainChatHistory = [];
  const greeting = buildBrainContext();
  addBrainMessage('ai', `I've analysed your financial data. ${greeting} What would you like to explore?`);
}

function buildBrainContext() {
  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  if (!monthTx.length) return 'No transactions logged yet — once you start tracking, I can give you deep analysis.';
  if (exp > inc) return `This month you're spending ${fmt(exp - inc)} more than you earn. That's the #1 thing to fix.`;
  const margin = ((inc - exp) / inc * 100).toFixed(0);
  return `This month: ${fmt(inc)} income, ${fmt(exp)} spent, ${margin}% profit margin.`;
}

function brainChat(q) {
  const inputEl = document.getElementById('brain-chat-input');
  const question = q || (inputEl ? inputEl.value.trim() : '');
  if (!question) return;
  if (inputEl) inputEl.value = '';
  addBrainMessage('user', question);
  setTimeout(() => { addBrainMessage('ai', generateBrainResponse(question)); }, 600);
}

function addBrainMessage(role, text) {
  const feed = document.getElementById('brain-chat-feed');
  if (!feed) return;
  brainChatHistory.push({ role, text });
  const div = document.createElement('div');
  div.className = `brain-msg brain-msg-${role}`;
  div.innerHTML = role === 'ai'
    ? `<span class="bm-icon">🧠</span><div class="bm-bubble">${text}</div>`
    : `<div class="bm-bubble">${text}</div>`;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function generateBrainResponse(q) {
  const ql = q.toLowerCase();
  const now = new Date();
  const monthTx = S.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const catMap = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  const sources = [...new Set(monthTx.filter(t => t.type === 'income').map(t => t.category))];
  if (!monthTx.length) return 'Log your first transaction and I can start real analysis. The more data you give me, the more precise my insights become.';
  if (ql.includes('habit') || ql.includes('worst')) {
    const smallPurchases = monthTx.filter(t => t.type === 'expense' && t.amount < 20).length;
    return `Based on your data, your main financial habits: (1) ${topCat ? `${topCat[0]} is your top spend at ${fmt(topCat[1])} — watch for habituation bias here.` : 'No dominant category yet.'} (2) ${smallPurchases > 5 ? `${smallPurchases} micro-purchases this month — small amounts feel painless but compound fast.` : 'Low micro-purchase count — good discipline.'} (3) ${sources.length < 2 ? 'Single income source — this is your highest-risk habit to break.' : `${sources.length} income sources — above average diversification.`}`;
  }
  if (ql.includes('pattern') || ql.includes('hurting')) {
    const daySpend = Array(7).fill(0);
    monthTx.filter(t => t.type === 'expense').forEach(t => { daySpend[new Date(t.date).getDay()] += t.amount; });
    const peakDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][daySpend.indexOf(Math.max(...daySpend))];
    return `Your most damaging pattern: ${topCat ? `${topCat[0]} spending at ${(topCat[1] / exp * 100).toFixed(0)}% of total outflows` : 'no dominant pattern yet'}. Peak spending occurs on ${peakDay}s — likely a dopamine-driven reward pattern. ${exp > inc ? `Critical: you are spending ${fmt(exp - inc)} more than you earn. This is structural — expense reduction must be immediate.` : `Current expense ratio: ${(exp / inc * 100).toFixed(0)}% — ${exp / inc < 0.7 ? 'healthy' : 'needs attention'}.`}`;
  }
  if (ql.includes('track') || ql.includes('on track')) {
    const daysGone = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projInc = (inc / daysGone) * daysInMonth;
    const projExp = (exp / daysGone) * daysInMonth;
    const projProfit = projInc - projExp;
    return `At your current pace: projected income ${fmt(projInc)}, projected spend ${fmt(projExp)}, projected profit ${fmt(projProfit)}. ${projProfit > 0 ? `You're on track. ${daysInMonth - daysGone} days remain — maintain discipline.` : `You're projected to end the month at a loss. Increase income by ${fmt(Math.abs(projProfit) / ((daysInMonth - daysGone) || 1))}/day or cut daily spending.`}`;
  }
  if (ql.includes('next month') || ql.includes('differently')) {
    const subPct = exp > 0 ? ((catMap['subscription'] || 0) / exp * 100).toFixed(0) : 0;
    return `For next month: (1) ${topCat && topCat[1] > exp * 0.35 ? `Cap ${topCat[0]} spending at ${fmt(topCat[1] * 0.8)} — a 20% reduction on your top category.` : 'Maintain current category distribution.'} (2) ${subPct > 15 ? `Audit subscriptions — ${subPct}% of spend on subs is high. Cancel 2 before month-end.` : 'Subscription spend is controlled.'} (3) ${sources.length < 2 ? 'Activate one additional income source — even a small extra stream changes the psychological dynamic.' : `Scale your top income source: ${sources[0]}.`} (4) Log every transaction, no exceptions.`;
  }
  if (ql.includes('leak') || ql.includes('unconscious')) {
    const smallExp = monthTx.filter(t => t.type === 'expense' && t.amount < 30);
    const leakTotal = smallExp.reduce((s, t) => s + t.amount, 0);
    return `Money leaks detected: (1) Micro-spend: ${smallExp.length} transactions under $30 totalling ${fmt(leakTotal)}. (2) ${(catMap['subscription'] || 0) > 0 ? `Subscriptions: ${fmt(catMap['subscription'])} in recurring charges.` : ''} (3) ${(catMap['food'] || 0) > 0 ? `Food/Coffee: ${fmt((catMap['food'] || 0) + (catMap['coffee'] || 0))}.` : ''} Total identified leaks: ~${fmt(leakTotal + (catMap['subscription'] || 0))}. Plugging these could recover ${fmt((leakTotal + (catMap['subscription'] || 0)) * 0.4)}/month.`;
  }
  const margin = inc > 0 ? ((inc - exp) / inc * 100).toFixed(0) : 0;
  return `Based on your data: ${fmt(inc)} income, ${fmt(exp)} spent, ${margin}% margin. ${topCat ? `Top expense: ${topCat[0]} at ${fmt(topCat[1])}.` : ''} ${sources.length > 0 ? `Income sources: ${sources.join(', ')}.` : ''} Ask me anything specific — habits, patterns, forecasts, or what to do differently.`;
}

function toggleBrainMic() {
  if (brainMicActive) { stopBrainMic(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Voice not supported on this browser.', 'error'); return; }
  brainRecognition = new SR();
  brainRecognition.continuous = false; brainRecognition.interimResults = false; brainRecognition.lang = 'en-US';
  const micBtn = document.getElementById('brain-mic-btn');
  if (micBtn) micBtn.classList.add('recording');
  brainMicActive = true;
  brainRecognition.onresult = e => {
    const inputEl = document.getElementById('brain-chat-input');
    if (inputEl) inputEl.value = e.results[0][0].transcript;
    stopBrainMic();
    brainChat();
  };
  brainRecognition.onerror = () => stopBrainMic();
  brainRecognition.onend = () => stopBrainMic();
  brainRecognition.start();
}

function stopBrainMic() {
  brainMicActive = false;
  if (brainRecognition) { try { brainRecognition.stop(); } catch (e) {} brainRecognition = null; }
  const btn = document.getElementById('brain-mic-btn');
  if (btn) btn.classList.remove('recording');
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
  grantXP(30, 'transaction logged');
  checkAchievements();
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
    advice.push({ icon: '⚡', priority: 'critical', title: 'No income this month', text: 'You have zero income logged. Open the AI Brain and check your behavioural profile for income diversification strategies.' });
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
      aiText.textContent = 'No income logged this month. Log all income sources so your AI Brain can analyse your full financial picture.';
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
  // Level + XP
  const lv = S.level || 1;
  const xp = S.xp || 0;
  const info = getLevelInfo(lv);
  const nextXp = getXPForNextLevel(lv);
  const pct = nextXp ? Math.min(100, ((xp - info.xpNeeded) / (nextXp - info.xpNeeded)) * 100) : 100;
  el('p-level-badge', 'Lv ' + lv);
  el('p-level-title', info.title);
  el('p-xp-label', (nextXp ? (xp - info.xpNeeded) + ' / ' + (nextXp - info.xpNeeded) : xp) + ' XP');
  el('p-streak-val', S.streak || 0);
  el('p-total-xp', S.totalXp || 0);
  el('p-tx-count', S.transactions ? S.transactions.length : 0);
  const xpBar = document.getElementById('p-xp-bar');
  if (xpBar) xpBar.style.width = pct + '%';
  // Streak ring
  const ring = document.getElementById('streak-ring-fill');
  if (ring) {
    const maxStreak = 30;
    const ringPct = Math.min(1, (S.streak || 0) / maxStreak);
    ring.style.strokeDashoffset = 226.2 * (1 - ringPct);
  }
  // Budget + currency
  el('s-budget', S.budget > 0 ? fmt(S.budget) + '/mo' : 'Not set');
  el('s-currency', S.currency + ' ' + (S.currency === '$' ? 'USD' : S.currency === '€' ? 'EUR' : S.currency === '£' ? 'GBP' : S.currency));
  const nd = document.getElementById('n-daily');
  const nb2 = document.getElementById('n-budget');
  if (nd) nd.checked = S.notifDaily;
  if (nb2) nb2.checked = S.notifBudget;
  // Achievements
  renderAchievements();
}

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  const unlocked = S.achievements || [];
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const done = unlocked.includes(a.id);
    return `<div class="ach-item ${done ? '' : 'ach-locked'}" title="${a.desc}">
      <div class="ach-icon">${done ? a.icon : '🔒'}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-xp">+${a.xp} XP</div>
    </div>`;
  }).join('');
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
    if (diff <= 1.5) { S.streak++; grantXP(50, 'daily streak'); }
    else S.streak = 1;
  } else {
    S.streak = 1;
  }
  S.lastLogin = today;
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
/* ── DOTTED GLOW BACKGROUND ──────────────────────── */
function initDottedGlow() {
  const canvas = document.getElementById('dotted-glow-canvas');
  if (!canvas) return;
  // Only init once — check if already running
  if (canvas._dottedGlowRunning) return;
  canvas._dottedGlowRunning = true;
  const ctx = canvas.getContext('2d');
  const GAP = 10;        // dot grid spacing (matches gap={10})
  const RADIUS = 1.6;    // dot radius (matches radius={1.6})
  const SPEED_MIN = 0.3; // min glow speed
  const SPEED_MAX = 1.6; // max glow speed
  let W, H, cols, rows;
  let dots = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    cols = Math.ceil(W / GAP) + 1;
    rows = Math.ceil(H / GAP) + 1;
    // Rebuild dot grid, preserve existing glow states where possible
    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Randomly seed some dots as glowing at start
        const glowing = Math.random() < 0.04;
        dots.push({
          x: c * GAP,
          y: r * GAP,
          glow: glowing ? Math.random() : 0,   // current glow intensity 0–1
          speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
          dir: 1,
          active: glowing
        });
      }
    }
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || document.body);

  // Randomly activate new dots over time
  function activateRandom() {
    if (dots.length === 0) return;
    const d = dots[Math.floor(Math.random() * dots.length)];
    if (!d.active) { d.active = true; d.dir = 1; }
  }

  let lastActivate = 0;

  function loop(ts) {
    if (!canvas._dottedGlowRunning) return;
    ctx.clearRect(0, 0, W, H);

    // Activate a few random dots every ~120ms
    if (ts - lastActivate > 120) {
      for (let i = 0; i < 3; i++) activateRandom();
      lastActivate = ts;
    }

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.active) {
        d.glow += d.dir * d.speed * 0.016;
        if (d.glow >= 1) { d.glow = 1; d.dir = -1; }
        else if (d.glow <= 0) { d.glow = 0; d.dir = 1; d.active = false; }
      }

      if (d.glow <= 0.01) {
        // Dim dot — base color rgba(163,163,163,0.25)
        ctx.beginPath();
        ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(163,163,163,0.18)';
        ctx.fill();
      } else {
        // Glowing dot — draw outer glow halo first, then bright center
        const glowRadius = RADIUS + 4 * d.glow;
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowRadius);
        // Sky-800 equivalent: #075985 → rgb(7,89,133)
        grad.addColorStop(0, `rgba(56,189,248,${0.85 * d.glow})`);
        grad.addColorStop(0.4, `rgba(14,165,233,${0.4 * d.glow})`);
        grad.addColorStop(1, 'rgba(7,89,133,0)');
        ctx.beginPath();
        ctx.arc(d.x, d.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        // Bright dot center
        ctx.beginPath();
        ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186,230,253,${0.6 + 0.4 * d.glow})`;
        ctx.fill();
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

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
  { icon: '🏠', label: 'Go to Home',          action: () => navigateTo('screen-home'),     badge: '' },
  { icon: '🧠', label: 'AI Brain',             action: () => navigateTo('screen-brain'),    badge: 'AI' },
  { icon: '➕', label: 'Log Transaction',      action: () => navigateTo('screen-track'),    badge: 'Track' },
  { icon: '📊', label: 'AI Insights',          action: () => navigateTo('screen-insights'), badge: '' },
  { icon: '📅', label: 'Calendar',             action: () => navigateTo('screen-calendar'), badge: '' },
  { icon: '⚙️', label: 'Settings',             action: () => navigateTo('screen-settings'), badge: '' },
  { icon: '🔬', label: 'Behaviour Analysis',   action: () => { navigateTo('screen-brain'); setTimeout(() => switchBrainTab('behaviour'), 300); }, badge: 'AI' },
  { icon: '📈', label: 'Money Patterns',       action: () => { navigateTo('screen-brain'); setTimeout(() => switchBrainTab('patterns'), 300); }, badge: 'AI' },
  { icon: '💬', label: 'Chat with AI',         action: () => { navigateTo('screen-brain'); setTimeout(() => switchBrainTab('chat'), 300); }, badge: 'AI' },
  { icon: '🎯', label: 'Set Monthly Budget',   action: openBudgetModal,                     badge: '' },
  { icon: '📤', label: 'Export Data',          action: exportData,                          badge: '' },
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
