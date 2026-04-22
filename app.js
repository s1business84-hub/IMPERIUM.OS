/* ══════════════════════════════════════════════════════════
   IMPERIUM OS v8.0 — ChatGPT/Claude-Style UI
   Check-in system + Passive data + Voice AI + XP + Unified Chat
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
  xp: 0,
  level: 1,
  totalXp: 0,
  achievements: [],
  checkins: {},
  passiveData: {},
  transactions: [],
  assistantMessages: [],
  assistantUploads: [],
  guideSeen: false,
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
  { id: 'streak-3', name: '3-Day Streak', icon: '🔥', desc: 'Check in for 3 consecutive days', xp: 75 },
  { id: 'streak-7', name: '7-Day Streak', icon: '⚡', desc: 'Check in for 7 consecutive days', xp: 150 },
  { id: 'streak-30', name: 'Monthly Master', icon: '👑', desc: '30-day check-in streak', xp: 500 },
  { id: 'full-day', name: 'Full Day', icon: '🌟', desc: 'Complete all 4 check-ins in one day', xp: 100 },
  { id: 'voice-first', name: 'Voice Activated', icon: '🎙️', desc: 'Use voice for the first time', xp: 30 },
  { id: 'insights-visit', name: 'Data Explorer', icon: '📊', desc: 'View your insights', xp: 20 },
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
  updateSidebar();
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

/* ── CHECKIN OVERLAY ──────────────────────────────── */
function startCheckinFromChat() {
  startConversationalCheckin();
}

