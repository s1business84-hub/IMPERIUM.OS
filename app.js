/* ══════════════════════════════════════════════════════════
   IMPERIUM OS v5.0.0 — SIMPLIFIED ARCHITECTURE
   Check-in system + Passive data + Voice AI + XP
   ══════════════════════════════════════════════════════════ */
'use strict';

/* ── STATE ────────────────────────────────────────── */
let S = {
  user: null,
  onboarded: false,
  situation: '',
  goal: '',
  currency: '$',
  streak: 0,
  lastLogin: '',
  currentScreen: 'screen-boot',
  // XP / Gamification
  xp: 0,
  level: 1,
  totalXp: 0,
  achievements: [],
  // Check-in system
  checkins: {},      // { "dateString": { morning: {...}, afternoon: {...}, evening: {...}, night: {...} } }
  // Passive data
  passiveData: {},   // { "dateString": { steps, sleep, screenTime, score } }
  // Transactions (kept for voice logging)
  transactions: [],
};

function loadState() {
  try { const d = localStorage.getItem('imperium_state'); if (d) Object.assign(S, JSON.parse(d)); } catch(e){}
}
function saveState() {
  try { localStorage.setItem('imperium_state', JSON.stringify(S)); } catch(e){}
}

/* ── XP / GAMIFICATION ────────────────────────────── */
const LEVELS = [
  { level: 1, title: 'Beginner', xpNeeded: 0 },
  { level: 2, title: 'Focused', xpNeeded: 100 },
  { level: 3, title: 'Disciplined', xpNeeded: 300 },
  { level: 4, title: 'Consistent', xpNeeded: 600 },
  { level: 5, title: 'Driven', xpNeeded: 1000 },
  { level: 6, title: 'Relentless', xpNeeded: 1600 },
  { level: 7, title: 'Strategic', xpNeeded: 2500 },
  { level: 8, title: 'Elite', xpNeeded: 4000 },
  { level: 9, title: 'Master', xpNeeded: 6000 },
  { level: 10, title: 'Imperium', xpNeeded: 10000 }
];

const ACHIEVEMENTS = [
  { id: 'first-checkin', name: 'First Check-in', icon: '✅', desc: 'Complete your first check-in', xp: 50 },
  { id: 'streak-3', name: '3-Day Streak', icon: '��', desc: 'Check in for 3 consecutive days', xp: 75 },
  { id: 'streak-7', name: '7-Day Streak', icon: '⚡', desc: 'Check in for 7 consecutive days', xp: 150 },
  { id: 'streak-30', name: 'Monthly Master', icon: '👑', desc: '30-day check-in streak', xp: 500 },
  { id: 'full-day', name: 'Full Day', icon: '🌟', desc: 'Complete all 4 check-ins in one day', xp: 100 },
  { id: 'voice-first', name: 'Voice Activated', icon: '🎙️', desc: 'Use voice for the first time', xp: 30 },
  { id: 'insights-visit', name: 'Data Explorer', icon: '📊', desc: 'Visit the Insights screen', xp: 20 },
  { id: 'level-5', name: 'Halfway There', icon: '🚀', desc: 'Reach level 5', xp: 200 },
  { id: 'checkins-50', name: 'Habitual', icon: '🧠', desc: 'Complete 50 check-ins', xp: 250 },
  { id: 'tx-first', name: 'Money Tracker', icon: '💰', desc: 'Log your first transaction', xp: 30 },
];

function grantXP(amount, reason) {
  S.xp += amount;
  S.totalXp += amount;
  const oldLevel = S.level;
  S.level = computeLevel(S.xp);
  saveState();
  updateHomeXPChip();
  if (S.level > oldLevel) showLevelUpOverlay(S.level);
  if (reason) showToast('+' + amount + ' XP — ' + reason, 'success');
}

function computeLevel(xp) {
  let lv = 1;
  for (const l of LEVELS) { if (xp >= l.xpNeeded) lv = l.level; }
  return lv;
}

function getLevelInfo(lv) { return LEVELS.find(l => l.level === lv) || LEVELS[0]; }
function getXPForNextLevel(lv) { const next = LEVELS.find(l => l.level === lv + 1); return next ? next.xpNeeded : null; }

function updateHomeXPChip() {
  const lv = S.level || 1;
  const xp = S.xp || 0;
  const info = getLevelInfo(lv);
  const nextXp = getXPForNextLevel(lv);
  const pct = nextXp ? Math.min(100, ((xp - info.xpNeeded) / (nextXp - info.xpNeeded)) * 100) : 100;
  const lvEl = document.getElementById('home-xp-lvl');
  const barEl = document.getElementById('home-xp-bar');
  if (lvEl) lvEl.textContent = 'Lv ' + lv;
  if (barEl) barEl.style.width = pct + '%';
}

function showLevelUpOverlay(lv) {
  const info = getLevelInfo(lv);
  const nextXp = getXPForNextLevel(lv);
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('xp-ov-level', 'Level ' + lv);
  el('xp-ov-title', info.title);
  if (nextXp) {
    el('xp-ov-sub', '0 / ' + (nextXp - info.xpNeeded) + ' XP to Level ' + (lv + 1));
    const bar = document.getElementById('xp-ov-bar');
    if (bar) bar.style.width = '0%';
  } else {
    el('xp-ov-sub', 'MAX LEVEL REACHED');
  }
  const overlay = document.getElementById('xp-overlay');
  if (overlay) overlay.classList.remove('hidden');
  if (lv >= 5) unlockAchievement('level-5');
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
  grantXP(ach.xp, '🏆 ' + ach.name);
}

function checkAchievements() {
  const totalCheckins = getTotalCheckinCount();
  if (totalCheckins >= 1) unlockAchievement('first-checkin');
  if (totalCheckins >= 50) unlockAchievement('checkins-50');
  if (S.streak >= 3) unlockAchievement('streak-3');
  if (S.streak >= 7) unlockAchievement('streak-7');
  if (S.streak >= 30) unlockAchievement('streak-30');
  if (S.transactions.length >= 1) unlockAchievement('tx-first');
  // Check full day
  const today = new Date().toDateString();
  const todayCI = S.checkins[today];
  if (todayCI && todayCI.morning && todayCI.afternoon && todayCI.evening && todayCI.night) {
    unlockAchievement('full-day');
  }
}