function closeCheckinOverlay() {
  const overlay = document.getElementById('checkin-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function initCheckinModal() {
  const today = new Date().toDateString();
  const period = getCurrentPeriod();
  const periodInfo = CHECKIN_PERIODS[period];
  const todayCI = S.checkins[today] || {};

  const iconEl = document.getElementById('checkin-period-icon');
  const periodEl = document.getElementById('checkin-period');
  const subEl = document.getElementById('checkin-sub');
  if (iconEl) iconEl.textContent = periodInfo.icon;
  if (periodEl) periodEl.textContent = periodInfo.label;

  const completedPeriods = Object.keys(todayCI);
  const completedCount = completedPeriods.length;

  if (todayCI[period]) {
    document.getElementById('checkin-questions').classList.add('hidden');
    const doneEl = document.getElementById('checkin-done');
    doneEl.classList.remove('hidden');
    const doneTitle = document.getElementById('checkin-done-title');
    const doneText = document.getElementById('checkin-done-text');
    const next = getNextPeriod(period);
    if (doneTitle) doneTitle.textContent = completedCount >= 4 ? 'All check-ins done! 🎉' : periodInfo.label + ' done';
    if (doneText) doneText.textContent = next ? 'Next: ' + CHECKIN_PERIODS[next].label.toLowerCase() : "You've completed your daily cycle";
    if (subEl) subEl.textContent = completedCount + '/4 complete';
    ['morning','afternoon','evening','night'].forEach(function(p) {
      const dot = document.getElementById('cdp-' + p);
      if (dot) dot.className = 'cdp-dot' + (todayCI[p] ? ' done' : (p === period ? ' current' : ''));
    });
    const cdpLabel = document.getElementById('cdp-label');
    if (cdpLabel) cdpLabel.textContent = completedCount + '/4';
    return;
  }

  document.getElementById('checkin-questions').classList.remove('hidden');
  document.getElementById('checkin-done').classList.add('hidden');
  if (subEl) subEl.textContent = '3 quick questions';

  const questions = CHECKIN_QUESTIONS[period];
  const container = document.getElementById('checkin-questions');
  container.innerHTML = questions.map((q) => {
    if (q.type === 'text') {
      return '<div class="cq-item"><div class="cq-label">' + q.text + '</div>' +
        '<input type="text" class="cq-input" id="cq-' + q.id + '" placeholder="' + q.placeholder + '" autocomplete="off"/></div>';
    } else {
      return '<div class="cq-item"><div class="cq-label">' + q.text + '</div><div class="cq-options">' +
        q.options.map(opt => '<button class="cq-opt" data-q="' + q.id + '" data-val="' + opt + '" onclick="pickCheckinOpt(this)">' + opt + '</button>').join('') +
        '</div></div>';
    }
  }).join('') + '<button class="btn-primary cq-submit-btn" onclick="submitCheckin()">Submit Check-in →</button>';
}

let checkinSelections = {};

function pickCheckinOpt(btn) {
  const qId = btn.dataset.q;
  const row = btn.parentElement;
  row.querySelectorAll('.cq-opt').forEach(b => b.classList.remove('selected'));
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

  const today = new Date().toDateString();
  if (!S.checkins[today]) S.checkins[today] = {};
  S.checkins[today][period] = { answers, timestamp: new Date().toISOString() };

  if (period === 'afternoon' && answers.spend) {
    const amtMatch = answers.spend.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
    if (amtMatch) {
      const amt = parseFloat(amtMatch[1]);
      if (amt > 0) {
        const noteMatch = answers.spend.replace(/\$?\s?\d+(?:\.\d{1,2})?/, '').trim();
        S.transactions.push({ id: Date.now().toString(), type: 'expense', amount: amt, category: 'general', note: noteMatch || 'afternoon check-in', date: new Date().toISOString() });
      }
    }
  }

  saveState();
  checkinSelections = {};
  grantXP(30, period + ' check-in');
  checkAchievements();
  recalcTodayScore();

  closeCheckinOverlay();

  // Post insight to chat
  const insight = generateCheckinInsight(period, answers);
  addChatMessage('ai', insight);
  updateActionCards();
}

function generateCheckinInsight(period, answers) {
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  if (period === 'morning') {
    const energy = answers.energy || '';
    const sleep = answers.sleep || '';
    const priority = answers.priority || '';
    if (energy.includes('Low') || sleep === 'Poor') {
      return "Low energy start today. Don't fight it — do your priority task (\"" + priority + "\") in a 25-min focused burst. Momentum builds from one small win.";
    }
    return "Priority locked: \"" + priority + "\". Execute before noon. Everything else is noise until this is done.";
  }
  if (period === 'afternoon') {
    const progress = answers.progress || '';
    const distraction = answers.distraction || '';
    if (progress.includes('No')) return "You didn't execute on your priority. " + (distraction ? "Distraction: " + distraction + ". " : "") + "Give it 45 focused minutes now. No excuses.";
    if (progress.includes('Partially')) return "Partial progress is better than none. " + (distraction ? "'" + distraction + "' pulled your focus. " : "") + "Push through the rest this evening.";
    return "Priority executed ✅. The system rewards follow-through. Keep building on this momentum.";
  }
  if (period === 'evening') {
    const accomplished = answers.accomplished || '';
    const rating = answers.rating || '';
    const idea = answers.idea || '';
    if (rating.includes('Bad') || rating.includes('Meh')) return "Not every day will be great. What matters is showing up tomorrow. " + (accomplished ? "You did accomplish: '" + accomplished + "' — that counts." : "");
    return "Day reviewed. " + (accomplished ? "You accomplished: '" + accomplished + "'. " : "") + (idea && idea.toLowerCase() !== 'nothing' ? "Idea captured: '" + idea + "' — don't let it decay." : "Solid execution today.");
  }
  if (period === 'night') {
    const tomorrow = answers.tomorrow || '';
    const screen = answers.screentime || '';
    let msg = "Debrief complete. ";
    if (screen && (screen.includes('too much') || screen.includes('Too much'))) msg += "Screen time was excessive — pattern to watch. ";
    if (tomorrow) msg += "Tomorrow's intention locked: '" + tomorrow + "'. ";
    msg += "Sleep well. The system resets at dawn.";
    return msg;
  }
  return "Check-in logged. Keep going.";
}

/* ── HEALTH DATA SYNC ─────────────────────────────── */
let syncCurrentStep = 0;
let healthPermissionGranted = false;

function openSyncFlow() {
  const overlay = document.getElementById('sync-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  healthPermissionGranted = localStorage.getItem('imp_health_permission') === 'granted';
  const today = new Date().toDateString();
  const data = S.passiveData[today];
  if (data && data.source === 'user') {
    const slider = document.getElementById('sync-sleep-slider');
    if (slider) slider.value = data.sleep || 7;
    syncUpdateSliderVal('sleep');
    const stepsInput = document.getElementById('sync-steps-input');
    if (stepsInput) stepsInput.value = data.steps || '';
    syncUpdateStepsQuality();
    const hrsEl = document.getElementById('sync-screen-hrs');
    const minsEl = document.getElementById('sync-screen-mins');
    if (hrsEl) hrsEl.value = data.screenTime ? Math.floor(data.screenTime / 60) : '';
    if (minsEl) minsEl.value = data.screenTime ? data.screenTime % 60 : '';
    syncUpdateScreenQuality();
    syncGoStep(1);
  } else if (healthPermissionGranted) {
    syncGoStep(1);
  } else {
    syncGoStep(0);
  }
}

function syncGoStep(step) {
  syncCurrentStep = step;
  for (let i = 0; i <= 4; i++) {
    const el = document.getElementById('sync-step-' + i);
    if (!el) continue;
    el.classList.remove('active');
    if (i === step) el.classList.add('active');
  }
}

function syncGrantPermission() {
  healthPermissionGranted = true;
  localStorage.setItem('imp_health_permission', 'granted');
  showToast('Health data access granted ✓', 'success');
  syncGoStep(1);
}

function syncSkipPermission() {
  healthPermissionGranted = true;
  localStorage.setItem('imp_health_permission', 'manual');
  syncGoStep(1);
}

function syncUpdateSliderVal(type) {
  if (type === 'sleep') {
    const slider = document.getElementById('sync-sleep-slider');
    const valEl = document.getElementById('sync-sleep-val');
    const qualEl = document.getElementById('sync-sleep-quality');
    if (!slider) return;
    const v = parseFloat(slider.value);
    if (valEl) valEl.textContent = v + 'h';
    if (qualEl) {
      if (v >= 7 && v <= 9) { qualEl.textContent = '✅ Optimal'; qualEl.style.color = '#34d399'; }
      else if (v >= 6) { qualEl.textContent = '⚠️ OK but could be better'; qualEl.style.color = '#fbbf24'; }
      else if (v > 0) { qualEl.textContent = '❌ Sleep deprived'; qualEl.style.color = '#f87171'; }
      else { qualEl.textContent = ''; qualEl.style.color = ''; }
    }
  }
}

function syncSetVal(type, val) {
  if (type === 'sleep') {
    const slider = document.getElementById('sync-sleep-slider');
    if (slider) { slider.value = val; syncUpdateSliderVal('sleep'); }
  }
}

function syncSetInput(type, val) {
  if (type === 'steps') {
    const input = document.getElementById('sync-steps-input');
    if (input) { input.value = val; syncUpdateStepsQuality(); }
  }
}

function syncUpdateStepsQuality() {
  const input = document.getElementById('sync-steps-input');
  const qualEl = document.getElementById('sync-steps-quality');
  if (!input || !qualEl) return;
  const v = parseInt(input.value) || 0;
  if (v >= 10000) { qualEl.textContent = '🏆 Excellent'; qualEl.style.color = '#34d399'; }
  else if (v >= 8000) { qualEl.textContent = '✅ Great'; qualEl.style.color = '#34d399'; }
  else if (v >= 5000) { qualEl.textContent = '👍 Decent'; qualEl.style.color = '#fbbf24'; }
  else if (v > 0) { qualEl.textContent = '⚠️ Low movement'; qualEl.style.color = '#f87171'; }
  else { qualEl.textContent = ''; qualEl.style.color = ''; }
}

function syncSetScreen(hrs, mins) {
  const hrsEl = document.getElementById('sync-screen-hrs');
  const minsEl = document.getElementById('sync-screen-mins');
  if (hrsEl) hrsEl.value = hrs;
  if (minsEl) minsEl.value = mins;
  syncUpdateScreenQuality();
}

function syncUpdateScreenQuality() {
  const hrs = parseInt(document.getElementById('sync-screen-hrs')?.value) || 0;
  const mins = parseInt(document.getElementById('sync-screen-mins')?.value) || 0;
  const total = hrs * 60 + mins;
  const qualEl = document.getElementById('sync-screen-quality');
  if (!qualEl) return;
  if (total > 0 && total <= 120) { qualEl.textContent = '✅ Under 2h — good'; qualEl.style.color = '#34d399'; }
  else if (total <= 240) { qualEl.textContent = '⚠️ Moderate'; qualEl.style.color = '#fbbf24'; }
  else if (total > 240) { qualEl.textContent = '❌ Over 4h'; qualEl.style.color = '#f87171'; }
  else { qualEl.textContent = ''; qualEl.style.color = ''; }
}

function syncSaveAll() {
  const sleep = parseFloat(document.getElementById('sync-sleep-slider')?.value) || 0;
  const steps = parseInt(document.getElementById('sync-steps-input')?.value) || 0;
  const screenHrs = parseInt(document.getElementById('sync-screen-hrs')?.value) || 0;
  const screenMins = parseInt(document.getElementById('sync-screen-mins')?.value) || 0;
  const screenTime = screenHrs * 60 + screenMins;

  if (sleep === 0 && steps === 0 && screenTime === 0) { showToast('Enter at least one value', 'error'); return; }

  const today = new Date().toDateString();
  let score = 50;
  if (sleep >= 7) score += 15; else if (sleep >= 6) score += 5; else if (sleep > 0) score -= 10;
  if (steps >= 8000) score += 15; else if (steps >= 5000) score += 5; else if (steps > 0 && steps < 3000) score -= 5;
  if (screenTime > 0 && screenTime < 120) score += 10; else if (screenTime > 240) score -= 10;
  const todayCI = S.checkins[today] || {};
  score += Object.keys(todayCI).length * 5;
  score = Math.max(0, Math.min(100, score));

  S.passiveData[today] = { steps, sleep, screenTime, score, source: 'user', syncedAt: new Date().toISOString() };
  saveState();

  const scoreNum = document.getElementById('sync-score-num');
  const scoreGrade = document.getElementById('sync-score-grade');
  const breakdown = document.getElementById('sync-score-breakdown');
  if (scoreNum) { scoreNum.textContent = '0'; }
  if (scoreGrade) scoreGrade.textContent = score >= 80 ? 'Crushing it today' : score >= 60 ? 'Good day' : score >= 40 ? 'Room for improvement' : 'Rough day';
  if (breakdown) {
    breakdown.innerHTML =
      '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>😴 Sleep ' + sleep + 'h</span><span>' + (sleep >= 7 ? '+15' : sleep >= 6 ? '+5' : '-10') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>🚶 Steps ' + steps + '</span><span>' + (steps >= 8000 ? '+15' : steps >= 5000 ? '+5' : '-5') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>📱 Screen ' + screenHrs + 'h' + (screenMins > 0 ? screenMins + 'm' : '') + '</span><span>' + (screenTime < 120 ? '+10' : screenTime > 240 ? '-10' : '0') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;font-weight:700"><span>⚡ Total</span><span>' + score + '/100</span></div>';
  }

  syncGoStep(4);
  let current = 0;
  const increment = Math.ceil(score / 30);
  const timer = setInterval(() => {
    current += increment;
    if (current >= score) { current = score; clearInterval(timer); }
    if (scoreNum) scoreNum.textContent = current;
  }, 30);

  grantXP(10, 'health sync');

  // Post to chat
  addChatMessage('ai', '❤️ Health synced! Sleep: ' + sleep + 'h · Steps: ' + steps + ' · Screen: ' + screenHrs + 'h' + (screenMins > 0 ? screenMins + 'm' : '') + ' · Score: ' + score + '/100');
}

function syncClose() {
  const overlay = document.getElementById('sync-overlay');
  if (overlay) overlay.classList.add('hidden');
  syncCurrentStep = 0;
}

function recalcTodayScore() {
  const today = new Date().toDateString();
  const data = S.passiveData[today];
  if (!data) return;
  let score = 50;
  if (data.sleep >= 7) score += 15; else if (data.sleep >= 6) score += 5; else if (data.sleep > 0) score -= 10;
  if (data.steps >= 8000) score += 15; else if (data.steps >= 5000) score += 5; else if (data.steps > 0 && data.steps < 3000) score -= 5;
  if (data.screenTime > 0 && data.screenTime < 120) score += 10; else if (data.screenTime > 240) score -= 10;
  const todayCI = S.checkins[today] || {};
  score += Object.keys(todayCI).length * 5;
  data.score = Math.max(0, Math.min(100, score));
  saveState();
}

/* ── BOOT SEQUENCE ────────────────────────────────── */
const BOOT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*<>[]{}|';
const BOOT_TEXT  = 'Imperium OS';

function runBoot() {
  const el = document.getElementById('boot-encrypt-text');
  if (!el) { bootDone(); return; }
  const chars = BOOT_TEXT.split('');
  const state = chars.map(() => BOOT_CHARS[Math.floor(Math.random() * BOOT_CHARS.length)]);
  el.innerHTML = renderBootText(state, chars, 0);
  let revealIndex = 0, scrambleTick = 0;

  const interval = setInterval(() => {
    scrambleTick++;
    for (let i = revealIndex; i < chars.length; i++) state[i] = BOOT_CHARS[Math.floor(Math.random() * BOOT_CHARS.length)];
    if (scrambleTick % 5 === 0 && revealIndex < chars.length) { state[revealIndex] = chars[revealIndex]; revealIndex++; }
    el.innerHTML = renderBootText(state, chars, revealIndex);
    if (revealIndex >= chars.length) { clearInterval(interval); setTimeout(bootDone, 520); }
  }, 40);
}

function renderBootText(state, original, revealedUpTo) {
  return state.map((ch, i) => {
    if (i < revealedUpTo) return '<span style="color:#10b981;font-weight:700">' + (original[i] === ' ' ? '&nbsp;' : original[i]) + '</span>';
    return '<span style="color:#333">' + ch + '</span>';
  }).join('');
}

function bootDone() {
  loadState();
  const boot = document.getElementById('screen-boot');
  boot.style.transition = 'opacity 0.5s ease';
  boot.style.opacity = '0';
  setTimeout(() => {
    boot.classList.remove('active');
    boot.style.display = 'none';
    checkAuth();
  }, 520);
}

function checkAuth() {
  initEmailJS();
  initTheme();
  initTrial();
  if (S.user && S.onboarded) {
    updateStreak();
    navigateTo('screen-main');
    initMainScreen();
    const daysLeft = getTrialDaysLeft();
    if (!hasActiveSubscription() && daysLeft <= 2 && daysLeft > 0) {
      setTimeout(() => showToast('⏰ ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left in trial', 'warn'), 1500);
    }
  } else if (S.user) {
    navigateTo('screen-onboarding');
  } else {
    navigateTo('screen-auth');
  }
  initMagnetic();
}

/* ── NAVIGATION ───────────────────────────────────── */
function navigateTo(id) {
  const prev = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next || prev === next) return;
  if (prev) {
    prev.classList.remove('active');
  }
  next.classList.add('active');
  S.currentScreen = id;
}

/* ── SIDEBAR ──────────────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('open');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('hidden', isOpen);
}

function closeSbGo(target) {
  toggleSidebar();
  setTimeout(() => {
    if (target === 'chat') {
      // already on main
    } else if (target === 'profile') {
      openPanel('profile');
    } else if (target === 'contact') {
      openPanel('contact');
    }
  }, 150);
}

function updateSidebar() {
  const lv = S.level || 1;
  const xp = S.xp || 0;
  const info = getLevelInfo(lv);
  const nextXp = getXPForNextLevel(lv);
  const pct = nextXp ? Math.min(100, ((xp - info.xpNeeded) / (nextXp - info.xpNeeded)) * 100) : 100;

  const nameEl = document.getElementById('sb-name');
  const levelEl = document.getElementById('sb-level');
  const xpFill = document.getElementById('sb-xp-fill');
  const avatarEl = document.getElementById('sb-avatar');
  const streakEl = document.getElementById('hdr-streak');

  if (nameEl && S.user) nameEl.textContent = S.user.name || 'User';
  if (levelEl) levelEl.textContent = 'Lv ' + lv + ' · ' + (S.totalXp || 0) + ' XP';
  if (xpFill) xpFill.style.width = pct + '%';
  if (avatarEl && S.user && S.user.name) avatarEl.textContent = S.user.name[0].toUpperCase();
  if (streakEl) streakEl.textContent = '🔥 ' + (S.streak || 0);
  updateHeaderContext();
}

/* ── PANELS ───────────────────────────────────────── */
function openPanel(name) {
  const panel = document.getElementById('panel-' + name);
  if (!panel) return;
  panel.classList.remove('hidden');
  if (name === 'profile') initProfile();
  if (name === 'contact') initContact();
}

function closePanel() {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
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
  sendWelcomeEmail('Guest', '');
  postAuth();
}

function postAuth() {
  if (S.onboarded) {
    updateStreak();
    navigateTo('screen-main');
    initMainScreen();
  } else {
    navigateTo('screen-onboarding');
  }
  initMagnetic();
}

function showAuthMsg(m) {
  const el = document.getElementById('auth-msg');
  if (el) { el.textContent = m; setTimeout(() => el.textContent = '', 4000); }
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

function goObStep(n) {
  const prev = document.getElementById('ob-' + obStep);
  const next = document.getElementById('ob-' + n);
  if (prev) prev.classList.remove('ob-slide-active');
  if (next) next.classList.add('ob-slide-active');
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
  if (!S.guideSeen) {
    showAppGuide();
  } else {
    updateStreak();
    grantXP(100, 'System Activated');
    navigateTo('screen-main');
    initMainScreen();
    initMagnetic();
  }
}

/* ── APP GUIDE ────────────────────────────────────── */
let guideStep = 1;
const GUIDE_TOTAL = 6;

function showAppGuide() {
  const overlay = document.getElementById('guide-overlay');
  if (overlay) { overlay.classList.remove('hidden'); overlay.style.cssText = 'position:fixed;inset:0;z-index:9999'; }
  guideStep = 1;
  updateGuideUI();
}

function updateGuideUI() {
  const fill = document.getElementById('guide-fill');
  if (fill) fill.style.width = (guideStep / GUIDE_TOTAL * 100) + '%';
  for (let i = 1; i <= GUIDE_TOTAL; i++) {
    const slide = document.getElementById('gs-' + i);
    if (slide) slide.classList.toggle('guide-slide-active', i === guideStep);
  }
  const dots = document.querySelectorAll('#guide-dots .guide-dot');
  dots.forEach((d, idx) => d.classList.toggle('active', idx < guideStep));
  const btn = document.getElementById('guide-next-btn');
  if (btn) btn.textContent = guideStep === GUIDE_TOTAL ? "Let's go! 🚀" : 'Next →';
  const skip = document.getElementById('guide-skip');
  if (skip) skip.style.opacity = guideStep === GUIDE_TOTAL ? '0' : '1';
}

function nextGuideStep() {
  if (guideStep < GUIDE_TOTAL) { guideStep++; updateGuideUI(); } else closeGuide();
}

function skipGuide() { closeGuide(); }

function closeGuide() {
  S.guideSeen = true;
  saveState();
  const overlay = document.getElementById('guide-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .4s ease';
    setTimeout(() => { overlay.classList.add('hidden'); overlay.style.cssText = ''; }, 400);
  }
  updateStreak();
  grantXP(100, 'System Activated');
  navigateTo('screen-main');
  initMainScreen();
  initMagnetic();
}

/* ── MAIN SCREEN INIT ─────────────────────────────── */
/* ── CONVERSATIONAL CHECK-IN FLOW ─────────────────── */
let checkinConvo = { active: false, period: null, questions: [], step: 0, answers: {} };

function initMainScreen() {
  updateWelcomeGreeting();
  updateSidebar();
  updateActionCards();
  initScienceCard();

  const feed = document.getElementById('chat-feed');
  if (feed && !feed.children.length) {
    startConversationalCheckin();
  }
}

function startConversationalCheckin() {
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  const h = new Date().getHours();
  const period = getCurrentPeriod();
  const periodInfo = CHECKIN_PERIODS[period];
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const completedCount = Object.keys(todayCI).length;

  // Hide welcome state, show chat
  const welcome = document.getElementById('welcome-state');
  if (welcome) welcome.classList.add('hidden');

  // Time-aware greeting
  const greetings = {
    morning: ["Good morning, " + name + "! ☀️ Hope you slept well.", "Morning, " + name + "! 🌅 Ready to take on the day?"],
    afternoon: ["Hey " + name + "! ☀️ How's your afternoon going?", "Afternoon, " + name + "! 🌤️ Let's check in."],
    evening: ["Evening, " + name + "! 🌆 Winding down?", "Hey " + name + "! 🌇 Let's reflect on today."],
    night: ["Hey " + name + " 🌙 Almost time to rest.", "Night check-in time, " + name + " 🌙"]
  };
  const greet = greetings[period][Math.floor(Math.random() * 2)];

  if (completedCount >= 4) {
    addChatMessage('ai', greet + "\n\nAll 4 check-ins are done today — you're on fire! 🔥🎉\n\nAnything else I can help with? You can ask me about your patterns, log spending, or just chat.");
    return;
  }

  if (todayCI[period]) {
    const next = getNextPeriod(period);
    const nextLabel = next ? CHECKIN_PERIODS[next].label.toLowerCase() : null;
    const nextTime = next ? CHECKIN_PERIODS[next].hours[0] : null;
    const nextStr = next ? "\n\n⏰ Your next check-in is the " + nextLabel + (nextTime ? " (around " + (nextTime > 12 ? (nextTime-12) + "pm" : nextTime + "am") + ")" : "") + "." : "\n\n🎉 You've completed all check-ins for today!";
    addChatMessage('ai', greet + "\n\nYou've already done your " + period + " check-in ✅ (" + completedCount + "/4 today)." + nextStr + "\n\nWhat would you like to do? I'm here if you need anything! 😊");
    return;
  }

  // Start the conversational check-in
  checkinConvo = {
    active: true,
    period: period,
    questions: CHECKIN_QUESTIONS[period],
    step: 0,
    answers: {}
  };

  const friendlyIntro = {
    morning: "Let's start your day right — I've got 3 quick questions for you. Just speak or type your answers! 🎤",
    afternoon: "Quick afternoon check-in — 3 little questions to see how your day's going! 💬",
    evening: "Let's do a quick evening reflection — just 3 questions, takes 30 seconds! ✨",
    night: "Before you wind down, let's capture today — 3 quick questions! 🌙"
  };

  addChatMessage('ai', greet + "\n\n" + friendlyIntro[period]);

  // Ask first question after a brief pause
  setTimeout(function() {
    askCheckinQuestion();
  }, 1200);
}

function askCheckinQuestion() {
  if (!checkinConvo.active) return;
  const q = checkinConvo.questions[checkinConvo.step];
  if (!q) return;

  const questionNum = checkinConvo.step + 1;
  const total = checkinConvo.questions.length;
  let prompt = "**" + questionNum + "/" + total + "** — " + q.text;

  if (q.type === 'options') {
    prompt += "\n\n" + q.options.map(function(o, i) { return "  " + (i+1) + ". " + o; }).join("\n");
    prompt += "\n\n_(Say or type your choice)_";
  } else {
    prompt += "\n\n_(Speak or type your answer)_";
  }

  addChatMessage('ai', prompt);
}

function handleCheckinAnswer(text) {
  if (!checkinConvo.active) return false;
  const q = checkinConvo.questions[checkinConvo.step];
  if (!q) return false;

  let answer = text.trim();

  // For options, try to match by number or text
  if (q.type === 'options') {
    const num = parseInt(answer);
    if (num >= 1 && num <= q.options.length) {
      answer = q.options[num - 1];
    } else {
      // Fuzzy match
      const lower = answer.toLowerCase();
      const match = q.options.find(function(o) { return o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase().replace(/[^a-z ]/g,'')); });
      if (match) answer = match;
      else {
        // Accept first word match
        const wordMatch = q.options.find(function(o) { return o.toLowerCase().split(/\s+/).some(function(w) { return lower.includes(w.toLowerCase()) && w.length > 2; }); });
        if (wordMatch) answer = wordMatch;
      }
    }
  }

  checkinConvo.answers[q.id] = answer;
  checkinConvo.step++;

  // Friendly acknowledgments
  const acks = ["Got it! 👍", "Noted! ✏️", "Nice, thanks! 😊", "Okay! 👌", "Logged! ✅", "Heard you! 🎧"];
  const ack = acks[Math.floor(Math.random() * acks.length)];

  if (checkinConvo.step < checkinConvo.questions.length) {
    addChatMessage('ai', ack);
    setTimeout(function() { askCheckinQuestion(); }, 800);
  } else {
    // All questions answered — complete the check-in
    finishConversationalCheckin(ack);
  }
  return true;
}

function finishConversationalCheckin(ack) {
  const period = checkinConvo.period;
  const answers = checkinConvo.answers;
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  const today = new Date().toDateString();

  // Save check-in
  if (!S.checkins[today]) S.checkins[today] = {};
  S.checkins[today][period] = { answers: answers, timestamp: new Date().toISOString() };

  // Parse afternoon spending
  if (period === 'afternoon' && answers.spend) {
    const amtMatch = answers.spend.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
    if (amtMatch) {
      const amt = parseFloat(amtMatch[1]);
      if (amt > 0) {
        const noteMatch = answers.spend.replace(/\$?\s?\d+(?:\.\d{1,2})?/, '').trim();
        S.transactions.push({ id: Date.now().toString(), type: 'expense', amount: amt, category: 'general', note: noteMatch || 'afternoon check-in', date: new Date().toISOString() });
      }
    }
  }

  saveState();
  grantXP(30, period + ' check-in');
  checkAchievements();
  recalcTodayScore();
  checkinConvo = { active: false, period: null, questions: [], step: 0, answers: {} };

  // Generate insight
  const insight = generateCheckinInsight(period, answers);

  // Next check-in info
  const todayCI = S.checkins[today] || {};
  const completedCount = Object.keys(todayCI).length;
  const next = getNextPeriod(period);
  let nextMsg = '';
  if (completedCount >= 4) {
    nextMsg = "\n\n🎉 **All 4 check-ins done today!** You're absolutely crushing it, " + name + "!";
  } else if (next) {
    const nextInfo = CHECKIN_PERIODS[next];
    const nextHour = nextInfo.hours[0];
    const timeStr = nextHour > 12 ? (nextHour - 12) + "pm" : nextHour + "am";
    nextMsg = "\n\n⏰ Next check-in: **" + nextInfo.label + "** (around " + timeStr + "). I'll be here! 😊";
  }

  // Suggestions
  const suggestions = "\n\nAnything else you'd like to do? You can:\n• Say **\"how am I doing\"** for insights\n• Say **\"log spending\"** to track expenses\n• Or just chat with me about anything! 💬";

  addChatMessage('ai', ack + " Check-in complete! +30 XP ⚡\n\n" + insight + nextMsg + suggestions);
  updateActionCards();
}

function updateWelcomeGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = S.user ? S.user.name.split(' ')[0] : '';
  const titleEl = document.getElementById('welcome-title');
  const subEl = document.getElementById('welcome-sub');
  if (titleEl) titleEl.textContent = greet + (name ? ', ' + name : '');
  if (subEl) subEl.textContent = getWelcomeSubtext();
  updateHeaderContext();
  updateWelcomeStats();
}

function getWelcomeSubtext() {
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const todayPD = S.passiveData[today];
  const currentPeriod = getCurrentPeriod();
  const currentDone = !!todayCI[currentPeriod];
  if (todayPD && todayPD.score >= 75) return 'You have strong momentum today — protect it and keep stacking wins.';
  if (todayPD && todayPD.score < 50) return 'Your dashboard is picking up some drag today — let’s make the next move count.';
  if (!currentDone) return 'Your next best move is a quick ' + CHECKIN_PERIODS[currentPeriod].label.toLowerCase() + '.';
  return 'Your dashboard is synced and ready — tap a card or ask Imperium anything.';
}

function updateHeaderContext() {
  const subtitleEl = document.getElementById('hdr-subtitle');
  if (!subtitleEl) return;
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const currentPeriod = getCurrentPeriod();
  const currentDone = !!todayCI[currentPeriod];
  const todayPD = S.passiveData[today];
  if (todayPD && todayPD.score) {
    subtitleEl.textContent = 'Score ' + todayPD.score + '/100 · ' + Object.keys(todayCI).length + '/4 check-ins';
    return;
  }
  subtitleEl.textContent = currentDone
    ? 'Current check-in complete · Explore your insights'
    : 'Next up: ' + CHECKIN_PERIODS[currentPeriod].label;
}

function updateWelcomeStats() {
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const todayPD = S.passiveData[today];
  const completedCount = Object.keys(todayCI).length;
  const scoreEl = document.getElementById('welcome-stat-score');
  const scoreSubEl = document.getElementById('welcome-stat-score-sub');
  const checkinsEl = document.getElementById('welcome-stat-checkins');
  const nextEl = document.getElementById('welcome-stat-next');
  const focusEl = document.getElementById('welcome-stat-focus');
  const focusSubEl = document.getElementById('welcome-stat-focus-sub');
  const morningPriority = todayCI.morning && todayCI.morning.answers ? todayCI.morning.answers.priority : '';
  const currentPeriod = getCurrentPeriod();
  const nextPeriod = todayCI[currentPeriod] ? getNextPeriod(currentPeriod) : currentPeriod;

  if (scoreEl) scoreEl.textContent = todayPD ? todayPD.score + '/100' : '--';
  if (scoreSubEl) scoreSubEl.textContent = todayPD
    ? (todayPD.score >= 75 ? 'High momentum day' : todayPD.score >= 55 ? 'Solid base to build on' : 'A few levers need attention')
    : 'Sync sleep, steps, and screen time';

  if (checkinsEl) checkinsEl.textContent = completedCount + '/4';
  if (nextEl) {
    nextEl.textContent = nextPeriod
      ? 'Next up: ' + CHECKIN_PERIODS[nextPeriod].label
      : 'Daily cycle complete 🎉';
  }

  if (focusEl) focusEl.textContent = morningPriority || 'No priority locked in yet';
  if (focusSubEl) {
    if (todayCI.afternoon && todayCI.afternoon.answers && todayCI.afternoon.answers.progress) {
      focusSubEl.textContent = 'Afternoon status: ' + todayCI.afternoon.answers.progress;
    } else if (morningPriority) {
      focusSubEl.textContent = 'Morning priority set — now convert it into execution';
    } else {
      focusSubEl.textContent = 'Your priority appears here after morning check-in';
    }
  }
}

function updateActionCards() {
  const period = getCurrentPeriod();
  const periodInfo = CHECKIN_PERIODS[period];
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const completedCount = Object.keys(todayCI).length;

  const iconEl = document.getElementById('checkin-action-icon');
  const labelEl = document.getElementById('checkin-action-label');
  const subEl = document.getElementById('checkin-action-sub');
  if (iconEl) iconEl.textContent = periodInfo.icon;
  if (labelEl) labelEl.textContent = todayCI[period] ? periodInfo.label + ' ✅' : periodInfo.label;
  if (subEl) subEl.textContent = completedCount + '/4 done · +30 XP';

  // Insights sub
  const patterns = detectLifePatterns();
  const insightSub = document.getElementById('insights-action-sub');
  if (insightSub) insightSub.textContent = patterns.length > 0 ? patterns.length + ' patterns found' : 'Need 3+ days';

  // Spend sub
  const monthTx = S.transactions.filter(tx => {
    const d = new Date(tx.date); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && tx.type === 'expense';
  });
  const totalSpent = monthTx.reduce((s, tx) => s + tx.amount, 0);
  const spendSub = document.getElementById('spend-action-sub');
  if (spendSub) spendSub.textContent = monthTx.length > 0 ? fmt(totalSpent) + ' this month' : 'Tap or voice-log';

  // Health sub
  const todayPD = S.passiveData[today];
  const healthSub = document.getElementById('health-action-sub');
  if (healthSub) healthSub.textContent = todayPD ? '⚡ Score: ' + todayPD.score + '/100' : 'Not synced today';
  updateWelcomeStats();
  updateHeaderContext();
}