function getTotalCheckinCount() {
  let count = 0;
  for (const date in S.checkins) {
    const ci = S.checkins[date];
    if (ci.morning) count++;
    if (ci.afternoon) count++;
    if (ci.evening) count++;
    if (ci.night) count++;
  }
  return count;
}

/* ── CHECK-IN SYSTEM ──────────────────────────────── */
const CHECKIN_PERIODS = {
  morning:   { icon: '🌅', label: 'Morning Check-in', hours: [5, 12] },
  afternoon: { icon: '☀️', label: 'Afternoon Check-in', hours: [12, 17] },
  evening:   { icon: '🌆', label: 'Evening Check-in', hours: [17, 21] },
  night:     { icon: '🌙', label: 'Night Check-in', hours: [21, 5] }
};

const CHECKIN_QUESTIONS = {
  morning: [
    { id: 'priority', text: "What's your #1 priority today?", type: 'text', placeholder: 'One thing that matters most…' },
    { id: 'sleep', text: 'How did you sleep?', type: 'options', options: ['Great', 'OK', 'Poor'] },
    { id: 'energy', text: 'Energy level right now?', type: 'options', options: ['High ⚡', 'Medium', 'Low 😴'] }
  ],
  afternoon: [
    { id: 'progress', text: 'Did you execute on your priority?', type: 'options', options: ['Yes ✅', 'Partially', 'No ❌'] },
    { id: 'distraction', text: 'What pulled your focus?', type: 'text', placeholder: 'Social media, meetings, nothing…' },
    { id: 'spend', text: 'Any money spent today?', type: 'text', placeholder: '$0 or what you spent on…' }
  ],
  evening: [
    { id: 'accomplished', text: 'What did you actually accomplish?', type: 'text', placeholder: 'Be specific…' },
    { id: 'idea', text: 'Any ideas worth capturing?', type: 'text', placeholder: 'Ideas, insights, or nothing…' },
    { id: 'rating', text: 'Rate your day so far', type: 'options', options: ['🔥 Great', '👍 Good', '😐 Meh', '👎 Bad'] }
  ],
  night: [
    { id: 'change', text: "One thing you'd change about today?", type: 'text', placeholder: 'If you could redo one thing…' },
    { id: 'screentime', text: 'Screen time today — too much?', type: 'options', options: ['Under control', 'Too much 📱', 'Way too much'] },
    { id: 'tomorrow', text: "Tomorrow's #1 intention?", type: 'text', placeholder: 'What will you do tomorrow…' }
  ]
};

function getCurrentPeriod() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function getNextPeriod(period) {
  const order = ['morning', 'afternoon', 'evening', 'night'];
  const idx = order.indexOf(period);
  return idx < 3 ? order[idx + 1] : null;
}

function initCheckinCard() {
  const today = new Date().toDateString();
  const period = getCurrentPeriod();
  const periodInfo = CHECKIN_PERIODS[period];
  const todayCI = S.checkins[today] || {};

  // Update header
  const iconEl = document.getElementById('checkin-period-icon');
  const periodEl = document.getElementById('checkin-period');
  const subEl = document.getElementById('checkin-sub');
  if (iconEl) iconEl.textContent = periodInfo.icon;
  if (periodEl) periodEl.textContent = periodInfo.label;

  // Check if current period already done
  if (todayCI[period]) {
    document.getElementById('checkin-questions').classList.add('hidden');
    const doneEl = document.getElementById('checkin-done');
    doneEl.classList.remove('hidden');
    const next = getNextPeriod(period);
    const doneText = document.getElementById('checkin-done-text');
    if (doneText) {
      doneText.textContent = next
        ? 'Check-in complete! Next: ' + CHECKIN_PERIODS[next].label.toLowerCase() + '.'
        : 'All check-ins done for today! 🎉';
    }
    if (subEl) subEl.textContent = 'Completed ✓';
    return;
  }

  // Show questions
  document.getElementById('checkin-questions').classList.remove('hidden');
  document.getElementById('checkin-done').classList.add('hidden');
  if (subEl) subEl.textContent = '3 quick questions';

  const questions = CHECKIN_QUESTIONS[period];
  const container = document.getElementById('checkin-questions');
  container.innerHTML = questions.map((q, i) => {
    if (q.type === 'text') {
      return '<div class="cq-item">' +
        '<div class="cq-text">' + q.text + '</div>' +
        '<input type="text" class="cq-input" id="cq-' + q.id + '" placeholder="' + q.placeholder + '" autocomplete="off"/>' +
      '</div>';
    } else {
      return '<div class="cq-item">' +
        '<div class="cq-text">' + q.text + '</div>' +
        '<div class="cq-options">' +
          q.options.map(opt => '<button class="cq-opt-btn" data-q="' + q.id + '" data-val="' + opt + '" onclick="pickCheckinOpt(this)">' + opt + '</button>').join('') +
        '</div>' +
      '</div>';
    }
  }).join('') + '<button class="btn-primary checkin-submit magnetic" onclick="submitCheckin()">Submit Check-in →</button>';
}

let checkinSelections = {};