/* ── CHAT MESSAGES ────────────────────────────────── */
function addChatMessage(role, text) {
  const feed = document.getElementById('chat-feed');
  const welcome = document.getElementById('welcome-state');
  if (!feed) return;
  if (welcome) welcome.classList.add('hidden');
  const div = document.createElement('div');
  div.className = 'msg msg-' + role;
  const avatar = role === 'ai'
    ? '<div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v6c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12V7L12 2z"/></svg></div>'
    : '<div class="msg-avatar">' + (S.user ? S.user.name[0].toUpperCase() : 'U') + '</div>';
  const formattedText = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  div.innerHTML = avatar + '<div><div class="msg-bubble">' + formattedText + '</div><div class="msg-time">' + time + '</div></div>';
  feed.appendChild(div);
  const chatArea = document.getElementById('chat-area');
  if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

function addChatRich(html) {
  const feed = document.getElementById('chat-feed');
  const welcome = document.getElementById('welcome-state');
  if (!feed) return;
  if (welcome) welcome.classList.add('hidden');
  const div = document.createElement('div');
  div.className = 'msg msg-ai';
  const avatar = '<div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v6c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12V7L12 2z"/></svg></div>';
  const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  div.innerHTML = avatar + '<div><div class="msg-bubble rich-card">' + html + '</div><div class="msg-time">' + time + '</div></div>';
  feed.appendChild(div);
  const chatArea = document.getElementById('chat-area');
  if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

function clearMainChat() {
  if (!confirm('Clear chat history?')) return;
  const feed = document.getElementById('chat-feed');
  if (feed) feed.innerHTML = '';
  const welcome = document.getElementById('welcome-state');
  if (welcome) welcome.classList.remove('hidden');
  showToast('Chat cleared', 'success');
}

/* ── UNIFIED CHAT ─────────────────────────────────── */
let LLM_CONFIG = {
  provider: 'ollama',
  ollama: { url: 'http://localhost:11434/api/chat', model: 'llama3.2:latest' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', apiKey: '' },
  lastUsed: 0,
  rateLimitMs: 2000
};

function loadLLMConfig() {
  const saved = localStorage.getItem('imperium_llm_config');
  if (saved) try { Object.assign(LLM_CONFIG, JSON.parse(saved)); } catch(e) {}
}

function saveLLMConfig() { localStorage.setItem('imperium_llm_config', JSON.stringify(LLM_CONFIG)); }

function getAppContext() {
  const recentDays = 7;
  const cutoff = Date.now() - recentDays * 86400000;
  const context = {
    user: S.user || { name: 'User' }, situation: S.situation || 'unknown', goal: S.goal || 'optimize life',
    totalCheckins: getTotalCheckinCount(), streak: S.streak || 0, level: S.level || 1,
    recentCheckins: {}, passiveData: {}, transactions: [], currency: S.currency || '$'
  };
  Object.keys(S.checkins || {}).sort().slice(-recentDays).forEach(date => { context.recentCheckins[date] = S.checkins[date]; });
  Object.keys(S.passiveData || {}).sort().slice(-recentDays).forEach(date => { context.passiveData[date] = S.passiveData[date]; });
  (S.transactions || []).filter(tx => Date.parse(tx.date) > cutoff).forEach(tx => { context.transactions.push(tx); });
  return context;
}

async function callLLM(userMessage) {
  const now = Date.now();
  if (now - LLM_CONFIG.lastUsed < LLM_CONFIG.rateLimitMs) return { error: 'Please wait a moment' };
  LLM_CONFIG.lastUsed = now; saveLLMConfig();
  const context = getAppContext();
  const todayDate = new Date().toDateString();
  const todayCI = context.recentCheckins[todayDate] || {};
  const todayPD = context.passiveData[todayDate];
  const period = getCurrentPeriod();
  const recentTx = context.transactions.slice(-5);
  const systemPrompt = `You are Imperium — a sharp, perceptive personal AI that actually thinks before speaking. You're not a generic chatbot. You have REAL data about this person.

USER PROFILE:
- Name: ${context.user.name}
- Life situation: ${context.situation || 'not specified'}
- Core goal: ${context.goal || 'optimize life'}
- Level ${context.level}, ${context.streak}-day streak, ${context.totalCheckins} total check-ins

TODAY (${todayDate}, ${period}):
- Check-ins done: ${JSON.stringify(todayCI)}
- Health: ${todayPD ? 'Sleep ' + todayPD.sleep + 'h, Steps ' + todayPD.steps + ', Screen ' + todayPD.screenTime + 'min, Score ' + todayPD.score + '/100' : 'not synced'}
- Recent spending: ${recentTx.length > 0 ? recentTx.map(t => t.type + ' ' + t.amount + ' ' + (t.note||'')).join(', ') : 'none'}

LAST 7 DAYS CHECK-INS:
${JSON.stringify(context.recentCheckins, null, 0)}

HEALTH HISTORY:
${JSON.stringify(context.passiveData, null, 0)}

RULES:
1. Reference SPECIFIC data points — quote their actual numbers, priorities, answers
2. Notice PATTERNS — if sleep dropped 3 days in a row, SAY that. If they keep missing afternoon check-ins, point it out
3. Be warm but direct — like a smart friend who genuinely cares, not a corporate assistant
4. Give ONE concrete, actionable suggestion, not a list of 5 generic tips
5. Keep responses 2-5 sentences. No filler. Every word should earn its place
6. If they set a morning priority, check if afternoon data shows they followed through
7. Connect dots between their data — sleep affects energy affects execution
8. Use emojis sparingly and naturally, not excessively
9. If you don't have enough data to say something meaningful, be honest about it
10. NEVER say "As an AI" or "I don't have feelings" — you're Imperium, act like it`;

  try {
    let url, payload;
    if (LLM_CONFIG.provider === 'ollama') {
      url = LLM_CONFIG.ollama.url;
      payload = { model: LLM_CONFIG.ollama.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], stream: false, options: { temperature: 0.7, num_predict: 300 } };
    } else {
      if (!LLM_CONFIG.openai.apiKey) return { error: 'OpenAI API key required.' };
      url = LLM_CONFIG.openai.url;
      payload = { model: LLM_CONFIG.openai.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], temperature: 0.7, max_tokens: 300 };
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(LLM_CONFIG.provider === 'openai' && { 'Authorization': 'Bearer ' + LLM_CONFIG.openai.apiKey }) },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const aiText = LLM_CONFIG.provider === 'ollama' ? (data.message?.content || data.response || 'No response') : (data.choices[0]?.message?.content || 'No response');
    return { success: true, text: aiText.trim() };
  } catch (error) {
    return { error: 'AI service unavailable.', fallback: true };
  }
}

async function sendMainChat(q) {
  const inputEl = document.getElementById('chat-input');
  const text = q || (inputEl ? inputEl.value.trim() : '');
  if (!text) return;
  if (inputEl && !q) { inputEl.value = ''; inputEl.style.height = 'auto'; }

  addChatMessage('user', text);

  // If conversational check-in is active, route answer there
  if (checkinConvo.active) {
    handleCheckinAnswer(text);
    return;
  }

  // Check for "check in" or "checkin" request to start flow
  if (/^(check.?in|start check.?in|do.*check.?in)/i.test(text.trim())) {
    startConversationalCheckin();
    return;
  }

  // Check for transaction
  const parsed = parseHomeTx(text);
  if (parsed) { logFromChat(parsed, text); return; }

  // Check for spend intent
  if (/log spend|track spend/i.test(text)) { showSpendInChat(); return; }

  // Show typing
  const feed = document.getElementById('chat-feed');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg msg-ai';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = '<div class="msg-avatar">⚡</div><div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';
  if (feed) { feed.appendChild(typingDiv); const chatArea = document.getElementById('chat-area'); if (chatArea) chatArea.scrollTop = chatArea.scrollHeight; }

  // LLM call
  const result = await callLLM(text);
  const te = document.getElementById('typing-indicator');
  if (te) te.remove();

  if (result.success) {
    addChatMessage('ai', result.text);
  } else if (result.fallback) {
    generateLocalResponse(text);
  } else {
    addChatMessage('ai', '🤖 ' + (result.error || 'Try again soon.'));
  }
}

function sendChip(text) {
  const inputEl = document.getElementById('chat-input');
  if (inputEl) inputEl.value = text;
  sendMainChat(text);
}

function autoResizeMainInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
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

function logFromChat(parsed, originalText) {
  const tx = { id: Date.now().toString(), type: parsed.type, amount: parsed.amount, category: 'general', note: parsed.note || originalText, date: new Date().toISOString() };
  S.transactions.push(tx);
  saveState();
  grantXP(20, parsed.type + ' logged');
  checkAchievements();
  const sign = tx.type === 'income' ? '+' : '-';
  addChatMessage('ai', (tx.type === 'income' ? '✅' : '📝') + ' Logged: ' + sign + fmt(tx.amount) + (tx.note ? ' · ' + tx.note : '') + '. Keep going!');
  updateActionCards();
}

function fmt(n) {
  const abs = Math.abs(n);
  const str = abs >= 1000 ? (abs / 1000).toFixed(1) + 'K' : abs.toFixed(2);
  return (n < 0 ? '-' : '') + S.currency + str;
}

function generateLocalResponse(text) {
  const t = text.toLowerCase();
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const todayPD = S.passiveData[today];
  const completedPeriods = Object.keys(todayCI).length;
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  const period = getCurrentPeriod();

  if (t.includes('today') || t.includes('how am i') || t.includes('status') || t.includes('doing')) {
    showInsightsInChat();
    return;
  }

  if (t.includes('pattern') || t.includes('insight')) {
    showInsightsInChat();
    return;
  }

  if (t.includes('advice') || t.includes('help') || t.includes('improve') || t.includes('tip')) {
    let advice = '';
    // Actually reference their data
    if (todayCI.morning && todayCI.morning.answers.priority) {
      const priority = todayCI.morning.answers.priority;
      if (todayCI.afternoon && todayCI.afternoon.answers.progress) {
        const progress = todayCI.afternoon.answers.progress;
        if (progress.includes('No') || progress.includes('Partially')) {
          advice = "Your priority was \"" + priority + "\" and you " + (progress.includes('No') ? "didn't get to it" : "partially completed it") + ". Here's what works: break it into the smallest possible next action — something you can start in the next 2 minutes. Momentum beats motivation every time.";
        } else {
          advice = "You executed on \"" + priority + "\" today — that's what separates builders from dreamers. For tomorrow, try setting your priority the night before. Research shows this primes your subconscious to work on it while you sleep.";
        }
      } else {
        advice = "Your priority today is \"" + priority + "\". " + (period === 'morning' ? "You've got peak cognitive hours right now — do it before email, before social media, before anything else." : period === 'afternoon' ? "It's afternoon — if you haven't started yet, give yourself a 25-minute focused sprint right now. Just 25 minutes, then reassess." : "Day's winding down. If this didn't get done, that's data, not failure. What blocked you? That's what to fix tomorrow.");
      }
    } else if (todayPD) {
      if (todayPD.sleep < 6.5) {
        advice = "You got " + todayPD.sleep + "h of sleep, " + name + ". I'll be honest — everything else is downstream of this. Your willpower, focus, and mood are all running at maybe 60% capacity. Tonight, set a non-negotiable lights-out time and work backwards.";
      } else if (todayPD.screenTime > 240) {
        advice = "" + Math.floor(todayPD.screenTime/60) + "+ hours of screen time today. That's about " + Math.round(todayPD.screenTime/60*7) + " hours a week — roughly a full workday lost. Try this: pick one 1-hour block today and go fully analog. Read, walk, think. See how it feels.";
      } else {
        advice = "Your numbers look " + (todayPD.score >= 70 ? "strong" : "decent") + " today (score: " + todayPD.score + "/100). " + (todayPD.steps < 5000 ? "One thing — your steps are low. Even a 15-minute walk would boost your afternoon energy and creativity significantly." : "Keep this momentum going. The compound effect of consistent good days is enormous.");
      }
    } else {
      const advicePool = {
        morning: "It's morning — your willpower is at its peak. Do the hardest thing first. Not the urgent thing, the *important* thing. The emails can wait.",
        afternoon: "Afternoon energy dip is real and normal. This is when you do admin, reply to messages, take a walk. Don't fight your biology — work with it.",
        evening: "Evening is for reflection, not regret. What worked today? Do more of that. What didn't? Adjust. Simple.",
        night: "Winding down? Here's the one thing that'll make tomorrow 2x better: decide your #1 priority right now, before you sleep. Your brain will process it overnight."
      };
      advice = advicePool[period];
    }
    addChatMessage('ai', advice);
    return;
  }

  if (t.includes('spend') || t.includes('money') || t.includes('spent') || t.includes('budget') || t.includes('expense')) {
    showSpendingInChat();
    return;
  }

  if (t.includes('summary') || t.includes('overview') || t.includes('weekly') || t.includes('week')) {
    showWeeklySummaryRich();
    return;
  }

  if (t.includes('motivat') || t.includes('unmotivat') || t.includes('tired') || t.includes('stuck') || t.includes('frustrated')) {
    const msgs = [
      "I hear you, " + name + ". Being stuck isn't a character flaw — it's a signal. Usually it means the task is too big or too vague. What's the absolute smallest next step you could take? Like, embarrassingly small. Do just that.",
      "" + name + ", motivation is unreliable — it comes and goes like weather. What works is making the right thing the easy thing. Can you make your next task take less than 5 minutes? Start there.",
      "Feeling stuck is actually a sign you care, " + name + ". If it didn't matter, you wouldn't be frustrated. Take a 10-minute walk, change your environment, then come back and do ONE thing. Not five. One."
    ];
    addChatMessage('ai', msgs[Math.floor(Math.random() * msgs.length)]);
    return;
  }

  if (t.includes('sleep') && !t.includes('log') && !t.includes('spent')) {
    if (todayPD) {
      const avgSleep = getAvgMetric('sleep');
      addChatMessage('ai', "Last night: **" + todayPD.sleep + "h** of sleep." + (avgSleep ? " Your 7-day average is " + avgSleep.toFixed(1) + "h." : "") + (todayPD.sleep < 7 ? "\n\nYou're below the 7h threshold where cognitive performance drops measurably. Tonight, try cutting screen time 30 minutes earlier — the data shows that's the highest-leverage sleep fix." : "\n\nAbove 7h — that's where you want to be. Sleep is your foundation for everything else."));
    } else {
      addChatMessage('ai', "I don't have today's sleep data yet. Sync your health to let me track patterns! Tap ❤️ **Sync Health** or say **sync**.");
    }
    return;
  }

  if (t.includes('sync') || t.includes('health')) {
    openSyncFlow();
    return;
  }

  // Default — be helpful, not generic
  const ctx = [];
  if (completedPeriods > 0) ctx.push(completedPeriods + '/4 check-ins done');
  if (todayPD) ctx.push('score ' + todayPD.score + '/100');
  if (todayCI.morning) ctx.push('priority: "' + (todayCI.morning.answers.priority || '') + '"');

  addChatMessage('ai', "Hey " + name + "! I'm not sure what you're looking for, but here's what I can do:\n\n• **\"How am I doing?\"** — your visual dashboard with scores & patterns\n• **\"Give me advice\"** — personalized tips based on your actual data\n• **\"Log spending\"** — track expenses by voice or text\n• **\"I'm stuck\"** — when you need a push\n• **\"Weekly summary\"** — your week at a glance\n\n" + (ctx.length > 0 ? "_Right now: " + ctx.join(' · ') + "_" : "Or just tell me what's on your mind."));
}

function getAvgMetric(metric) {
  const dates = Object.keys(S.passiveData).sort().slice(-7);
  if (dates.length < 2) return null;
  let total = 0, count = 0;
  dates.forEach(function(d) { if (S.passiveData[d] && S.passiveData[d][metric]) { total += S.passiveData[d][metric]; count++; } });
  return count > 0 ? total / count : null;
}

function showSpendingInChat() {
  const monthTx = S.transactions.filter(function(tx) {
    var d = new Date(tx.date), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });

  if (!monthTx.length) {
    addChatMessage('ai', "No spending tracked this month yet! Just say something like **\"spent $15 on lunch\"** or tap 💸 to log manually.");
    return;
  }

  const expenses = monthTx.filter(function(tx){return tx.type==='expense';});
  const income = monthTx.filter(function(tx){return tx.type==='income';});
  const totalSpent = expenses.reduce(function(s,tx){return s+tx.amount;}, 0);
  const totalInc = income.reduce(function(s,tx){return s+tx.amount;}, 0);
  const net = totalInc - totalSpent;

  // Group expenses by category/note
  var cats = {};
  expenses.forEach(function(tx) {
    var key = tx.category && tx.category !== 'general' ? tx.category : (tx.note || 'other');
    key = key.substring(0, 20);
    if (!cats[key]) cats[key] = 0;
    cats[key] += tx.amount;
  });
  var catEntries = Object.entries(cats).sort(function(a,b){return b[1]-a[1];});
  var maxCat = catEntries.length > 0 ? catEntries[0][1] : 1;

  var html = '<div style="font-size:15px;font-weight:700;margin-bottom:10px">💰 Monthly Spending</div>';

  // Summary cards
  html += '<div style="display:flex;gap:6px;margin-bottom:12px">';
  html += '<div style="flex:1;padding:10px;background:rgba(52,211,153,.08);border-radius:10px;text-align:center"><div style="font-size:11px;opacity:.6">Income</div><div style="font-size:17px;font-weight:700;color:#34d399">+' + fmt(totalInc) + '</div></div>';
  html += '<div style="flex:1;padding:10px;background:rgba(248,113,113,.08);border-radius:10px;text-align:center"><div style="font-size:11px;opacity:.6">Spent</div><div style="font-size:17px;font-weight:700;color:#f87171">-' + fmt(totalSpent) + '</div></div>';
  html += '<div style="flex:1;padding:10px;background:rgba(99,102,241,.08);border-radius:10px;text-align:center"><div style="font-size:11px;opacity:.6">Net</div><div style="font-size:17px;font-weight:700;color:' + (net>=0?'#34d399':'#f87171') + '">' + (net>=0?'+':'') + fmt(net) + '</div></div>';
  html += '</div>';

  // Category breakdown bars
  if (catEntries.length > 0) {
    html += '<div style="font-size:12px;font-weight:600;margin-bottom:6px;opacity:.7">Breakdown</div>';
    catEntries.slice(0, 6).forEach(function(entry) {
      var pct = Math.round((entry[1] / maxCat) * 100);
      html += '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="opacity:.8">' + entry[0] + '</span><span style="font-weight:600">' + fmt(entry[1]) + '</span></div>';
      html += '<div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#6366f1,#a78bfa);border-radius:3px"></div></div></div>';
    });
  }

  // Recent transactions
  var recent = monthTx.slice(-4).reverse();
  html += '<div style="font-size:12px;font-weight:600;margin:10px 0 6px;opacity:.7">Recent</div>';
  recent.forEach(function(tx) {
    var icon = tx.type === 'income' ? '💚' : '🔴';
    var sign = tx.type === 'income' ? '+' : '-';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px"><span>' + icon + ' ' + (tx.note || tx.category || 'Transaction') + '</span><span style="font-weight:600;color:' + (tx.type==='income'?'#34d399':'#f87171') + '">' + sign + fmt(tx.amount) + '</span></div>';
  });

  addChatRich(html);
}

function showWeeklySummaryRich() {
  const dates = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toDateString());
  }
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  var html = '<div style="font-size:15px;font-weight:700;margin-bottom:10px">📈 Weekly Summary</div>';

  // Check-in heatmap
  html += '<div style="font-size:12px;font-weight:600;margin-bottom:6px;opacity:.7">Check-in streak</div>';
  html += '<div style="display:flex;gap:4px;margin-bottom:12px">';
  dates.forEach(function(date) {
    var ci = S.checkins[date] || {};
    var count = Object.keys(ci).length;
    var d = new Date(date);
    var dayLabel = dayNames[d.getDay()];
    var color = count >= 4 ? '#34d399' : count >= 2 ? '#fbbf24' : count >= 1 ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.08)';
    html += '<div style="flex:1;text-align:center"><div style="font-size:10px;opacity:.5;margin-bottom:4px">' + dayLabel + '</div><div style="height:28px;border-radius:6px;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">' + (count > 0 ? count : '') + '</div></div>';
  });
  html += '</div>';

  // Score trend
  var hasScores = dates.some(function(d){return S.passiveData[d] && S.passiveData[d].score;});
  if (hasScores) {
    html += '<div style="font-size:12px;font-weight:600;margin-bottom:6px;opacity:.7">Wellness score trend</div>';
    html += '<div style="display:flex;align-items:end;gap:4px;height:60px;margin-bottom:12px">';
    dates.forEach(function(date) {
      var pd = S.passiveData[date];
      var score = pd ? pd.score : 0;
      var h = Math.max(4, (score / 100) * 56);
      var color = score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : score > 0 ? '#f87171' : 'rgba(255,255,255,.06)';
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div style="width:100%;height:' + h + 'px;background:' + color + ';border-radius:4px 4px 0 0"></div>' + (score > 0 ? '<div style="font-size:9px;margin-top:2px;opacity:.6">' + score + '</div>' : '<div style="font-size:9px;margin-top:2px;opacity:.3">—</div>') + '</div>';
    });
    html += '</div>';
  }

  // Week spending
  var weekTx = S.transactions.filter(function(tx) { return dates.indexOf(new Date(tx.date).toDateString()) >= 0; });
  var weekSpent = weekTx.filter(function(tx){return tx.type==='expense';}).reduce(function(s,tx){return s+tx.amount;},0);
  var weekInc = weekTx.filter(function(tx){return tx.type==='income';}).reduce(function(s,tx){return s+tx.amount;},0);
  html += '<div style="display:flex;gap:8px;margin-bottom:10px">';
  html += '<div style="flex:1;padding:10px;background:rgba(255,255,255,.04);border-radius:10px"><div style="font-size:11px;opacity:.6">Week spent</div><div style="font-size:16px;font-weight:700;color:#f87171">' + fmt(weekSpent) + '</div></div>';
  html += '<div style="flex:1;padding:10px;background:rgba(255,255,255,.04);border-radius:10px"><div style="font-size:11px;opacity:.6">Week income</div><div style="font-size:16px;font-weight:700;color:#34d399">' + fmt(weekInc) + '</div></div>';
  html += '</div>';

  // Stats
  var totalCI = 0;
  dates.forEach(function(d) { totalCI += Object.keys(S.checkins[d] || {}).length; });
  html += '<div style="display:flex;gap:6px">';
  html += '<div style="flex:1;padding:8px;background:rgba(99,102,241,.08);border-radius:8px;text-align:center;font-size:12px"><div style="font-size:18px;font-weight:700">' + totalCI + '</div>check-ins</div>';
  html += '<div style="flex:1;padding:8px;background:rgba(251,191,36,.08);border-radius:8px;text-align:center;font-size:12px"><div style="font-size:18px;font-weight:700">' + (S.streak||0) + '</div>day streak</div>';
  html += '<div style="flex:1;padding:8px;background:rgba(52,211,153,.08);border-radius:8px;text-align:center;font-size:12px"><div style="font-size:18px;font-weight:700">' + weekTx.length + '</div>transactions</div>';
  html += '</div>';

  addChatRich(html);
}

function generateSummaryText() {
  showWeeklySummaryRich();
  return null;
}

/* ── INSIGHTS IN CHAT ─────────────────────────────── */
function showInsightsInChat() {
  unlockAchievement('insights-visit');
  const patterns = detectLifePatterns();
  const today = new Date().toDateString();
  const todayPD = S.passiveData[today];
  const todayCI = S.checkins[today] || {};
  const completedCount = Object.keys(todayCI).length;
  const name = S.user ? S.user.name.split(' ')[0] : 'there';

  // Build rich visual HTML
  let html = '<div style="font-size:15px;font-weight:700;margin-bottom:10px">📊 Your Dashboard</div>';

  // Today's Score Ring
  if (todayPD) {
    const score = todayPD.score || 0;
    const color = score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171';
    const label = score >= 80 ? 'Crushing it' : score >= 60 ? 'Solid day' : score >= 40 ? 'Could be better' : 'Rough day';
    html += '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:rgba(99,102,241,.08);border-radius:12px;margin-bottom:10px">';
    html += '<div style="position:relative;width:64px;height:64px;flex-shrink:0"><svg viewBox="0 0 36 36" style="width:64px;height:64px;transform:rotate(-90deg)"><circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="' + color + '" stroke-width="3" stroke-dasharray="' + (score * 0.974) + ' 97.4" stroke-linecap="round" style="transition:stroke-dasharray .8s ease"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:' + color + '">' + score + '</div></div>';
    html += '<div><div style="font-weight:600;font-size:14px">' + label + '</div><div style="font-size:12px;opacity:.7">Today\'s wellness score</div></div></div>';
  }

  // Health Bars
  if (todayPD) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    // Sleep bar
    const sleepPct = Math.min(100, (todayPD.sleep / 9) * 100);
    const sleepColor = todayPD.sleep >= 7 ? '#34d399' : todayPD.sleep >= 6 ? '#fbbf24' : '#f87171';
    html += '<div style="padding:10px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06)"><div style="font-size:11px;opacity:.6;margin-bottom:4px">😴 Sleep</div><div style="font-size:18px;font-weight:700;color:' + sleepColor + '">' + todayPD.sleep + 'h</div><div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:6px"><div style="height:100%;width:' + sleepPct + '%;background:' + sleepColor + ';border-radius:2px;transition:width .6s ease"></div></div></div>';
    // Steps bar
    const stepsPct = Math.min(100, (todayPD.steps / 10000) * 100);
    const stepsColor = todayPD.steps >= 8000 ? '#34d399' : todayPD.steps >= 5000 ? '#fbbf24' : '#f87171';
    html += '<div style="padding:10px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06)"><div style="font-size:11px;opacity:.6;margin-bottom:4px">🚶 Steps</div><div style="font-size:18px;font-weight:700;color:' + stepsColor + '">' + todayPD.steps.toLocaleString() + '</div><div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:6px"><div style="height:100%;width:' + stepsPct + '%;background:' + stepsColor + ';border-radius:2px;transition:width .6s ease"></div></div></div>';
    // Screen time
    const screenH = Math.floor(todayPD.screenTime / 60);
    const screenM = todayPD.screenTime % 60;
    const screenPct = Math.min(100, (todayPD.screenTime / 360) * 100);
    const screenColor = todayPD.screenTime <= 120 ? '#34d399' : todayPD.screenTime <= 240 ? '#fbbf24' : '#f87171';
    html += '<div style="padding:10px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06)"><div style="font-size:11px;opacity:.6;margin-bottom:4px">📱 Screen</div><div style="font-size:18px;font-weight:700;color:' + screenColor + '">' + screenH + 'h' + (screenM > 0 ? screenM + 'm' : '') + '</div><div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:6px"><div style="height:100%;width:' + screenPct + '%;background:' + screenColor + ';border-radius:2px;transition:width .6s ease"></div></div></div>';
    // Check-ins
    html += '<div style="padding:10px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06)"><div style="font-size:11px;opacity:.6;margin-bottom:4px">✅ Check-ins</div><div style="font-size:18px;font-weight:700;color:' + (completedCount >= 3 ? '#34d399' : completedCount >= 1 ? '#fbbf24' : '#f87171') + '">' + completedCount + '/4</div><div style="display:flex;gap:4px;margin-top:8px">' + ['morning','afternoon','evening','night'].map(function(p){return '<div style="flex:1;height:4px;border-radius:2px;background:' + (todayCI[p] ? '#34d399' : 'rgba(255,255,255,.1)') + '"></div>';}).join('') + '</div></div>';
    html += '</div>';
  } else {
    html += '<div style="padding:14px;background:rgba(255,255,255,.04);border-radius:10px;text-align:center;margin-bottom:10px;border:1px dashed rgba(255,255,255,.1)"><div style="font-size:24px;margin-bottom:6px">❤️</div><div style="font-size:13px;opacity:.6">Health not synced today</div><div style="margin-top:8px"><button onclick="openSyncFlow()" style="background:linear-gradient(135deg,#6366f1,#a78bfa);border:none;color:#fff;padding:6px 16px;border-radius:8px;font-size:12px;cursor:pointer">Sync Now</button></div></div>';
  }

  // Patterns section
  if (patterns.length > 0) {
    html += '<div style="font-size:13px;font-weight:600;margin:12px 0 8px;opacity:.8">🧠 Patterns (last 7 days)</div>';
    patterns.forEach(function(p) {
      const isGood = p.icon.includes('✅');
      const barColor = isGood ? '#34d399' : '#fbbf24';
      const pctMatch = p.insight.match(/(\d+)%/);
      const numMatch = p.insight.match(/(\d+\.?\d*)(h|hr)/i);
      let barPct = pctMatch ? parseInt(pctMatch[1]) : (numMatch ? Math.min(100, (parseFloat(numMatch[1]) / 9) * 100) : (isGood ? 78 : 40));
      html += '<div style="padding:10px;background:rgba(255,255,255,.04);border-radius:10px;margin-bottom:6px;border-left:3px solid ' + barColor + '">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600;font-size:13px">' + p.icon.replace(/[✅⚠️]/g,'') + ' ' + p.title + '</span><span style="font-size:11px;padding:2px 8px;border-radius:6px;background:' + (isGood ? 'rgba(52,211,153,.15);color:#34d399' : 'rgba(251,191,36,.15);color:#fbbf24') + '">' + (isGood ? 'On track' : 'Needs work') + '</span></div>';
      html += '<div style="font-size:12px;opacity:.7;margin-top:4px">' + p.insight + '</div>';
      html += '<div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:8px"><div style="height:100%;width:' + barPct + '%;background:' + barColor + ';border-radius:2px"></div></div>';
      html += '</div>';
    });
  } else {
    html += '<div style="padding:14px;background:rgba(255,255,255,.04);border-radius:10px;text-align:center;margin-top:8px"><div style="font-size:13px;opacity:.6">🧠 Complete 3+ days of check-ins to unlock pattern detection</div></div>';
  }

  // Spending snapshot
  const monthTx = S.transactions.filter(function(tx) {
    var d = new Date(tx.date), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  if (monthTx.length > 0) {
    const totalSpent = monthTx.filter(function(tx){return tx.type==='expense';}).reduce(function(s,tx){return s+tx.amount;}, 0);
    const totalInc = monthTx.filter(function(tx){return tx.type==='income';}).reduce(function(s,tx){return s+tx.amount;}, 0);
    const net = totalInc - totalSpent;
    html += '<div style="font-size:13px;font-weight:600;margin:12px 0 8px;opacity:.8">💰 This Month</div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<div style="flex:1;padding:10px;background:rgba(52,211,153,.08);border-radius:10px;text-align:center"><div style="font-size:11px;opacity:.6">Income</div><div style="font-size:16px;font-weight:700;color:#34d399">+' + fmt(totalInc) + '</div></div>';
    html += '<div style="flex:1;padding:10px;background:rgba(248,113,113,.08);border-radius:10px;text-align:center"><div style="font-size:11px;opacity:.6">Spent</div><div style="font-size:16px;font-weight:700;color:#f87171">-' + fmt(totalSpent) + '</div></div>';
    html += '<div style="flex:1;padding:10px;background:rgba(99,102,241,.08);border-radius:10px;text-align:center"><div style="font-size:11px;opacity:.6">Net</div><div style="font-size:16px;font-weight:700;color:' + (net >= 0 ? '#34d399' : '#f87171') + '">' + fmt(net) + '</div></div>';
    html += '</div>';
  }

  // Streak & XP
  html += '<div style="display:flex;gap:8px;margin-top:10px">';
  html += '<div style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(251,191,36,.1),rgba(251,146,60,.1));border-radius:10px;text-align:center"><div style="font-size:20px">🔥</div><div style="font-size:16px;font-weight:700">' + (S.streak || 0) + '</div><div style="font-size:11px;opacity:.6">Day streak</div></div>';
  html += '<div style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(167,139,250,.1));border-radius:10px;text-align:center"><div style="font-size:20px">⚡</div><div style="font-size:16px;font-weight:700">' + (S.totalXp || 0) + '</div><div style="font-size:11px;opacity:.6">Total XP</div></div>';
  html += '<div style="flex:1;padding:10px;background:linear-gradient(135deg,rgba(52,211,153,.1),rgba(34,211,238,.1));border-radius:10px;text-align:center"><div style="font-size:20px">🏆</div><div style="font-size:16px;font-weight:700">Lv ' + (S.level || 1) + '</div><div style="font-size:11px;opacity:.6">Level</div></div>';
  html += '</div>';

  addChatRich(html);

  // Add smart commentary
  if (todayPD || patterns.length > 0) {
    setTimeout(function() {
      let commentary = buildSmartInsightCommentary(todayPD, todayCI, patterns, name);
      addChatMessage('ai', commentary);
    }, 600);
  }
}

function buildSmartInsightCommentary(todayPD, todayCI, patterns, name) {
  const parts = [];
  // Cross-reference sleep + energy + execution
  if (todayPD && todayCI.morning) {
    const sleep = todayPD.sleep;
    const energy = todayCI.morning.answers.energy || '';
    const priority = todayCI.morning.answers.priority || '';
    if (sleep < 6.5 && energy.toLowerCase().includes('low')) {
      parts.push("I notice you got only " + sleep + "h of sleep and flagged low energy this morning. There's a clear connection there — even 30 extra minutes tonight could shift tomorrow's whole trajectory.");
    } else if (sleep >= 7.5 && energy.toLowerCase().includes('high')) {
      parts.push("Good sleep (" + sleep + "h) is clearly fueling your high energy today. That's your edge — protect it.");
    }
    if (todayCI.afternoon) {
      const progress = todayCI.afternoon.answers.progress || '';
      if (progress.includes('Yes') && priority) {
        parts.push("You said your priority was \"" + priority + "\" and you followed through ✅. That's execution, " + name + ". Consistency like this compounds.");
      } else if (progress.includes('No') && priority) {
        const distraction = todayCI.afternoon.answers.distraction || '';
        parts.push("Your morning priority was \"" + priority + "\" but you didn't execute on it." + (distraction ? " \"" + distraction + "\" pulled your focus." : "") + " Tomorrow, try blocking the first 90 minutes for ONLY this task.");
      }
    }
  }
  // Screen time pattern
  if (todayPD && todayPD.screenTime > 240) {
    parts.push("Over 4 hours of screen time today — that's roughly " + Math.round(todayPD.screenTime * 7 / 60) + " hours a week if this continues. What if you reclaimed even half of that?");
  }
  // Pattern-based
  patterns.forEach(function(p) {
    if (p.title === 'Execution' && p.insight.includes('Gap')) {
      parts.push("Your execution rate shows a gap between what you plan and what you do. The fix isn't motivation — it's making the task smaller. What's the 15-minute version of your priority?");
    }
    if (p.title === 'Mood' && p.insight.includes('meh')) {
      parts.push("Your mood trend is dipping. Look at what's different on your 'great' days vs 'meh' days — usually it's sleep quality or whether you executed on your priority.");
    }
  });
  if (parts.length === 0) {
    parts.push("Looking at your data — you're building solid consistency, " + name + ". The patterns will get more revealing as you keep checking in. Keep showing up. 🎯");
  }
  return parts.slice(0, 2).join('\n\n');
}

/* ── SPEND IN CHAT ────────────────────────────────── */
function showSpendInChat() {
  showSpendingInChat();
}

function closeSpendQuick() {
  const overlay = document.getElementById('spend-quick-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/* ── VOICE INPUT ──────────────────────────────────── */
let mainVoiceActive = false;
let mainRecognition = null;

function toggleMainVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice not supported', 'error'); return;
  }
  if (mainVoiceActive) { stopMainVoice(); return; }
  mainVoiceActive = true;
  unlockAchievement('voice-first');
  const btn = document.getElementById('main-voice-btn');
  if (btn) btn.classList.add('recording');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  mainRecognition = new SR();
  mainRecognition.lang = 'en-US';
  mainRecognition.interimResults = false;
  mainRecognition.maxAlternatives = 1;
  mainRecognition.onresult = (e) => { const text = e.results[0][0].transcript; stopMainVoice(); sendMainChat(text); };
  mainRecognition.onerror = () => { stopMainVoice(); showToast('Could not hear you', 'error'); };
  mainRecognition.onend = () => stopMainVoice();
  mainRecognition.start();
}

function stopMainVoice() {
  mainVoiceActive = false;
  if (mainRecognition) { try { mainRecognition.stop(); } catch(e){} mainRecognition = null; }
  const btn = document.getElementById('main-voice-btn');
  if (btn) btn.classList.remove('recording');
}

/* ── PATTERN DETECTION ────────────────────────────── */
function detectLifePatterns() {
  const patterns = [];
  const dates = Object.keys(S.checkins).sort();
  if (dates.length < 3) return patterns;
  const recent = dates.slice(-7);

  let totalSleep = 0, sleepCount = 0;
  recent.forEach(d => { if (S.passiveData[d]) { totalSleep += S.passiveData[d].sleep; sleepCount++; } });
  if (sleepCount > 0) {
    const avgSleep = totalSleep / sleepCount;
    patterns.push({ icon: avgSleep >= 7 ? '😴✅' : '😴⚠️', title: 'Sleep', insight: 'Avg: ' + avgSleep.toFixed(1) + 'h — ' + (avgSleep >= 7 ? 'above 7h threshold. Good.' : 'below 7h. Prioritise 7.5h minimum.') });
  }

  let priorities = 0, executed = 0;
  recent.forEach(d => {
    const ci = S.checkins[d];
    if (ci && ci.morning) priorities++;
    if (ci && ci.afternoon && ci.afternoon.answers.progress && ci.afternoon.answers.progress.includes('Yes')) executed++;
  });
  if (priorities >= 3) {
    const execRate = Math.round((executed / priorities) * 100);
    patterns.push({ icon: execRate >= 70 ? '🎯✅' : '🎯⚠️', title: 'Execution', insight: execRate + '% follow-through (' + executed + '/' + priorities + '). ' + (execRate >= 70 ? 'Strong.' : 'Gap between intention and action.') });
  }

  let totalScreen = 0, screenCount = 0;
  recent.forEach(d => { if (S.passiveData[d]) { totalScreen += S.passiveData[d].screenTime; screenCount++; } });
  if (screenCount > 0) {
    const avgScreen = Math.round(totalScreen / screenCount);
    patterns.push({ icon: avgScreen <= 180 ? '📱✅' : '📱⚠️', title: 'Screen Time', insight: Math.floor(avgScreen / 60) + 'h ' + (avgScreen % 60) + 'm/day avg. ' + (avgScreen <= 180 ? 'Good discipline.' : 'Over 3h/day — ' + Math.round(avgScreen * 7 / 60) + 'h/week.') });
  }

  let ratings = { great: 0, good: 0, meh: 0, bad: 0 };
  recent.forEach(d => {
    const ci = S.checkins[d];
    if (ci && ci.evening && ci.evening.answers.rating) {
      const r = ci.evening.answers.rating.toLowerCase();
      if (r.includes('great')) ratings.great++; else if (r.includes('good')) ratings.good++;
      else if (r.includes('meh')) ratings.meh++; else if (r.includes('bad')) ratings.bad++;
    }
  });
  const totalRated = ratings.great + ratings.good + ratings.meh + ratings.bad;
  if (totalRated >= 3) {
    const positive = ratings.great + ratings.good;
    const pct = Math.round((positive / totalRated) * 100);
    patterns.push({ icon: pct >= 60 ? '📊✅' : '📊⚠️', title: 'Mood', insight: pct + '% good/great days. ' + (pct >= 60 ? 'Positive trend.' : 'More meh/bad — replicate what works on good days.') });
  }

  return patterns;
}

/* ── SPEND SYSTEM ─────────────────────────────────── */
let activeSpendCategory = '';
let receiptExtractedItems = [];

const SPEND_CATEGORIES = {
  food: { emoji: '🍕', label: 'Food', presets: [8, 15, 25, 40, 60] },
  coffee: { emoji: '☕', label: 'Coffee', presets: [3, 5, 7, 10, 15] },
  transport: { emoji: '🚗', label: 'Transport', presets: [5, 10, 20, 35, 50] },
  groceries: { emoji: '🛒', label: 'Groceries', presets: [15, 30, 50, 80, 120] },
  online: { emoji: '🛍', label: 'Online', presets: [10, 25, 50, 100, 200] },
  apps: { emoji: '📱', label: 'Apps/Subs', presets: [1, 5, 10, 15, 20] }
};

function quickSpend(category) {
  closeSpendQuick();
  activeSpendCategory = category;
  const cat = SPEND_CATEGORIES[category];
  const overlay = document.getElementById('spend-amount-overlay');
  const emojiEl = document.getElementById('spend-amount-emoji');
  const catEl = document.getElementById('spend-amount-cat');
  const currEl = document.getElementById('spend-amount-currency');
  const presetsEl = document.getElementById('spend-amount-presets');
  const inputEl = document.getElementById('spend-amount-input');
  const noteEl = document.getElementById('spend-note-input');
  if (emojiEl) emojiEl.textContent = cat.emoji;
  if (catEl) catEl.textContent = cat.label;
  if (currEl) currEl.textContent = S.currency;
  if (inputEl) { inputEl.value = ''; setTimeout(() => inputEl.focus(), 100); }
  if (noteEl) noteEl.value = '';
  if (presetsEl) presetsEl.innerHTML = cat.presets.map(p => '<button class="spend-amt-preset" onclick="setSpendAmount(' + p + ')">' + S.currency + p + '</button>').join('');
  if (overlay) overlay.classList.remove('hidden');
}

function setSpendAmount(val) { const el = document.getElementById('spend-amount-input'); if (el) el.value = val; }

function closeSpendAmount() {
  const overlay = document.getElementById('spend-amount-overlay');
  if (overlay) overlay.classList.add('hidden');
  activeSpendCategory = '';
}

function confirmQuickSpend() {
  const inputEl = document.getElementById('spend-amount-input');
  const noteEl = document.getElementById('spend-note-input');
  const amount = parseFloat(inputEl ? inputEl.value : 0);
  if (!amount || amount <= 0) { showToast('Enter an amount', 'error'); return; }
  const note = noteEl ? noteEl.value.trim() : '';
  const cat = SPEND_CATEGORIES[activeSpendCategory] || { label: 'general', emoji: '💰' };
  S.transactions.push({ id: Date.now().toString(), type: 'expense', amount, category: activeSpendCategory || 'general', note: note || cat.label, date: new Date().toISOString() });
  saveState();
  grantXP(15, 'Spend logged');
  checkAchievements();
  closeSpendAmount();
  showToast(cat.emoji + ' ' + fmt(amount) + ' logged!', 'success');
  addChatMessage('ai', '📝 Logged ' + cat.emoji + ' ' + cat.label + ': ' + fmt(amount) + (note ? ' · ' + note : '') + '. Nice job staying on top of it!');
  updateActionCards();
}

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/coffee|latte|cappuccino|starbucks|cafe|tea/.test(n)) return 'coffee';
  if (/uber|lyft|taxi|gas|fuel|parking|transit|metro|bus/.test(n)) return 'transport';
  if (/grocery|groceries|whole foods|trader|walmart|target|costco|supermarket/.test(n)) return 'groceries';
  if (/amazon|ebay|online|order|shipping/.test(n)) return 'online';
  if (/app|subscription|netflix|spotify|apple|google|icloud|premium/.test(n)) return 'apps';
  if (/food|lunch|dinner|breakfast|restaurant|pizza|burger|sushi|meal/.test(n)) return 'food';
  return 'general';
}