function pickCheckinOpt(btn) {
  const qId = btn.dataset.q;
  const row = btn.parentElement;
  row.querySelectorAll('.cq-opt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  checkinSelections[qId] = btn.dataset.val;
}

function submitCheckin() {
  const period = getCurrentPeriod();
  const questions = CHECKIN_QUESTIONS[period];
  const answers = {};

  for (const q of questions) {
    if (q.type === 'text') {
      const el = document.getElementById('cq-' + q.id);
      const val = el ? el.value.trim() : '';
      if (!val) { showToast('Please answer: ' + q.text, 'error'); return; }
      answers[q.id] = val;
    } else {
      if (!checkinSelections[q.id]) { showToast('Please answer: ' + q.text, 'error'); return; }
      answers[q.id] = checkinSelections[q.id];
    }
  }

  // Save check-in
  const today = new Date().toDateString();
  if (!S.checkins[today]) S.checkins[today] = {};
  S.checkins[today][period] = {
    answers: answers,
    timestamp: new Date().toISOString()
  };

  // Parse money from afternoon check-in
  if (period === 'afternoon' && answers.spend) {
    const amtMatch = answers.spend.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
    if (amtMatch) {
      const amt = parseFloat(amtMatch[1]);
      if (amt > 0) {
        const noteMatch = answers.spend.replace(/\$?\s?\d+(?:\.\d{1,2})?/, '').trim();
        S.transactions.push({
          id: Date.now().toString(),
          type: 'expense',
          amount: amt,
          category: 'general',
          note: noteMatch || 'afternoon check-in',
          date: new Date().toISOString()
        });
      }
    }
  }

  saveState();
  checkinSelections = {};

  // Grant XP
  grantXP(30, period + ' check-in');
  checkAchievements();

  // Generate passive data for today if not exists
  generatePassiveData();

  // Refresh card
  initCheckinCard();
  updatePassiveStrip();

  // Generate AI insight from check-in
  const insight = generateCheckinInsight(period, answers);
  addHomeBotMessage('ai', insight);
}

function generateCheckinInsight(period, answers) {
  const name = S.user ? S.user.name.split(' ')[0] : 'there';

  if (period === 'morning') {
    const energy = answers.energy || '';
    const sleep = answers.sleep || '';
    const priority = answers.priority || '';
    if (energy.includes('Low') || sleep === 'Poor') {
      return "Low energy start today. Don't fight it — do your priority task (" + priority + ") in a 25-min focused burst. Momentum builds from one small win.";
    }
    return "Priority locked: \"" + priority + "\". Execute before noon. Everything else is noise until this is done.";
  }

  if (period === 'afternoon') {
    const progress = answers.progress || '';
    const distraction = answers.distraction || '';
    if (progress.includes('No')) {
      return "You didn't execute on your priority. " + (distraction ? "Distraction: " + distraction + ". " : "") + "You have the rest of the day — eliminate the distraction and give it 45 focused minutes. No excuses.";
    }
    if (progress.includes('Partially')) {
      return "Partial progress is better than none. " + (distraction ? "'" + distraction + "' pulled your focus. " : "") + "Push through the rest this evening.";
    }
    return "Priority executed ✅. The system rewards follow-through. Keep building on this momentum.";
  }

  if (period === 'evening') {
    const accomplished = answers.accomplished || '';
    const rating = answers.rating || '';
    const idea = answers.idea || '';
    if (rating.includes('Bad') || rating.includes('Meh')) {
      return "Not every day will be great. What matters is showing up tomorrow. " + (accomplished ? "You did accomplish: '" + accomplished + "' — that counts." : "Log what you can salvage.");
    }
    return "Day reviewed. " + (accomplished ? "You accomplished: '" + accomplished + "'. " : "") + (idea && idea.toLowerCase() !== 'nothing' ? "Idea captured: '" + idea + "' — don't let it decay." : "Solid execution today.");
  }

  if (period === 'night') {
    const change = answers.change || '';
    const tomorrow = answers.tomorrow || '';
    const screen = answers.screentime || '';
    let msg = "Debrief complete. ";
    if (screen.includes('too much') || screen.includes('Too much')) {
      msg += "Screen time was excessive — this is a pattern to watch. ";
    }
    if (tomorrow) msg += "Tomorrow's intention locked: '" + tomorrow + "'. ";
    msg += "Sleep well. The system resets at dawn.";
    return msg;
  }

  return "Check-in logged. Keep going.";
}

/* ── PASSIVE DATA (Simulated HealthKit) ───────────── */
function generatePassiveData() {
  const today = new Date().toDateString();
  if (S.passiveData[today]) return;

  // Simulate Apple Health-like data
  // In future: integrate with HealthKit / Health Connect API
  const h = new Date().getHours();
  const baseSteps = 2000 + Math.floor(Math.random() * 6000) + (h * 300);
  const sleepHrs = (5 + Math.random() * 4).toFixed(1);
  const screenMins = Math.floor(60 + Math.random() * 300);

  // Score derived from passive data + check-ins
  let score = 50;
  if (parseFloat(sleepHrs) >= 7) score += 15;
  else if (parseFloat(sleepHrs) >= 6) score += 5;
  else score -= 10;
  if (baseSteps >= 8000) score += 15;
  else if (baseSteps >= 5000) score += 5;
  if (screenMins < 120) score += 10;
  else if (screenMins > 240) score -= 10;

  // Add check-in quality bonus
  const todayCI = S.checkins[today] || {};
  const completedPeriods = Object.keys(todayCI).length;
  score += completedPeriods * 5;

  score = Math.max(0, Math.min(100, score));

  S.passiveData[today] = {
    steps: baseSteps,
    sleep: parseFloat(sleepHrs),
    screenTime: screenMins,
    score: score
  };
  saveState();
}

function updatePassiveStrip() {
  const today = new Date().toDateString();
  generatePassiveData();
  const data = S.passiveData[today];
  if (!data) return;

  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('passive-steps-val', data.steps >= 1000 ? (data.steps / 1000).toFixed(1) + 'K' : data.steps);
  el('passive-sleep-val', data.sleep + 'h');
  el('passive-screen-val', data.screenTime >= 60 ? Math.floor(data.screenTime / 60) + 'h' + (data.screenTime % 60 > 0 ? data.screenTime % 60 + 'm' : '') : data.screenTime + 'm');
  el('passive-score-val', data.score);

  // Color code score
  const scoreEl = document.getElementById('passive-score-val');
  if (scoreEl) {
    scoreEl.style.color = data.score >= 70 ? '#10b981' : data.score >= 40 ? '#f59e0b' : '#ef4444';
  }
}

/* ── BOOT SEQUENCE ────────────────────────────────── */
const BOOT_LOGS = [
  'Initialising kernel modules…',
  'Loading check-in engine…',
  'Connecting AI inference…',
  'Syncing passive data layer…',
  'Calibrating pattern detection…',
  'Mounting secure vault…',
  'Preparing voice interface…',
  'System ready.'
];

function runBoot() {
  const bar = document.getElementById('boot-bar');
  const logEl = document.getElementById('boot-log');
  let pct = 0, logIdx = 0;
  const timer = setInterval(() => {
    pct++;
    bar.style.width = pct + '%';
    const lIdx = Math.floor((pct / 100) * BOOT_LOGS.length);
    if (lIdx > logIdx && logIdx < BOOT_LOGS.length) {
      const line = document.createElement('div');
      line.className = 'log-line';
      line.textContent = '▸ ' + BOOT_LOGS[logIdx];
      logEl.appendChild(line);
      logIdx++;
      logEl.scrollTop = logEl.scrollHeight;
    }
    if (pct >= 100) { clearInterval(timer); setTimeout(bootDone, 400); }
  }, 24);
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

  const navMap = {
    'screen-home': 'nb-home',
    'screen-insights': 'nb-insights',
    'screen-profile': 'nb-profile'
  };
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (navMap[id]) {
    const nb = document.getElementById(navMap[id]);
    if (nb) nb.classList.add('active');
  }

  if (id === 'screen-home') { updateHomeScreen(); }
  if (id === 'screen-insights') { initInsights(); unlockAchievement('insights-visit'); }
  if (id === 'screen-profile') { initProfile(); }
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
  if (!name || !email || pass.length < 6) { showAuthMsg('Fill all fields (min 6 char password)'); return; }
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
    showBottomNav(); updateStreak(); navigateTo('screen-home'); initHomeData();
  } else {
    navigateTo('screen-onboarding');
  }
  initGlobalEffects();
}