/* ── RECEIPT UPLOAD ───────────────────────────────── */
function openReceiptUpload() {
  closeSpendQuick();
  const overlay = document.getElementById('receipt-overlay');
  if (overlay) overlay.classList.remove('hidden');
  const preview = document.getElementById('receipt-preview');
  const results = document.getElementById('receipt-results');
  const dropZone = document.getElementById('receipt-drop-zone');
  if (preview) preview.classList.add('hidden');
  if (results) results.classList.add('hidden');
  if (dropZone) dropZone.style.display = '';
  receiptExtractedItems = [];
}

function closeReceiptUpload() {
  const overlay = document.getElementById('receipt-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function handleReceiptFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const imgEl = document.getElementById('receipt-img');
    const preview = document.getElementById('receipt-preview');
    const dropZone = document.getElementById('receipt-drop-zone');
    if (imgEl) imgEl.src = e.target.result;
    if (preview) preview.classList.remove('hidden');
    if (dropZone) dropZone.style.display = 'none';
    const scanning = document.getElementById('receipt-scanning');
    if (scanning) scanning.style.display = 'flex';
    setTimeout(() => scanReceiptImage(e.target.result), 2000);
  };
  reader.readAsDataURL(file);
}

function scanReceiptImage() {
  const scanning = document.getElementById('receipt-scanning');
  if (scanning) scanning.style.display = 'none';
  const results = document.getElementById('receipt-results');
  const itemsList = document.getElementById('receipt-items-list');
  if (!results || !itemsList) return;
  receiptExtractedItems = [];
  results.classList.remove('hidden');
  itemsList.innerHTML =
    '<div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">📋 Enter what you see on the receipt:</div>' +
    '<div class="receipt-entry" id="receipt-entry-1"><input type="text" class="cq-input" placeholder="Item" id="ri-name-1" style="margin-bottom:4px"/><input type="number" class="cq-input" placeholder="' + S.currency + '0" inputmode="decimal" id="ri-amt-1"/></div>' +
    '<div class="receipt-entry" id="receipt-entry-2"><input type="text" class="cq-input" placeholder="Item 2 (optional)" id="ri-name-2" style="margin-bottom:4px"/><input type="number" class="cq-input" placeholder="' + S.currency + '0" inputmode="decimal" id="ri-amt-2"/></div>' +
    '<div class="receipt-entry" id="receipt-entry-3"><input type="text" class="cq-input" placeholder="Item 3 (optional)" id="ri-name-3" style="margin-bottom:4px"/><input type="number" class="cq-input" placeholder="' + S.currency + '0" inputmode="decimal" id="ri-amt-3"/></div>' +
    '<button class="btn-ghost w-full" onclick="addReceiptEntry()" style="margin-top:8px">+ Add more</button>';
}

let receiptEntryCount = 3;

function addReceiptEntry() {
  receiptEntryCount++;
  const list = document.getElementById('receipt-items-list');
  if (!list) return;
  const addBtn = list.querySelector('.btn-ghost');
  const entry = document.createElement('div');
  entry.className = 'receipt-entry';
  entry.id = 'receipt-entry-' + receiptEntryCount;
  entry.innerHTML = '<input type="text" class="cq-input" placeholder="Item ' + receiptEntryCount + '" id="ri-name-' + receiptEntryCount + '" style="margin-bottom:4px"/><input type="number" class="cq-input" placeholder="' + S.currency + '0" inputmode="decimal" id="ri-amt-' + receiptEntryCount + '"/>';
  if (addBtn) addBtn.before(entry);
}

function confirmReceiptItems() {
  let logged = 0, total = 0;
  for (let i = 1; i <= receiptEntryCount; i++) {
    const nameEl = document.getElementById('ri-name-' + i);
    const amtEl = document.getElementById('ri-amt-' + i);
    if (!nameEl || !amtEl) continue;
    const name = nameEl.value.trim();
    const amt = parseFloat(amtEl.value);
    if (!amt || amt <= 0) continue;
    S.transactions.push({ id: (Date.now() + i).toString(), type: 'expense', amount: amt, category: guessCategory(name), note: name || 'Receipt item', date: new Date().toISOString() });
    logged++; total += amt;
  }
  if (logged === 0) { showToast('Enter at least one item', 'error'); return; }
  saveState();
  grantXP(20, 'Receipt scanned');
  checkAchievements();
  closeReceiptUpload();
  receiptEntryCount = 3;
  showToast('📸 ' + logged + ' item' + (logged > 1 ? 's' : '') + ' logged!', 'success');
  addChatMessage('ai', '📸 Receipt logged! ' + logged + ' item' + (logged > 1 ? 's' : '') + ' totalling ' + fmt(total) + '.');
  updateActionCards();
}

function retryReceipt() {
  const preview = document.getElementById('receipt-preview');
  const results = document.getElementById('receipt-results');
  const dropZone = document.getElementById('receipt-drop-zone');
  const fileInput = document.getElementById('receipt-file-input');
  if (preview) preview.classList.add('hidden');
  if (results) results.classList.add('hidden');
  if (dropZone) dropZone.style.display = '';
  if (fileInput) fileInput.value = '';
  receiptEntryCount = 3;
}

/* ── SCREENSHOT / FILE UPLOAD (assistant compat) ──── */
function handleAssistantScreenshot(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = '';
  addChatMessage('user', '📸 Uploaded a screenshot');
  setTimeout(() => {
    const extracted = simulateScreenshotExtraction();
    let msg = '📋 Found ' + extracted.length + ' transactions:\n\n';
    extracted.forEach(tx => { msg += tx.emoji + ' ' + tx.name + ': ' + S.currency + tx.amount.toFixed(2) + '\n'; });
    msg += '\nAll logged to your spending.';
    addChatMessage('ai', msg);
    extracted.forEach(tx => { S.transactions.push({ id: Date.now().toString(), type: 'expense', amount: tx.amount, category: guessCategory(tx.name), note: tx.name, date: new Date().toISOString() }); });
    saveState();
    grantXP(25, 'screenshot upload');
    updateActionCards();
  }, 1500);
}

function simulateScreenshotExtraction() {
  const possible = [
    { name: 'Starbucks', emoji: '☕', amount: 5.50 },
    { name: 'Uber Eats', emoji: '🍕', amount: 18.99 },
    { name: 'Amazon', emoji: '🛍', amount: 32.47 },
    { name: 'Netflix', emoji: '📱', amount: 15.99 },
    { name: 'Whole Foods', emoji: '🛒', amount: 67.82 },
  ];
  const count = 2 + Math.floor(Math.random() * 3);
  return [...possible].sort(() => 0.5 - Math.random()).slice(0, count).map(t => ({ ...t, amount: +(t.amount * (0.8 + Math.random() * 0.4)).toFixed(2) }));
}

function handleAssistantFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = '';
  addChatMessage('user', '📄 Uploaded: ' + file.name);
  setTimeout(() => {
    const extracted = simulateScreenshotExtraction();
    let msg = '📋 Parsed ' + file.name + ' — found ' + extracted.length + ' transactions. All logged.';
    addChatMessage('ai', msg);
    extracted.forEach(tx => { S.transactions.push({ id: Date.now().toString(), type: 'expense', amount: tx.amount, category: guessCategory(tx.name), note: tx.name, date: new Date().toISOString() }); });
    saveState();
    grantXP(25, 'file upload');
    updateActionCards();
  }, 2000);
}

/* ── PROFILE ──────────────────────────────────────── */
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
  if (ring) { const ringPct = Math.min(1, (S.streak || 0) / 30); ring.style.strokeDashoffset = 226.2 * (1 - ringPct); }
  el('s-currency', S.currency + ' ' + (S.currency === '$' ? 'USD' : S.currency === '€' ? 'EUR' : S.currency === '£' ? 'GBP' : S.currency));
  renderAchievements();
}

function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  const unlocked = S.achievements || [];
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const done = unlocked.includes(a.id);
    return '<div class="ach-item ' + (done ? '' : 'ach-locked') + '" title="' + a.desc + '"><div class="ach-icon">' + (done ? a.icon : '🔒') + '</div><div class="ach-name">' + a.name + '</div><div class="ach-xp">+' + a.xp + ' XP</div></div>';
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
  const a = document.createElement('a'); a.href = url; a.download = 'imperium-export.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

function resetApp() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  S.checkins = {}; S.passiveData = {}; S.transactions = []; S.streak = 0; S.xp = 0; S.totalXp = 0; S.level = 1; S.achievements = [];
  saveState();
  showToast('Data cleared.', 'success');
  updateSidebar();
  updateActionCards();
}

/* ── STREAK ───────────────────────────────────────── */
function updateStreak() {
  const today = new Date().toDateString();
  if (S.lastLogin === today) return;
  if (S.lastLogin) {
    const last = new Date(S.lastLogin);
    const diff = (new Date(today) - last) / 86400000;
    if (diff <= 1.5) { S.streak++; grantXP(50, 'daily streak'); } else S.streak = 1;
  } else S.streak = 1;
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

/* ── MAGNETIC BUTTONS ─────────────────────────────── */
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
  { icon: '💬', label: 'New Chat', action: () => { closePanel(); }, badge: '' },
  { icon: '👤', label: 'Profile & Stats', action: () => openPanel('profile'), badge: '' },
  { icon: '📨', label: 'Contact & Feedback', action: () => openPanel('contact'), badge: '' },
  { icon: '⭐', label: 'Upgrade to Pro', action: () => openPro(), badge: 'SOON' },
  { icon: '📤', label: 'Export Data', action: exportData, badge: '' },
  { icon: '🗑', label: 'Clear Chat', action: clearMainChat, badge: '' },
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
    '<div class="cmd-item' + (i === cmdFocusIdx ? ' focused' : '') + '" onclick="execCmd(' + i + ')"><span class="cmd-item-icon">' + c.icon + '</span><span class="cmd-item-label">' + c.label + '</span>' + (c.badge ? '<span class="cmd-item-badge">' + c.badge + '</span>' : '') + '</div>'
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

/* ── CONTACT ──────────────────────────────────────── */
let contactRating = 0;
let contactType = 'feedback';
let votedFeatures = [];

function initContact() {
  if (S.votedFeatures) votedFeatures = S.votedFeatures;
  votedFeatures.forEach(f => {
    const item = document.querySelector('.contact-vote-item[onclick*="' + f + '"]');
    if (item) item.classList.add('cvote-voted');
  });
  if (S.lastRating) {
    contactRating = S.lastRating;
    document.querySelectorAll('.contact-react').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val) === contactRating));
  }
}