function showAuthMsg(m) {
  const el = document.getElementById('auth-msg');
  if (el) { el.textContent = m; setTimeout(() => el.textContent = '', 4000); }
}

function togglePw(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

/* ── ONBOARDING (2 steps) ─────────────────────────── */
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

function goObStep(n) {
  const prev = document.getElementById('ob-' + obStep);
  const next = document.getElementById('ob-' + n);
  const forward = n > obStep;
  prev.classList.add(forward ? 'ob-exit-left' : 'ob-exit-right');
  setTimeout(() => prev.classList.remove('ob-slide-active', 'ob-exit-left', 'ob-exit-right'), 320);
  next.classList.add(forward ? 'ob-enter-right' : 'ob-enter-left');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    next.classList.add('ob-slide-active');
    next.classList.remove('ob-enter-right', 'ob-enter-left');
  }));
  obStep = n;
  document.getElementById('ob-fill').style.width = (n / 2 * 100) + '%';
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i < n));
  document.getElementById('ob-step-label').textContent = n + ' of 2';
  document.getElementById('ob-back').style.visibility = n > 1 ? 'visible' : 'hidden';
}

function obBack() { if (obStep > 1) goObStep(obStep - 1); }

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

/* ── HOME ─────────────────────────────────────────── */
let homeVoiceActive = false;
let homeRecognition = null;
let homeChatHistory = [];

function initHomeData() {
  updateHomeGreeting();
  initParticles();
  initBeams();
  initDottedGlow();
  updateHomeXPChip();
  initCheckinCard();
  updatePassiveStrip();

  if (!homeChatHistory.length) {
    const name = S.user ? S.user.name.split(' ')[0] : 'there';
    const period = getCurrentPeriod();
    const todayCI = S.checkins[new Date().toDateString()] || {};
    const completedCount = Object.keys(todayCI).length;

    let welcomeMsg;
    if (completedCount === 0) {
      welcomeMsg = "Hey " + name + " 👋 Welcome to your day. Start with your " + period + " check-in above — just 3 quick questions. I'll track the rest passively.";
    } else if (completedCount < 4) {
      welcomeMsg = "Welcome back, " + name + ". You've done " + completedCount + "/4 check-ins today. " + (todayCI[period] ? "Your " + period + " check-in is done ✅" : "Time for your " + period + " check-in!") + " Ask me anything or voice-log a transaction.";
    } else {
      welcomeMsg = "All 4 check-ins complete today! 🎉 You're crushing it, " + name + ". Ask me about patterns, or voice-log anything.";
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
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function updateHomeScreen() {
  updateHomeGreeting();
  initCheckinCard();
  updatePassiveStrip();
}

function toggleHomeVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice not supported in this browser', 'error');
    return;
  }
  if (homeVoiceActive) { stopHomeVoice(); return; }
  homeVoiceActive = true;
  unlockAchievement('voice-first');
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
  homeRecognition.onresult = (e) => { const text = e.results[0][0].transcript; stopHomeVoice(); homeChat(text); };
  homeRecognition.onerror = () => { stopHomeVoice(); showToast('Could not hear you, try again', 'error'); };
  homeRecognition.onend = () => stopHomeVoice();
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
  if (label) label.textContent = 'Tap to talk · voice log anything';
}

function homeChat(q) {
  const inputEl = document.getElementById('home-input');
  const text = q || (inputEl ? inputEl.value.trim() : '');
  if (!text) return;
  if (inputEl && !q) inputEl.value = '';
  addHomeBotMessage('user', text);

  // Check if it's a transaction logging intent
  const parsed = parseHomeTx(text);
  if (parsed) {
    logFromHomeBot(parsed, text);
  } else {
    generateHomeResponse(text);
  }
}

function parseHomeTx(text) {
  const t = text.toLowerCase();
  const incomeKw = ['got paid', 'received', 'earned', 'made', 'income', 'client paid', 'payment from', 'sold', 'revenue'];
  const expenseKw = ['spent', 'bought', 'paid for', 'paid', 'cost', 'purchase'];
  const isIncome = incomeKw.some(kw => t.includes(kw));
  const isExpense = expenseKw.some(kw => t.includes(kw));
  if (!isIncome && !isExpense) return null;
  const amtMatch = text.match(/[\$£€]?\s?(\d+(?:[.,]\d{1,2})?)/);
  if (!amtMatch) return null;
  const amount = parseFloat(amtMatch[1].replace(',', ''));
  if (isNaN(amount) || amount <= 0) return null;
  const noteMatch = text.match(/(?:on|for|from|at)\s+(.+?)(?:\s*$)/i);
  const note = noteMatch ? noteMatch[1].replace(/[$£€\d.,]/g, '').trim() : '';
  return { amount, type: isIncome ? 'income' : 'expense', note };
}

function logFromHomeBot(parsed, originalText) {
  const tx = {
    id: Date.now().toString(),
    type: parsed.type,
    amount: parsed.amount,
    category: 'general',
    note: parsed.note || originalText,
    date: new Date().toISOString()
  };
  S.transactions.push(tx);
  saveState();
  grantXP(20, parsed.type + ' logged');
  checkAchievements();
  const sign = tx.type === 'income' ? '+' : '-';
  addHomeBotMessage('ai', (tx.type === 'income' ? '✅' : '📝') + ' Logged: ' + sign + fmt(tx.amount) + (tx.note ? ' · ' + tx.note : '') + '. Keep going or ask me anything.');
}

function fmt(n) {
  const abs = Math.abs(n);
  const str = abs >= 1000 ? (abs / 1000).toFixed(1) + 'K' : abs.toFixed(2);
  return (n < 0 ? '-' : '') + S.currency + str;
}

function generateHomeResponse(text) {
  const t = text.toLowerCase();
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const todayPD = S.passiveData[today];
  const completedPeriods = Object.keys(todayCI).length;

  let reply = '';

  if (t.includes('today') || t.includes('how am i') || t.includes('status')) {
    reply = "Today's status:\n\n";
    reply += "📋 Check-ins: " + completedPeriods + "/4 complete\n";
    if (todayPD) {
      reply += "🚶 Steps: " + todayPD.steps + "\n";
      reply += "😴 Sleep: " + todayPD.sleep + "h\n";
      reply += "📱 Screen time: " + todayPD.screenTime + " min\n";
      reply += "⚡ Day score: " + todayPD.score + "/100\n\n";
    }
    if (todayCI.morning) reply += "Morning priority: \"" + (todayCI.morning.answers.priority || '—') + "\"\n";
    if (todayCI.afternoon) reply += "Progress: " + (todayCI.afternoon.answers.progress || '—') + "\n";
    if (todayCI.evening) reply += "Rating: " + (todayCI.evening.answers.rating || '—') + "\n";
    if (!completedPeriods) reply += "Complete your first check-in above to start tracking!";
    else reply += "\n" + (completedPeriods >= 3 ? "Strong day of tracking! Keep it up." : "Keep going — more check-ins = better insights.");

  } else if (t.includes('pattern') || t.includes('insight')) {
    const patterns = detectLifePatterns();
    if (patterns.length) {
      reply = "🧠 Patterns I've noticed:\n\n" + patterns.map(p => p.icon + ' ' + p.insight).join('\n\n');
    } else {
      reply = "Not enough data yet to detect patterns. Complete check-ins for 3+ days and I'll start finding patterns in your behavior.";
    }

  } else if (t.includes('advice') || t.includes('help') || t.includes('improve')) {
    const period = getCurrentPeriod();
    const adviceMap = {
      morning: "Morning advice:\n\n1. Do your #1 priority before checking any notifications\n2. First 90 minutes of your day are the highest cognitive quality — use them for deep work\n3. Move your body for even 10 minutes — it increases focus by 30%",
      afternoon: "Afternoon advice:\n\n1. If you haven't done your priority yet, block 45 minutes right now\n2. Energy dips are normal at 2-3pm — use this for admin tasks, not creative work\n3. Rate your morning honestly — awareness drives change",
      evening: "Evening advice:\n\n1. Review what you actually accomplished vs. what you planned\n2. Capture any ideas NOW — they won't survive until morning\n3. Set tomorrow's intention before you relax",
      night: "Night advice:\n\n1. Blue light after 9pm reduces sleep quality by 25%\n2. Write down tomorrow's #1 task — your subconscious will work on it overnight\n3. Quality sleep = better performance tomorrow. Protect it."
    };
    reply = adviceMap[period];

  } else if (t.includes('spend') || t.includes('money') || t.includes('spent')) {
    const monthTx = S.transactions.filter(tx => {
      const d = new Date(tx.date);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
    const totalSpent = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const totalInc = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    if (!monthTx.length) {
      reply = "No transactions logged this month. Say 'Spent $X on Y' or 'Got paid $X' and I'll track it.";
    } else {
      reply = "�� This month:\n\nIncome: " + fmt(totalInc) + "\nSpent: " + fmt(totalSpent) + "\nNet: " + fmt(totalInc - totalSpent) + "\n\n" + (totalSpent > totalInc ? "⚠️ Spending exceeds income. Cut discretionary spend." : "✅ You're in the green. Keep it up.");
    }

  } else {
    reply = "I'm your Imperium AI. I can help you:\n\n• Check today's status — 'How am I doing?'\n• See patterns — 'Show patterns'\n• Get advice — 'Give me advice'\n• Log money — 'Spent $40 on food'\n• Track income — 'Got paid $500'\n\nOr just talk to me about anything.";
  }

  addHomeBotMessage('ai', reply);
  homeChatHistory.push({ role: 'user', text }, { role: 'ai', text: reply });
}

function addHomeBotMessage(role, text) {
  const feed = document.getElementById('home-chat-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = 'hcm hcm-' + role;
  const icon = role === 'ai'
    ? '<div class="hcm-av">🧠</div>'
    : '<div class="hcm-av hcm-av-user">' + (S.user ? S.user.name[0].toUpperCase() : 'U') + '</div>';
  const formattedText = text.replace(/\n/g, '<br>');
  div.innerHTML = role === 'ai'
    ? icon + '<div class="hcm-bubble">' + formattedText + '</div>'
    : '<div class="hcm-bubble">' + formattedText + '</div>' + icon;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

/* ── PATTERN DETECTION ────────────────────────────── */
function detectLifePatterns() {
  const patterns = [];
  const dates = Object.keys(S.checkins).sort();
  if (dates.length < 3) return patterns;

  const recent = dates.slice(-7);

  // Sleep pattern
  let totalSleep = 0, sleepCount = 0;
  recent.forEach(d => {
    if (S.passiveData[d]) { totalSleep += S.passiveData[d].sleep; sleepCount++; }
  });
  if (sleepCount > 0) {
    const avgSleep = totalSleep / sleepCount;
    patterns.push({
      icon: avgSleep >= 7 ? '😴✅' : '😴⚠️',
      title: 'Sleep Pattern',
      insight: avgSleep >= 7
        ? 'Average sleep: ' + avgSleep.toFixed(1) + 'h — above the 7h threshold. Good recovery.'
        : 'Average sleep: ' + avgSleep.toFixed(1) + 'h — below 7h. Sleep debt compounds and tanks productivity. Prioritise 7.5h minimum.'
    });
  }

  // Productivity pattern from morning check-ins
  let priorities = 0, executed = 0;
  recent.forEach(d => {
    const ci = S.checkins[d];
    if (ci && ci.morning) priorities++;
    if (ci && ci.afternoon && ci.afternoon.answers.progress) {
      if (ci.afternoon.answers.progress.includes('Yes')) executed++;
    }
  });
  if (priorities >= 3) {
    const execRate = priorities > 0 ? Math.round((executed / priorities) * 100) : 0;
    patterns.push({
      icon: execRate >= 70 ? '🎯✅' : '🎯⚠️',
      title: 'Execution Rate',
      insight: 'You set priorities ' + priorities + ' days and executed ' + executed + ' times (' + execRate + '%). ' +
        (execRate >= 70 ? 'Strong execution. You do what you say.' : 'Gap between intention and action. The system detects a pattern of setting goals but not following through.')
    });
  }

  // Screen time pattern
  let totalScreen = 0, screenCount = 0;
  recent.forEach(d => {
    if (S.passiveData[d]) { totalScreen += S.passiveData[d].screenTime; screenCount++; }
  });
  if (screenCount > 0) {
    const avgScreen = Math.round(totalScreen / screenCount);
    patterns.push({
      icon: avgScreen <= 180 ? '📱✅' : '📱⚠️',
      title: 'Screen Time',
      insight: 'Average screen time: ' + Math.floor(avgScreen / 60) + 'h ' + (avgScreen % 60) + 'm/day. ' +
        (avgScreen <= 180 ? 'Under 3 hours — good digital discipline.' : 'Over 3 hours daily. That\'s ' + Math.round(avgScreen * 7 / 60) + ' hours/week that could be invested in growth.')
    });
  }

  // Day rating pattern
  let ratings = { great: 0, good: 0, meh: 0, bad: 0 };
  recent.forEach(d => {
    const ci = S.checkins[d];
    if (ci && ci.evening && ci.evening.answers.rating) {
      const r = ci.evening.answers.rating.toLowerCase();
      if (r.includes('great')) ratings.great++;
      else if (r.includes('good')) ratings.good++;
      else if (r.includes('meh')) ratings.meh++;
      else if (r.includes('bad')) ratings.bad++;
    }
  });
  const totalRated = ratings.great + ratings.good + ratings.meh + ratings.bad;
  if (totalRated >= 3) {
    const positive = ratings.great + ratings.good;
    const pct = Math.round((positive / totalRated) * 100);
    patterns.push({
      icon: pct >= 60 ? '📊✅' : '��⚠️',
      title: 'Mood Trend',
      insight: pct + '% of rated days were good or great (' + positive + '/' + totalRated + '). ' +
        (pct >= 60 ? 'Positive trend — protect whatever\'s working.' : 'More meh/bad days than good. Look at what\'s different on your good days and replicate it.')
    });
  }

  return patterns;
}

/* ── INSIGHTS SCREEN ──────────────────────────────── */
let weeklyChartInst = null;

function initInsights() {
  // Score card
  const dates = Object.keys(S.checkins).sort();
  const totalCI = getTotalCheckinCount();
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

  el('isc-checkins', totalCI);
  el('isc-streak', S.streak || 0);
  el('isc-xp', S.totalXp || 0);

  // Calculate weekly score
  const recent7 = dates.slice(-7);
  let avgScore = 0, scoreCount = 0;
  recent7.forEach(d => {
    if (S.passiveData[d]) { avgScore += S.passiveData[d].score; scoreCount++; }
  });
  if (scoreCount > 0) {
    avgScore = Math.round(avgScore / scoreCount);
    el('isc-score', avgScore);
    const gradeEl = document.getElementById('isc-grade');
    if (gradeEl) {
      gradeEl.textContent = avgScore >= 75 ? 'Excellent week' : avgScore >= 50 ? 'Good progress' : 'Room to improve';
      gradeEl.style.color = avgScore >= 75 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444';
    }
    const scoreEl = document.getElementById('isc-score');
    if (scoreEl) scoreEl.style.color = avgScore >= 75 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444';
  }

  // Weekly chart
  buildWeeklyChart();

  // Pattern cards
  const patterns = detectLifePatterns();
  const patternFeed = document.getElementById('pattern-feed');
  if (patternFeed) {
    if (patterns.length) {
      patternFeed.innerHTML = patterns.map(p =>
        '<div class="pattern-card glass-card">' +
          '<div class="pc-header"><span class="pc-icon">' + p.icon + '</span><div class="pc-title">' + p.title + '</div></div>' +
          '<div class="pc-insight">' + p.insight + '</div>' +
        '</div>'
      ).join('');
    } else {
      patternFeed.innerHTML = '<div class="pattern-empty">Complete at least 3 days of check-ins to unlock patterns.</div>';
    }
  }

  // Check-in history
  const historyEl = document.getElementById('checkin-history');
  if (historyEl) {
    const recentDates = dates.slice(-5).reverse();
    if (recentDates.length) {
      historyEl.innerHTML = recentDates.map(d => {
        const ci = S.checkins[d];
        const periods = Object.keys(ci);
        const pd = S.passiveData[d];
        return '<div class="history-card glass-card">' +
          '<div class="hc-date">' + new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + '</div>' +
          '<div class="hc-periods">' + periods.map(p => '<span class="hc-period-pill">' + CHECKIN_PERIODS[p].icon + ' ' + p + '</span>').join('') + '</div>' +
          (pd ? '<div class="hc-stats">🚶 ' + pd.steps + ' · 😴 ' + pd.sleep + 'h · 📱 ' + pd.screenTime + 'm · ⚡ ' + pd.score + '</div>' : '') +
        '</div>';
      }).join('');
    } else {
      historyEl.innerHTML = '<div class="pattern-empty">No check-ins yet. Start from Home.</div>';
    }
  }
}

function buildWeeklyChart() {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas) return;
  if (weeklyChartInst) { weeklyChartInst.destroy(); weeklyChartInst = null; }

  const labels = [], scores = [], steps = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    const pd = S.passiveData[ds];
    scores.push(pd ? pd.score : 0);
    steps.push(pd ? Math.round(pd.steps / 1000) : 0);
  }

  weeklyChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Day Score', data: scores, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
        { label: 'Steps (K)', data: steps, backgroundColor: 'rgba(59,130,246,0.5)', borderRadius: 6 }
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

/* ── BRAIN CHAT ───────────────────────────────────── */
let brainMicActive = false;
let brainRecognition = null;
let brainChatHistory = [];

function brainChat(q) {
  const inputEl = document.getElementById('brain-chat-input');
  const question = q || (inputEl ? inputEl.value.trim() : '');
  if (!question) return;
  if (inputEl) inputEl.value = '';
  addBrainMessage('user', question);
  setTimeout(() => addBrainMessage('ai', generateBrainResponse(question)), 600);
}

function addBrainMessage(role, text) {
  const feed = document.getElementById('brain-chat-feed');
  if (!feed) return;
  brainChatHistory.push({ role, text });
  const div = document.createElement('div');
  div.className = 'brain-msg brain-msg-' + role;
  div.innerHTML = role === 'ai'
    ? '<span class="bm-icon">🧠</span><div class="bm-bubble">' + text + '</div>'
    : '<div class="bm-bubble">' + text + '</div>';
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function generateBrainResponse(q) {
  const ql = q.toLowerCase();
  const patterns = detectLifePatterns();
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const dates = Object.keys(S.checkins);

  if (ql.includes('pattern') || ql.includes('see')) {
    if (!patterns.length) return 'I need at least 3 days of check-in data to detect patterns. Keep checking in daily!';
    return 'Here\'s what I see:\n\n' + patterns.map(p => p.icon + ' ' + p.title + ': ' + p.insight).join('\n\n');
  }

  if (ql.includes('improve') || ql.includes('better')) {
    const areas = [];
    patterns.forEach(p => {
      if (p.icon.includes('⚠️')) areas.push(p.title.toLowerCase());
    });
    if (areas.length) {
      return 'Focus areas based on your data: ' + areas.join(', ') + '. Pick ONE to work on this week. Trying to fix everything at once fixes nothing.';
    }
    return 'Your data looks good across the board. To keep improving: (1) increase your check-in consistency, (2) track one new habit, (3) set more ambitious daily priorities.';
  }

  if (ql.includes('time') || ql.includes('wast')) {
    const screenPat = patterns.find(p => p.title === 'Screen Time');
    if (screenPat) return screenPat.insight + '\n\nAction: Set a 2-hour daily screen time limit. Replace the excess with reading, exercise, or deep work.';
    return 'I need more passive data to analyse your time usage. Keep checking in — the screen time patterns will emerge.';
  }

  if (ql.includes('tomorrow') || ql.includes('focus')) {
    const nightCI = todayCI.night;
    if (nightCI && nightCI.answers.tomorrow) {
      return 'Your stated intention for tomorrow: "' + nightCI.answers.tomorrow + '". My advice: do this FIRST thing. Before email, before social media, before anything else. Protect the first 90 minutes of your day.';
    }
    return 'Complete your night check-in to set tomorrow\'s intention. The act of writing it down increases follow-through by 42% (Dominican University study).';
  }

  if (ql.includes('money') || ql.includes('spend') || ql.includes('finance')) {
    const monthTx = S.transactions.filter(tx => {
      const d = new Date(tx.date); const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
    const totalSpent = monthTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const totalInc = monthTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    if (!monthTx.length) return 'No financial data this month. Voice-log transactions from Home — just say "Spent $X on Y".';
    return 'This month: ' + fmt(totalInc) + ' income, ' + fmt(totalSpent) + ' spent, ' + fmt(totalInc - totalSpent) + ' net. ' +
      (totalSpent > totalInc ? 'You\'re spending more than you earn — cut discretionary spend immediately.' : 'You\'re in the green. Keep tracking consistently.');
  }

  // Default
  return 'Based on ' + dates.length + ' days of data: you have ' + getTotalCheckinCount() + ' total check-ins and a ' + (S.streak || 0) + '-day streak. ' +
    (patterns.length ? 'I\'ve found ' + patterns.length + ' patterns — ask me about "patterns" to explore them.' : 'Keep checking in daily and I\'ll start detecting patterns in your behavior.') +
    ' Ask me about patterns, improvement areas, time waste, or finances.';
}

function toggleBrainMic() {
  if (brainMicActive) { stopBrainMic(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Voice not supported.', 'error'); return; }
  brainRecognition = new SR();
  brainRecognition.continuous = false;
  brainRecognition.interimResults = false;
  brainRecognition.lang = 'en-US';
  const btn = document.getElementById('brain-mic-btn');
  if (btn) btn.classList.add('recording');
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
  if (brainRecognition) { try { brainRecognition.stop(); } catch(e) {} brainRecognition = null; }
  const btn = document.getElementById('brain-mic-btn');
  if (btn) btn.classList.remove('recording');
}

/* ── PROFILE / SETTINGS ───────────────────────────── */
function initProfile() {
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  if (S.user) {
    el('p-name', S.user.name || 'Imperium User');
    const av = document.getElementById('pav-icon');
    if (av && S.user.name) av.textContent = S.user.name[0].toUpperCase();
  }
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
  el('p-checkin-count', getTotalCheckinCount());
  const xpBar = document.getElementById('p-xp-bar');
  if (xpBar) xpBar.style.width = pct + '%';
  const ring = document.getElementById('streak-ring-fill');
  if (ring) {
    const ringPct = Math.min(1, (S.streak || 0) / 30);
    ring.style.strokeDashoffset = 226.2 * (1 - ringPct);
  }
  el('s-currency', S.currency + ' ' + (S.currency === '$' ? 'USD' : S.currency === '€' ? 'EUR' : S.currency === '£' ? 'GBP' : S.currency));
  renderAchievements();
}

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  const unlocked = S.achievements || [];
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const done = unlocked.includes(a.id);
    return '<div class="ach-item ' + (done ? '' : 'ach-locked') + '" title="' + a.desc + '">' +
      '<div class="ach-icon">' + (done ? a.icon : '🔒') + '</div>' +
      '<div class="ach-name">' + a.name + '</div>' +
      '<div class="ach-xp">+' + a.xp + ' XP</div>' +
    '</div>';
  }).join('');
}

function openCurrencyModal() {
  const currencies = ['$', '€', '£', '₹', '¥'];
  const idx = currencies.indexOf(S.currency);
  S.currency = currencies[(idx + 1) % currencies.length];
  saveState();
  const el = document.getElementById('s-currency');
  if (el) el.textContent = S.currency;
  showToast('Currency: ' + S.currency, 'success');
}

function exportData() {
  const data = JSON.stringify({ checkins: S.checkins, passiveData: S.passiveData, transactions: S.transactions }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'imperium-export.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

function resetApp() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  S.checkins = {};
  S.passiveData = {};
  S.transactions = [];
  S.streak = 0;
  S.xp = 0;
  S.totalXp = 0;
  S.level = 1;
  S.achievements = [];
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
  checkAchievements();
}

/* ── TOAST ────────────────────────────────────────── */
function showToast(msg, type) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast ' + (type || '');
  requestAnimationFrame(() => { t.offsetHeight; t.classList.add('show'); });
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── PARTICLES ────────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  let mouseX = -9999, mouseY = -9999;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) {
    particles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, r: Math.random() * 1.5 + 0.3, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, alpha: Math.random() * 0.5 + 0.1 });
  }
  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      const dx = mouseX - p.x, dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) { p.vx -= (dx / dist) * 0.06; p.vy -= (dy / dist) * 0.06; }
      p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy *= 0.98;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(96,165,250,' + p.alpha + ')'; ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = 'rgba(96,165,250,' + (0.08 * (1 - d / 100)) + ')'; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}

/* ── DOTTED GLOW ──────────────────────────────────── */
function initDottedGlow() {
  const canvas = document.getElementById('dotted-glow-canvas');
  if (!canvas || canvas._dottedGlowRunning) return;
  canvas._dottedGlowRunning = true;
  const ctx = canvas.getContext('2d');
  const GAP = 10, RADIUS = 1.6, SPEED_MIN = 0.3, SPEED_MAX = 1.6;
  let W, H, cols, rows, dots = [];
  function resize() {
    W = canvas.width = canvas.offsetWidth || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    cols = Math.ceil(W / GAP) + 1; rows = Math.ceil(H / GAP) + 1;
    dots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const glowing = Math.random() < 0.04;
      dots.push({ x: c * GAP, y: r * GAP, glow: glowing ? Math.random() : 0, speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN), dir: 1, active: glowing });
    }
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || document.body);
  let lastActivate = 0;
  function loop(ts) {
    if (!canvas._dottedGlowRunning) return;
    ctx.clearRect(0, 0, W, H);
    if (ts - lastActivate > 120) {
      for (let i = 0; i < 3; i++) { const d = dots[Math.floor(Math.random() * dots.length)]; if (d && !d.active) { d.active = true; d.dir = 1; } }
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
        ctx.beginPath(); ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2); ctx.fillStyle = 'rgba(163,163,163,0.18)'; ctx.fill();
      } else {
        const glowRadius = RADIUS + 4 * d.glow;
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowRadius);
        grad.addColorStop(0, 'rgba(56,189,248,' + (0.85 * d.glow) + ')');
        grad.addColorStop(0.4, 'rgba(14,165,233,' + (0.4 * d.glow) + ')');
        grad.addColorStop(1, 'rgba(7,89,133,0)');
        ctx.beginPath(); ctx.arc(d.x, d.y, glowRadius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2); ctx.fillStyle = 'rgba(186,230,253,' + (0.6 + 0.4 * d.glow) + ')'; ctx.fill();
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
  const beams = Array.from({ length: 6 }, (_, i) => ({ x: (i / 5) * window.innerWidth, y: 0, angle: Math.PI / 6 + (Math.random() - 0.5) * 0.3, speed: 0.0008 + Math.random() * 0.0008, phase: Math.random() * Math.PI * 2, color: i % 2 === 0 ? '59,130,246' : '168,85,247' }));
  function loop() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now();
    beams.forEach(b => {
      const alpha = 0.03 + 0.02 * Math.sin(t * b.speed + b.phase);
      const grad = ctx.createLinearGradient(b.x, 0, b.x + Math.tan(b.angle) * H, H);
      grad.addColorStop(0, 'rgba(' + b.color + ',0)'); grad.addColorStop(0.4, 'rgba(' + b.color + ',' + alpha + ')'); grad.addColorStop(1, 'rgba(' + b.color + ',0)');
      ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x + Math.tan(b.angle) * H + 60, H); ctx.lineTo(b.x + Math.tan(b.angle) * H - 60, H); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ── CURSOR GLOW ──────────────────────────────────── */
function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  let cx = -9999, cy = -9999, ax = cx, ay = cy;
  document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
  function update() { ax += (cx - ax) * 0.12; ay += (cy - ay) * 0.12; glow.style.left = ax + 'px'; glow.style.top = ay + 'px'; requestAnimationFrame(update); }
  update();
}

function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    el.addEventListener('mouseleave', () => el.style.transform = 'translate(0,0)');
  });
}