function pickReaction(btn) {
  contactRating = parseInt(btn.dataset.val);
  document.querySelectorAll('.contact-react').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.lastRating = contactRating;
  saveState();
}

function pickContactType(btn) {
  contactType = btn.dataset.type;
  document.querySelectorAll('.contact-type-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function submitFeedback() {
  const msg = (document.getElementById('contact-msg') || {}).value || '';
  const email = (document.getElementById('contact-email') || {}).value || '';
  if (!msg.trim() && contactRating === 0) { showToast('Add a rating or message', 'error'); return; }
  if (!S.feedback) S.feedback = [];
  S.feedback.push({ type: contactType, rating: contactRating, msg: msg.trim(), email: email.trim(), ts: Date.now() });
  saveState();
  sendFeedbackEmail(contactType, contactRating, msg.trim(), email.trim());
  const msgEl = document.getElementById('contact-msg');
  const emailEl = document.getElementById('contact-email');
  if (msgEl) msgEl.value = '';
  if (emailEl) emailEl.value = '';
  showToast('Message sent — thank you! 🙏', 'success');
  grantXP(10, 'feedback submitted');
}

function voteFeature(el, feature) {
  if (votedFeatures.includes(feature)) { showToast('Already voted!', 'error'); return; }
  votedFeatures.push(feature);
  S.votedFeatures = votedFeatures;
  saveState();
  el.classList.add('cvote-voted');
  const bar = el.querySelector('.cvote-bar');
  const countEl = el.querySelector('.cvote-count');
  if (bar) { const newVal = Math.min((parseInt(bar.style.width) || 50) + Math.floor(Math.random() * 3) + 1, 99); bar.style.width = newVal + '%'; if (countEl) countEl.textContent = newVal + '%'; }
  showToast('Vote recorded! 🗳', 'success');
  grantXP(5, 'feature voted');
}

/* ── SCIENCE CARDS ────────────────────────────────── */
const SCIENCE_CARDS = [
  { emoji: '🧠', fact: 'Your brain physically rewires itself every time you repeat a behaviour. After ~66 days, the new circuit becomes automatic.', action: 'Keep your streak alive — each rep reshapes your brain.', source: 'Lally et al., 2010 · UCL' },
  { emoji: '⏰', fact: 'Cortisol peaks 30–60 min after waking, creating a natural focus window. Delaying phone use boosts deep-work output by up to 40%.', action: 'Try a 30-min phone-free morning.', source: 'Huberman Lab · Stanford' },
  { emoji: '😴', fact: 'Getting 7–8 hours of sleep improves memory, emotional regulation, and problem-solving. One night of 6h impairs cognition like being legally drunk.', action: 'Log your sleep tonight.', source: 'Walker, 2017 · UC Berkeley' },
  { emoji: '💪', fact: 'A 20-minute walk increases BDNF, improving focus and mood for up to 4 hours.', action: 'Get outside for a 20-min walk today.', source: 'Ratey, Harvard · JAMA' },
  { emoji: '🎯', fact: '"I will do X at TIME in PLACE" makes you 2–3× more likely to follow through.', action: 'Set one concrete intention in your check-in.', source: 'Gollwitzer, 1999 · Psychological Bulletin' },
  { emoji: '📊', fact: 'People who track habits achieve goals at 2–3× the rate of those who don\'t.', action: 'Your check-in makes you twice as likely to improve.', source: 'Amabile & Kramer, HBR · 2011' },
  { emoji: '🧘', fact: '10 min of meditation daily for 8 weeks increases grey matter in the prefrontal cortex.', action: 'Try box breathing: 4s in — 4s hold — 4s out.', source: 'Hölzel et al., 2011 · Harvard' },
  { emoji: '💧', fact: 'Even mild dehydration (1–2%) impairs concentration and mood.', action: 'Drink a full glass of water right now.', source: 'Ganio et al., 2011 · British Journal of Nutrition' },
  { emoji: '🌞', fact: 'Morning sunlight (10–20 min) sets your circadian rhythm, improving sleep that night by 50%.', action: 'Step outside in the morning — no sunglasses for 10–20 min.', source: 'Huberman, Stanford' },
  { emoji: '💰', fact: 'Tracking spending leads to 15–20% reduction in unnecessary expenditure.', action: 'Log today\'s spending. Awareness changes behaviour.', source: 'Ameriks et al., 2003 · Journal of Finance' },
  { emoji: '📵', fact: 'Every notification trains your brain to crave interruption. Recovery time: 23 minutes per interruption.', action: 'Put your phone on DND for your next work block.', source: 'Mark et al., 2008 · UC Irvine' },
  { emoji: '⚡', fact: 'Peak cognitive performance occurs 2–4h after waking. Complex thinking requires 30% less effort then.', action: 'Block your hardest task for 2–4h after waking.', source: 'Pink, 2018 · Circadian Biology' },
];

function initScienceCard() {
  const factEl = document.getElementById('science-fact');
  const actionEl = document.getElementById('science-action');
  const sourceEl = document.getElementById('science-source');
  if (!factEl) return;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const entry = SCIENCE_CARDS[dayOfYear % SCIENCE_CARDS.length];
  factEl.innerHTML = entry.emoji + ' ' + entry.fact;
  if (actionEl) actionEl.textContent = '→ ' + entry.action;
  if (sourceEl) sourceEl.textContent = entry.source;
}

/* ── PRO / SUBSCRIPTION ───────────────────────────── */
const PLANS = {
  basic: { monthly: 8.99, annual: 89.99, name: 'Basic' },
  pro: { monthly: 14.99, annual: 149.99, name: 'Pro' },
  elite: { monthly: 29.99, annual: 299.99, name: 'Elite' }
};

let billingCycle = 'monthly';
let paypalButtonsRendered = false;

function initTrial() {
  if (!S.trialStart) { S.trialStart = Date.now(); saveState(); }
}

function getTrialDaysLeft() {
  if (!S.trialStart) return 7;
  return Math.max(0, 7 - Math.floor((Date.now() - S.trialStart) / 86400000));
}

function hasActiveSubscription() { return S.subscription && S.subscription.status === 'active'; }

function setBilling(cycle) {
  billingCycle = cycle;
  document.getElementById('toggle-monthly')?.classList.toggle('active', cycle === 'monthly');
  document.getElementById('toggle-annual')?.classList.toggle('active', cycle === 'annual');
  document.querySelectorAll('.pro-price-num[data-monthly]').forEach(el => el.textContent = el.dataset[cycle]);
  document.querySelectorAll('.pro-price-period[data-monthly]').forEach(el => el.textContent = el.dataset[cycle]);
  renderPayPalButtons();
}

function renderPayPalButtons() {
  if (typeof paypal === 'undefined') return;
  const container = document.getElementById('paypal-basic');
  if (!container) return;
  container.innerHTML = '';
  const plan = PLANS.basic;
  const price = billingCycle === 'monthly' ? plan.monthly : plan.annual;
  const periodLabel = billingCycle === 'monthly' ? '1 Month' : '1 Year';

  paypal.Buttons({
    style: { shape: 'pill', color: 'gold', layout: 'vertical', label: 'pay' },
    createOrder: (data, actions) => actions.order.create({
      purchase_units: [{ description: 'Imperium Basic - ' + periodLabel, amount: { currency_code: 'USD', value: price.toFixed(2) } }],
      application_context: { brand_name: 'Imperium OS', shipping_preference: 'NO_SHIPPING' }
    }),
    onApprove: (data, actions) => actions.order.capture().then(details => {
      const expiresAt = billingCycle === 'monthly' ? Date.now() + 30 * 86400000 : Date.now() + 365 * 86400000;
      S.subscription = { id: data.orderID, tier: 'basic', cycle: billingCycle, status: 'active', startedAt: Date.now(), expiresAt, payerEmail: details.payer?.email_address || '' };
      saveState();
      showToast('🎉 Welcome to Imperium Basic!', 'success');
      closePro();
    }),
    onError: () => showToast('Payment failed', 'error'),
    onCancel: () => showToast('Payment cancelled', 'warn')
  }).render('#paypal-basic');
  paypalButtonsRendered = true;
}

function updateTrialDisplay() {
  const daysLeft = getTrialDaysLeft();
  const trialStatus = document.getElementById('trial-status');
  const trialDays = document.getElementById('trial-days-left');
  if (hasActiveSubscription()) {
    if (trialStatus) { trialStatus.textContent = '✓ ' + (PLANS[S.subscription.tier]?.name || 'Subscribed'); trialStatus.style.color = 'var(--accent-blue)'; }
    if (trialDays) trialDays.textContent = '';
  } else if (daysLeft > 0) {
    if (trialStatus) trialStatus.textContent = '✓ Your current plan';
    if (trialDays) trialDays.textContent = daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left in trial';
  } else {
    if (trialStatus) { trialStatus.textContent = '⚠️ Trial expired'; trialStatus.style.color = 'var(--system-orange)'; }
    if (trialDays) trialDays.textContent = 'Upgrade to continue';
  }
}

function openPro() {
  initTrial();
  updateTrialDisplay();
  if (!paypalButtonsRendered) setTimeout(renderPayPalButtons, 100);
  S._proReturnScreen = S.currentScreen || 'screen-main';
  const wlConfirm = document.getElementById('pro-waitlist-confirm');
  if (wlConfirm) wlConfirm.classList.add('hidden');
  navigateTo('screen-pro');
}

function closePro() {
  const target = S._proReturnScreen || 'screen-main';
  S._proReturnScreen = null;
  navigateTo(target);
  if (target === 'screen-main') initMainScreen();
}

let proWaitlistTier = '';

function joinWaitlist(tier) {
  proWaitlistTier = tier;
  const formTierEl = document.getElementById('pro-wl-form-tier');
  if (formTierEl) formTierEl.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
  const wlForm = document.getElementById('pro-waitlist-form');
  const wlConfirm = document.getElementById('pro-waitlist-confirm');
  if (wlConfirm) wlConfirm.classList.add('hidden');
  if (wlForm) { wlForm.classList.remove('hidden'); wlForm.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function submitWaitlist() {
  const first = (document.getElementById('wl-first')?.value || '').trim();
  const last = (document.getElementById('wl-last')?.value || '').trim();
  const email = (document.getElementById('wl-email')?.value || '').trim();
  if (!first) { showToast('Enter first name', 'warn'); return; }
  if (!last) { showToast('Enter last name', 'warn'); return; }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { showToast('Enter valid email', 'warn'); return; }
  if (!S.proWaitlist) S.proWaitlist = [];
  S.proWaitlist = S.proWaitlist.filter(e => typeof e === 'object' ? e.email !== email : true);
  S.proWaitlist.push({ tier: proWaitlistTier, first, last, email, ts: Date.now() });
  saveState();
  sendWaitlistEmail(first, last, email, proWaitlistTier);
  const wlForm = document.getElementById('pro-waitlist-form');
  const wlConfirm = document.getElementById('pro-waitlist-confirm');
  const tierEl = document.getElementById('pro-wl-tier');
  if (tierEl) tierEl.textContent = proWaitlistTier.charAt(0).toUpperCase() + proWaitlistTier.slice(1);
  if (wlForm) wlForm.classList.add('hidden');
  if (wlConfirm) { wlConfirm.classList.remove('hidden'); wlConfirm.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  showToast("You're on the " + proWaitlistTier + ' waitlist! 🎉', 'success');
}

/* ── EMAIL (EmailJS) ──────────────────────────────── */
const EJS_SERVICE = 'service_imperium';
const EJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';
const EJS_T_WELCOME = 'template_welcome';
const EJS_T_FEEDBACK = 'template_feedback';
const EJS_T_WAITLIST = 'template_waitlist';

function initEmailJS() {
  if (window.emailjs && EJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') emailjs.init({ publicKey: EJS_PUBLIC_KEY });
}

function sendWelcomeEmail(name, userEmail) {
  if (!window.emailjs || EJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') return;
  emailjs.send(EJS_SERVICE, EJS_T_WELCOME, { to_email: 'imperiumosx@gmail.com', user_name: name || 'Guest', user_email: userEmail || '(guest)', joined_at: new Date().toLocaleString() }).catch(() => {});
}

function sendFeedbackEmail(type, rating, msg, replyEmail) {
  if (!window.emailjs || EJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') return;
  emailjs.send(EJS_SERVICE, EJS_T_FEEDBACK, { to_email: 'imperiumosx@gmail.com', feedback_type: type, rating: rating, message: msg, reply_to: replyEmail || 'not provided', sent_at: new Date().toLocaleString() }).catch(() => {});
}

function sendWaitlistEmail(first, last, email, tier) {
  if (!window.emailjs || EJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY') return;
  emailjs.send(EJS_SERVICE, EJS_T_WAITLIST, { to_email: 'imperiumosx@gmail.com', first_name: first, last_name: last, user_email: email, tier: tier, joined_at: new Date().toLocaleString() }).catch(() => {});
}

/* ── THEME ────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('imperium_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon();
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('imperium_theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  btn.textContent = isLight ? '☀️' : '🌙';
}

/* ── BOOT ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadLLMConfig();
  runBoot();
});