/* ── COMMAND PALETTE ──────────────────────────────── */
const COMMANDS = [
  { icon: '🏠', label: 'Go to Home', action: () => navigateTo('screen-home'), badge: '' },
  { icon: '🧠', label: 'Insights', action: () => navigateTo('screen-insights'), badge: 'AI' },
  { icon: '👤', label: 'Profile', action: () => navigateTo('screen-profile'), badge: '' },
  { icon: '📤', label: 'Export Data', action: exportData, badge: '' },
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
  filteredCmds = COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));
  cmdFocusIdx = 0;
  renderCmdList();
}

function renderCmdList() {
  const list = document.getElementById('cmd-list');
  if (!list) return;
  if (!filteredCmds.length) { list.innerHTML = '<div class="cmd-empty">No commands match.</div>'; return; }
  list.innerHTML = filteredCmds.map((c, i) =>
    '<div class="cmd-item' + (i === cmdFocusIdx ? ' focused' : '') + '" onclick="execCmd(' + i + ')">' +
      '<span class="cmd-item-icon">' + c.icon + '</span>' +
      '<span class="cmd-item-label">' + c.label + '</span>' +
      (c.badge ? '<span class="cmd-item-badge">' + c.badge + '</span>' : '') +
    '</div>'
  ).join('');
}

function execCmd(i) { closeCommand(); setTimeout(() => filteredCmds[i] && filteredCmds[i].action(), 150); }

function cmdKeyNav(e) {
  if (e.key === 'ArrowDown') { cmdFocusIdx = Math.min(cmdFocusIdx + 1, filteredCmds.length - 1); renderCmdList(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { cmdFocusIdx = Math.max(cmdFocusIdx - 1, 0); renderCmdList(); e.preventDefault(); }
  if (e.key === 'Enter') { execCmd(cmdFocusIdx); e.preventDefault(); }
  if (e.key === 'Escape') closeCommand();
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCommand(); }
  if (e.key === 'Escape') closeCommand();
});

/* ── GLOBAL EFFECTS ───────────────────────────────── */
function initGlobalEffects() {
  initCursorGlow();
  initMagnetic();
  setInterval(initMagnetic, 2000);
}

/* ── BOOT ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => runBoot());
