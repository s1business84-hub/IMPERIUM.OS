/* ══════════════════════════════════════════════════════════
   IMPERIUM OS v6.1.0 — UX PRO + CANVAS TEXT
   Check-in system + Passive data + Voice AI + XP + AI Chat
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
  // AI Assistant
  assistantMessages: [],
  assistantUploads: [],
  // Guide
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
  const dashboard = document.getElementById('home-dashboard');
  const checkinCard = document.getElementById('checkin-card');

  // Update header
  const iconEl = document.getElementById('checkin-period-icon');
  const periodEl = document.getElementById('checkin-period');
  const subEl = document.getElementById('checkin-sub');
  if (iconEl) iconEl.textContent = periodInfo.icon;
  if (periodEl) periodEl.textContent = periodInfo.label;

  // Count completed check-ins today
  const completedPeriods = Object.keys(todayCI);
  const completedCount = completedPeriods.length;

  // Check if current period already done
  if (todayCI[period]) {
    document.getElementById('checkin-questions').classList.add('hidden');
    const doneEl = document.getElementById('checkin-done');
    doneEl.classList.remove('hidden');

    // Update done title & text
    const doneTitle = document.getElementById('checkin-done-title');
    const doneText = document.getElementById('checkin-done-text');
    const next = getNextPeriod(period);
    if (doneTitle) {
      doneTitle.textContent = completedCount >= 4 ? 'All check-ins done! 🎉' : periodInfo.label + ' done';
    }
    if (doneText) {
      doneText.textContent = next
        ? 'Next: ' + CHECKIN_PERIODS[next].label.toLowerCase()
        : 'You\'ve completed your daily cycle';
    }
    if (subEl) subEl.textContent = completedCount + '/4 complete';

    // Update progress dots
    ['morning','afternoon','evening','night'].forEach(function(p) {
      const dot = document.getElementById('cdp-' + p);
      if (dot) {
        dot.className = 'cdp-dot' + (todayCI[p] ? ' cdp-done' : (p === period ? ' cdp-current' : ''));
      }
    });
    const cdpLabel = document.getElementById('cdp-label');
    if (cdpLabel) cdpLabel.textContent = completedCount + '/4';

    // Collapse check-in card, show dashboard
    if (checkinCard) checkinCard.classList.add('checkin-collapsed');
    if (dashboard) {
      dashboard.classList.remove('hidden');
      // Trigger staggered animations
      if (!dashboard.classList.contains('dashboard-revealed')) {
        dashboard.classList.add('dashboard-revealed');
      }
    }
    return;
  }

  // Check-in not done yet — show questions, expand card, hide dashboard
  document.getElementById('checkin-questions').classList.remove('hidden');
  document.getElementById('checkin-done').classList.add('hidden');
  if (subEl) subEl.textContent = '3 quick questions';
  if (checkinCard) checkinCard.classList.remove('checkin-collapsed');
  // If any prior period was done today, still show dashboard
  if (completedCount > 0 && dashboard) {
    dashboard.classList.remove('hidden');
    dashboard.classList.add('dashboard-revealed');
  } else if (dashboard) {
    dashboard.classList.add('hidden');
  }

  const questions = CHECKIN_QUESTIONS[period];
  const container = document.getElementById('checkin-questions');
  container.innerHTML = questions.map((q, i) => {
    if (q.type === 'text') {
      return '<div class="cq-item">' +
        '<div class="cq-text">' + q.text + '</div>' +
        '<div class="cq-input-wrap">' +
        '<input type="text" class="cq-input" id="cq-' + q.id + '" placeholder="' + q.placeholder + '" autocomplete="off"/>' +
        '<button class="cq-mic-btn" onclick="startCheckinVoice(this, \'' + q.id + '\')" title="Speak your answer">🎤</button>' +
        '</div>' +
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

  // Recalculate today's score (check-in completion affects it)
  recalcTodayScore();

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

/* ── HEALTH DATA SYNC — Step-by-step flow ─────────── */
let syncCurrentStep = 0;
let healthPermissionGranted = false;

function openSyncFlow() {
  const overlay = document.getElementById('sync-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  // Check if permission already granted (skip to step 1)
  healthPermissionGranted = localStorage.getItem('imp_health_permission') === 'granted';

  // Pre-fill with existing data if already synced today
  const today = new Date().toDateString();
  const data = S.passiveData[today];

  if (data && data.source === 'user') {
    // Already synced — go straight to sleep with pre-filled values
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
    el.classList.remove('active', 'exit-left', 'enter-right');
    if (i === step) {
      el.classList.add('active');
    } else if (i < step) {
      el.classList.add('exit-left');
    } else {
      el.classList.add('enter-right');
    }
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
      if (v >= 7 && v <= 9) { qualEl.textContent = '✅ Optimal — great recovery'; qualEl.style.color = '#10b981'; }
      else if (v >= 6) { qualEl.textContent = '⚠️ OK but could be better'; qualEl.style.color = '#f59e0b'; }
      else if (v > 0) { qualEl.textContent = '❌ Sleep deprived — impacts everything'; qualEl.style.color = '#ef4444'; }
      else { qualEl.textContent = 'Slide to set your sleep hours'; qualEl.style.color = 'rgba(240,244,255,0.35)'; }
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
  if (v >= 10000) { qualEl.textContent = '🏆 Excellent — well above target'; qualEl.style.color = '#10b981'; }
  else if (v >= 8000) { qualEl.textContent = '✅ Great — hitting your goal'; qualEl.style.color = '#10b981'; }
  else if (v >= 5000) { qualEl.textContent = '👍 Decent — room to move more'; qualEl.style.color = '#f59e0b'; }
  else if (v > 0) { qualEl.textContent = '⚠️ Low movement today'; qualEl.style.color = '#ef4444'; }
  else { qualEl.textContent = 'Enter your steps from today'; qualEl.style.color = 'rgba(240,244,255,0.35)'; }
}

function syncSetScreen(hrs, mins) {
  const hrsEl = document.getElementById('sync-screen-hrs');
  const minsEl = document.getElementById('sync-screen-mins');
  if (hrsEl) hrsEl.value = hrs;
  if (minsEl) minsEl.value = mins;
  syncUpdateScreenQuality();
}

function syncUpdateScreenQuality() {
  const hrs = parseInt(document.getElementById('sync-screen-hrs').value) || 0;
  const mins = parseInt(document.getElementById('sync-screen-mins').value) || 0;
  const total = hrs * 60 + mins;
  const qualEl = document.getElementById('sync-screen-quality');
  if (!qualEl) return;
  if (total > 0 && total <= 120) { qualEl.textContent = '✅ Under 2h — strong digital discipline'; qualEl.style.color = '#10b981'; }
  else if (total <= 240) { qualEl.textContent = '⚠️ Moderate — could cut non-essential time'; qualEl.style.color = '#f59e0b'; }
  else if (total > 240) { qualEl.textContent = '❌ Over 4h — that\'s ' + Math.round(total * 7 / 60) + 'h/week consumed'; qualEl.style.color = '#ef4444'; }
  else { qualEl.textContent = 'Enter your screen time'; qualEl.style.color = 'rgba(240,244,255,0.35)'; }
}

function syncSaveAll() {
  const sleep = parseFloat(document.getElementById('sync-sleep-slider').value) || 0;
  const steps = parseInt(document.getElementById('sync-steps-input').value) || 0;
  const screenHrs = parseInt(document.getElementById('sync-screen-hrs').value) || 0;
  const screenMins = parseInt(document.getElementById('sync-screen-mins').value) || 0;
  const screenTime = screenHrs * 60 + screenMins;

  if (sleep === 0 && steps === 0 && screenTime === 0) {
    showToast('Enter at least one value', 'error');
    return;
  }

  const today = new Date().toDateString();

  // Calculate score from real data
  let score = 50;
  if (sleep >= 7) score += 15;
  else if (sleep >= 6) score += 5;
  else if (sleep > 0) score -= 10;
  if (steps >= 8000) score += 15;
  else if (steps >= 5000) score += 5;
  else if (steps > 0 && steps < 3000) score -= 5;
  if (screenTime > 0 && screenTime < 120) score += 10;
  else if (screenTime > 240) score -= 10;

  const todayCI = S.checkins[today] || {};
  score += Object.keys(todayCI).length * 5;
  score = Math.max(0, Math.min(100, score));

  S.passiveData[today] = {
    steps: steps,
    sleep: sleep,
    screenTime: screenTime,
    score: score,
    source: 'user',
    syncedAt: new Date().toISOString()
  };
  saveState();

  // Show score reveal
  const scoreNum = document.getElementById('sync-score-num');
  const scoreGrade = document.getElementById('sync-score-grade');
  const breakdown = document.getElementById('sync-score-breakdown');
  if (scoreNum) {
    scoreNum.textContent = '0';
    scoreNum.style.color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  }
  if (scoreGrade) {
    scoreGrade.textContent = score >= 80 ? 'Crushing it today' : score >= 60 ? 'Good day — keep pushing' : score >= 40 ? 'Room for improvement' : 'Rough day — reset tomorrow';
  }
  if (breakdown) {
    breakdown.innerHTML =
      '<div class="sync-bd-row"><span>😴 Sleep</span><span>' + sleep + 'h</span><span class="' + (sleep >= 7 ? 'text-green' : sleep >= 6 ? 'text-amber' : 'text-red') + '">' + (sleep >= 7 ? '+15' : sleep >= 6 ? '+5' : '-10') + '</span></div>' +
      '<div class="sync-bd-row"><span>🚶 Steps</span><span>' + (steps >= 1000 ? (steps/1000).toFixed(1) + 'K' : steps) + '</span><span class="' + (steps >= 8000 ? 'text-green' : steps >= 5000 ? 'text-amber' : 'text-red') + '">' + (steps >= 8000 ? '+15' : steps >= 5000 ? '+5' : steps > 0 ? '-5' : '0') + '</span></div>' +
      '<div class="sync-bd-row"><span>📱 Screen</span><span>' + screenHrs + 'h' + (screenMins > 0 ? screenMins + 'm' : '') + '</span><span class="' + (screenTime < 120 ? 'text-green' : screenTime <= 240 ? 'text-amber' : 'text-red') + '">' + (screenTime < 120 ? '+10' : screenTime > 240 ? '-10' : '0') + '</span></div>' +
      '<div class="sync-bd-row sync-bd-total"><span>⚡ Total</span><span></span><span>' + score + '/100</span></div>';
  }

  syncGoStep(4);

  // Animate score count-up
  let current = 0;
  const increment = Math.ceil(score / 30);
  const timer = setInterval(() => {
    current += increment;
    if (current >= score) { current = score; clearInterval(timer); }
    if (scoreNum) scoreNum.textContent = current;
  }, 30);

  grantXP(10, 'health sync');
  updatePassiveStrip();
}

function syncClose() {
  const overlay = document.getElementById('sync-overlay');
  if (overlay) overlay.classList.add('hidden');
  // Reset steps to permission/step1 for next time
  syncCurrentStep = 0;
}

function recalcTodayScore() {
  const today = new Date().toDateString();
  const data = S.passiveData[today];
  if (!data) return;

  let score = 50;
  if (data.sleep >= 7) score += 15;
  else if (data.sleep >= 6) score += 5;
  else if (data.sleep > 0) score -= 10;
  if (data.steps >= 8000) score += 15;
  else if (data.steps >= 5000) score += 5;
  else if (data.steps > 0 && data.steps < 3000) score -= 5;
  if (data.screenTime > 0 && data.screenTime < 120) score += 10;
  else if (data.screenTime > 240) score -= 10;

  const todayCI = S.checkins[today] || {};
  score += Object.keys(todayCI).length * 5;
  data.score = Math.max(0, Math.min(100, score));
  saveState();
}

function updatePassiveStrip() {
  const today = new Date().toDateString();
  const data = S.passiveData[today];
  const hint = document.getElementById('passive-sync-hint');

  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

  if (!data || !data.source) {
    el('passive-steps-val', '—');
    el('passive-sleep-val', '—');
    el('passive-screen-val', '—');
    el('passive-score-val', '—');
    el('passive-steps-src', '');
    el('passive-sleep-src', '');
    el('passive-screen-src', '');
    el('passive-score-src', '');
    if (hint) hint.classList.remove('hidden');
    return;
  }

  if (hint) hint.classList.add('hidden');

  el('passive-sleep-val', data.sleep ? data.sleep + 'h' : '0h');
  el('passive-steps-val', data.steps >= 1000 ? (data.steps / 1000).toFixed(1) + 'K' : data.steps || '0');
  el('passive-screen-val', data.screenTime >= 60 ? Math.floor(data.screenTime / 60) + 'h' + (data.screenTime % 60 > 0 ? data.screenTime % 60 + 'm' : '') : (data.screenTime || 0) + 'm');

  recalcTodayScore();
  el('passive-score-val', data.score);

  el('passive-sleep-src', '✓ synced');
  el('passive-steps-src', '✓ synced');
  el('passive-screen-src', '✓ synced');
  el('passive-score-src', 'auto');

  // Color code — using iOS system colors
  const G = 'var(--system-green)', Y = 'var(--system-orange)', R = 'var(--system-red)', N = 'var(--label-primary)';
  const scoreEl = document.getElementById('passive-score-val');
  if (scoreEl) scoreEl.style.color = data.score >= 70 ? G : data.score >= 40 ? Y : R;
  const stepsEl = document.getElementById('passive-steps-val');
  if (stepsEl && data.steps) stepsEl.style.color = data.steps >= 8000 ? G : data.steps >= 5000 ? N : Y;
  const sleepEl = document.getElementById('passive-sleep-val');
  if (sleepEl && data.sleep) sleepEl.style.color = data.sleep >= 7 ? G : data.sleep >= 6 ? N : R;
  const screenEl = document.getElementById('passive-screen-val');
  if (screenEl && data.screenTime) screenEl.style.color = data.screenTime <= 120 ? G : data.screenTime <= 240 ? N : R;
}

/* ── BOOT SEQUENCE ────────────────────────────────── */

/* Canvas Text Effect — flowing colored lines reveal text */
class CanvasTextEffect {
  constructor(canvas, text, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.text = text;
    this.colors = options.colors || [
      'rgba(16,185,129,1)',   // green
      'rgba(16,185,129,0.8)',
      'rgba(59,130,246,1)',   // blue
      'rgba(59,130,246,0.8)',
      'rgba(10,132,255,1)',   // system blue
      'rgba(10,132,255,0.7)',
      'rgba(100,210,255,0.9)', // teal
      'rgba(100,210,255,0.6)',
      'rgba(16,185,129,0.5)',
      'rgba(59,130,246,0.4)',
    ];
    this.lineGap = options.lineGap || 3;
    this.speed = options.speed || 18;
    this.fontSize = options.fontSize || 32;
    this.fontFamily = options.fontFamily || "-apple-system, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif";
    this.letterSpacing = options.letterSpacing || 3;
    this.animationId = null;
    this.startTime = null;
    this.textMask = null;
    this.running = false;
  }

  init() {
    const container = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this._buildTextMask();
  }

  _buildTextMask() {
    // Create an offscreen canvas to render text as a mask
    const offscreen = document.createElement('canvas');
    offscreen.width = this.canvas.width;
    offscreen.height = this.canvas.height;
    const offCtx = offscreen.getContext('2d');
    offCtx.scale(this.dpr, this.dpr);

    offCtx.font = '800 ' + this.fontSize + 'px ' + this.fontFamily;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#fff';

    // Draw with letter spacing
    const chars = this.text.split('');
    const totalW = chars.reduce((sum, ch) => {
      return sum + offCtx.measureText(ch).width + this.letterSpacing;
    }, 0) - this.letterSpacing;

    let x = (this.w - totalW) / 2;
    const y = this.h / 2;
    for (const ch of chars) {
      offCtx.fillText(ch, x + offCtx.measureText(ch).width / 2, y);
      x += offCtx.measureText(ch).width + this.letterSpacing;
    }

    // Extract mask data
    this.textMask = offCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  start() {
    this.running = true;
    this.startTime = performance.now();
    this._animate();
  }

  stop() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  _animate() {
    if (!this.running) return;
    const elapsed = (performance.now() - this.startTime) / 1000;
    this._draw(elapsed);
    this.animationId = requestAnimationFrame(() => this._animate());
  }

  _draw(time) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const dpr = this.dpr;

    ctx.clearRect(0, 0, w, h);

    // Draw horizontal flowing lines through the text mask
    const lineCount = Math.floor(h / this.lineGap);

    for (let i = 0; i < lineCount; i++) {
      const y = i * this.lineGap + this.lineGap / 2;
      const colorIdx = i % this.colors.length;
      const color = this.colors[colorIdx];

      // Check if this line row has any text pixels
      const pixelY = Math.floor(y * dpr);
      if (pixelY >= this.canvas.height) continue;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, this.lineGap * 0.55);
      ctx.lineCap = 'round';
      ctx.beginPath();

      let drawing = false;
      let hasSegment = false;

      for (let px = 0; px < this.canvas.width; px++) {
        const maskIdx = (pixelY * this.canvas.width + px) * 4 + 3; // alpha channel
        const isText = this.textMask.data[maskIdx] > 128;

        const screenX = px / dpr;

        if (isText) {
          // Add wave distortion based on time
          const wave = Math.sin((screenX * 0.04) + (i * 0.3) + (time * this.speed * 0.3)) * 1.2;
          const drawY = y + wave;

          if (!drawing) {
            ctx.moveTo(screenX, drawY);
            drawing = true;
            hasSegment = true;
          } else {
            ctx.lineTo(screenX, drawY);
          }
        } else {
          drawing = false;
        }
      }

      if (hasSegment) {
        // Animated opacity — lines fade in sequentially
        const lineDelay = i * 0.015;
        const fadeIn = Math.max(0, Math.min(1, (time - lineDelay) * 2.5));
        ctx.globalAlpha = fadeIn * (0.6 + 0.4 * Math.sin(time * 1.5 + i * 0.2));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}

let bootCanvasText = null;

function runBoot() {
  const bar = document.getElementById('boot-bar');

  // Init canvas text effect
  const textCanvas = document.getElementById('boot-text-canvas');
  if (textCanvas) {
    bootCanvasText = new CanvasTextEffect(textCanvas, 'IMPERIUM OS', {
      fontSize: 30,
      letterSpacing: 4,
      lineGap: 3,
      speed: 18,
      colors: [
        'rgba(16,185,129,1)',
        'rgba(16,185,129,0.85)',
        'rgba(48,209,88,0.9)',
        'rgba(10,132,255,1)',
        'rgba(10,132,255,0.85)',
        'rgba(59,130,246,0.9)',
        'rgba(100,210,255,0.8)',
        'rgba(94,92,230,0.7)',
        'rgba(16,185,129,0.6)',
        'rgba(10,132,255,0.5)',
      ]
    });
    bootCanvasText.init();
    bootCanvasText.start();
  }

  let pct = 0;
  const timer = setInterval(() => {
    pct += 2;
    if (pct > 100) pct = 100;
    bar.style.width = pct + '%';
    if (pct >= 100) { clearInterval(timer); setTimeout(bootDone, 350); }
  }, 15);
}

function bootDone() {
  loadState();
  if (bootCanvasText) bootCanvasText.stop();
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
    'screen-assistant': 'nb-assistant',
    'screen-profile': 'nb-profile',
    'screen-contact': 'nb-contact'
  };
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (navMap[id]) {
    const nb = document.getElementById(navMap[id]);
    if (nb) nb.classList.add('active');
  }

  if (id === 'screen-home') { updateHomeScreen(); }
  if (id === 'screen-insights') { initInsights(); unlockAchievement('insights-visit'); }
  if (id === 'screen-assistant') { initAssistant(); }
  if (id === 'screen-profile') { initProfile(); }
  if (id === 'screen-contact') { initContact(); }
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
  // Show the app guide first if never seen
  if (!S.guideSeen) {
    showAppGuide();
  } else {
    showBottomNav();
    updateStreak();
    grantXP(100, 'System Activated');
    navigateTo('screen-home');
    initHomeData();
    initGlobalEffects();
  }
}

/* ── APP GUIDE / WALKTHROUGH ──────────────────────── */
let guideStep = 1;
const GUIDE_TOTAL = 5;

function showAppGuide() {
  var overlay = document.getElementById('guide-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999';
  }
  guideStep = 1;
  updateGuideUI();
}

function updateGuideUI() {
  // Progress bar
  var fill = document.getElementById('guide-fill');
  if (fill) fill.style.width = (guideStep / GUIDE_TOTAL * 100) + '%';
  // Slides
  for (var i = 1; i <= GUIDE_TOTAL; i++) {
    var slide = document.getElementById('gs-' + i);
    if (slide) {
      slide.classList.toggle('guide-slide-active', i === guideStep);
    }
  }
  // Dots
  var dots = document.querySelectorAll('#guide-dots .guide-dot');
  dots.forEach(function(d, idx) { d.classList.toggle('active', idx < guideStep); });
  // Button text
  var btn = document.getElementById('guide-next-btn');
  if (btn) btn.textContent = guideStep === GUIDE_TOTAL ? 'Let\'s go! 🚀' : 'Next →';
  // Skip visibility
  var skip = document.getElementById('guide-skip');
  if (skip) skip.style.opacity = guideStep === GUIDE_TOTAL ? '0' : '1';
}

function nextGuideStep() {
  if (guideStep < GUIDE_TOTAL) {
    guideStep++;
    updateGuideUI();
  } else {
    closeGuide();
  }
}

function skipGuide() {
  closeGuide();
}

function closeGuide() {
  S.guideSeen = true;
  saveState();
  var overlay = document.getElementById('guide-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .4s ease';
    setTimeout(function() { overlay.classList.add('hidden'); overlay.style.cssText = ''; }, 400);
  }
  showBottomNav();
  updateStreak();
  grantXP(100, 'System Activated');
  navigateTo('screen-home');
  initHomeData();
  initGlobalEffects();
}

/* ── CHECK-IN VOICE INPUT ─────────────────────────── */
let checkinVoiceActive = false;
let checkinVoiceRecognition = null;

function startCheckinVoice(btn, qId) {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Voice not supported in this browser', 'error'); return; }
  if (checkinVoiceActive) { stopCheckinVoice(); return; }

  checkinVoiceActive = true;
  btn.classList.add('cq-mic-recording');
  btn.textContent = '⏹';

  checkinVoiceRecognition = new SR();
  checkinVoiceRecognition.lang = 'en-US';
  checkinVoiceRecognition.interimResults = false;
  checkinVoiceRecognition.maxAlternatives = 1;

  checkinVoiceRecognition.onresult = function(e) {
    var text = e.results[0][0].transcript;
    var input = document.getElementById('cq-' + qId);
    if (input) {
      input.value = text;
      input.focus();
    }
    stopCheckinVoice();
    showToast('Got it! ✨', 'success');
  };
  checkinVoiceRecognition.onerror = function() { stopCheckinVoice(); showToast('Could not hear you, try again', 'error'); };
  checkinVoiceRecognition.onend = function() { stopCheckinVoice(); };
  checkinVoiceRecognition.start();
}

function stopCheckinVoice() {
  checkinVoiceActive = false;
  if (checkinVoiceRecognition) { try { checkinVoiceRecognition.stop(); } catch(e){} checkinVoiceRecognition = null; }
  document.querySelectorAll('.cq-mic-btn').forEach(function(b) {
    b.classList.remove('cq-mic-recording');
    b.textContent = '🎤';
  });
}

/* ── SMART SPEND DETECTION ────────────────────────── */
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

function getSpendNudge() {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return { title: '☕ Morning — grab coffee or breakfast?', sub: 'Quick-log before you forget' };
  if (h >= 11 && h < 14) return { title: '🍽 Lunchtime — eating out today?', sub: 'Tap to log lunch or snacks' };
  if (h >= 14 && h < 17) return { title: '🛍 Afternoon — any shopping?', sub: 'Online orders, apps, subscriptions?' };
  if (h >= 17 && h < 20) return { title: '🛒 Evening — dinner or groceries?', sub: 'Log what you picked up today' };
  if (h >= 20 || h < 6) return { title: '🌙 End of day — anything I missed?', sub: 'Review your spending or upload a receipt' };
  return { title: 'Any spending today?', sub: 'Tap a category or upload a receipt' };
}

function initSpendNudge() {
  const nudge = getSpendNudge();
  const titleEl = document.getElementById('spend-nudge-title');
  const subEl = document.getElementById('spend-nudge-sub');
  if (titleEl) titleEl.textContent = nudge.title;
  if (subEl) subEl.textContent = nudge.sub;
  updateTodaySpendLog();
}

function updateTodaySpendLog() {
  const today = new Date().toDateString();
  const todayTx = S.transactions.filter(tx => {
    return new Date(tx.date).toDateString() === today && tx.type === 'expense';
  });
  const totalEl = document.getElementById('spend-nudge-total');
  const logEl = document.getElementById('spend-today-log');

  if (todayTx.length > 0) {
    const total = todayTx.reduce((s, tx) => s + tx.amount, 0);
    if (totalEl) {
      totalEl.textContent = fmt(total);
      totalEl.style.display = 'block';
    }
    if (logEl) {
      logEl.style.display = 'block';
      logEl.innerHTML = '<div class="spend-log-title">Today\'s spending</div>' +
        todayTx.map(tx => {
          const cat = SPEND_CATEGORIES[tx.category] || { emoji: '💰', label: tx.category };
          return '<div class="spend-log-item"><span>' + cat.emoji + '</span><span class="spend-log-note">' +
            (tx.note || cat.label) + '</span><span class="spend-log-amt">' + fmt(tx.amount) + '</span></div>';
        }).join('');
    }
  } else {
    if (totalEl) totalEl.style.display = 'none';
    if (logEl) logEl.style.display = 'none';
  }
}

function quickSpend(category) {
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
  if (inputEl) { inputEl.value = ''; inputEl.focus(); }
  if (noteEl) noteEl.value = '';
  if (presetsEl) {
    presetsEl.innerHTML = cat.presets.map(p =>
      '<button class="spend-amt-preset" onclick="setSpendAmount(' + p + ')">' + S.currency + p + '</button>'
    ).join('');
  }
  if (overlay) overlay.classList.remove('hidden');
}

function setSpendAmount(val) {
  const inputEl = document.getElementById('spend-amount-input');
  if (inputEl) inputEl.value = val;
}

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
  const cat = SPEND_CATEGORIES[activeSpendCategory] || { label: 'general' };

  const tx = {
    id: Date.now().toString(),
    type: 'expense',
    amount: amount,
    category: activeSpendCategory || 'general',
    note: note || cat.label,
    date: new Date().toISOString()
  };
  S.transactions.push(tx);
  saveState();
  grantXP(15, 'Spend logged');
  checkAchievements();

  closeSpendAmount();
  updateTodaySpendLog();
  showToast(cat.emoji + ' ' + fmt(amount) + ' logged!', 'success');
  addHomeBotMessage('ai', '📝 Logged ' + cat.emoji + ' ' + cat.label + ': ' + fmt(amount) + (note ? ' · ' + note : '') + '. Nice job staying on top of it!');
}

function spendMissedPrompt() {
  const today = new Date().toDateString();
  const todayTx = S.transactions.filter(tx => new Date(tx.date).toDateString() === today && tx.type === 'expense');
  let msg;
  if (todayTx.length === 0) {
    msg = "🔍 Let's do a spending sweep! Think through your day:\n\n" +
      "☕ Morning coffee or breakfast?\n" +
      "🍽 Lunch — ate out or ordered in?\n" +
      "🚗 Uber, gas, parking, transit?\n" +
      "🛍 Any online orders (Amazon, apps)?\n" +
      "🛒 Groceries or household items?\n\n" +
      "Tap a category above to quick-log, or say 'Spent $X on Y' and I'll handle it.";
  } else {
    const total = todayTx.reduce((s, tx) => s + tx.amount, 0);
    const cats = [...new Set(todayTx.map(tx => {
      const c = SPEND_CATEGORIES[tx.category];
      return c ? c.emoji + ' ' + c.label : tx.category;
    }))];
    msg = "🔍 Spending sweep — so far today: " + fmt(total) + "\n\n" +
      "Logged: " + cats.join(', ') + "\n\n" +
      "Anything else? Think about:\n" +
      "• Subscriptions that renewed?\n" +
      "• Small purchases (vending machine, tips)?\n" +
      "• Shared costs or money transfers?\n\n" +
      "Say 'Spent $X on Y' or upload a receipt 📸";
  }
  addHomeBotMessage('ai', msg);
}

/* ── RECEIPT UPLOAD & SCAN ────────────────────────── */
function openReceiptUpload() {
  const overlay = document.getElementById('receipt-overlay');
  if (overlay) overlay.classList.remove('hidden');
  // Reset state
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
    // Start "scanning" animation, then extract
    const scanning = document.getElementById('receipt-scanning');
    if (scanning) scanning.style.display = 'flex';
    setTimeout(() => scanReceiptImage(e.target.result), 2000);
  };
  reader.readAsDataURL(file);
}

function scanReceiptImage(dataUrl) {
  // Smart extraction using canvas + heuristic text detection
  // Since we can't do real OCR in a PWA without a server, we use smart prompts
  const scanning = document.getElementById('receipt-scanning');
  if (scanning) scanning.style.display = 'none';

  const results = document.getElementById('receipt-results');
  const itemsList = document.getElementById('receipt-items-list');
  if (!results || !itemsList) return;

  // Show a smart form for the user to enter what they see on the receipt
  receiptExtractedItems = [];
  results.classList.remove('hidden');
  itemsList.innerHTML =
    '<div class="receipt-smart-prompt">' +
      '<div class="receipt-smart-text">📋 I see your receipt! Help me log it:</div>' +
      '<div class="receipt-entry" id="receipt-entry-1">' +
        '<input type="text" class="receipt-item-name" placeholder="Item (e.g. Coffee)" id="ri-name-1"/>' +
        '<div class="receipt-item-amt-wrap"><span>' + S.currency + '</span><input type="number" class="receipt-item-amt" placeholder="0" inputmode="decimal" id="ri-amt-1"/></div>' +
      '</div>' +
      '<div class="receipt-entry" id="receipt-entry-2">' +
        '<input type="text" class="receipt-item-name" placeholder="Item 2 (optional)" id="ri-name-2"/>' +
        '<div class="receipt-item-amt-wrap"><span>' + S.currency + '</span><input type="number" class="receipt-item-amt" placeholder="0" inputmode="decimal" id="ri-amt-2"/></div>' +
      '</div>' +
      '<div class="receipt-entry" id="receipt-entry-3">' +
        '<input type="text" class="receipt-item-name" placeholder="Item 3 (optional)" id="ri-name-3"/>' +
        '<div class="receipt-item-amt-wrap"><span>' + S.currency + '</span><input type="number" class="receipt-item-amt" placeholder="0" inputmode="decimal" id="ri-amt-3"/></div>' +
      '</div>' +
      '<button class="receipt-add-more" onclick="addReceiptEntry()">+ Add more items</button>' +
      '<div class="receipt-total-hint">Or just enter the <strong>total</strong> in the first row</div>' +
    '</div>';
}

let receiptEntryCount = 3;

function addReceiptEntry() {
  receiptEntryCount++;
  const list = document.getElementById('receipt-items-list');
  const prompt = list ? list.querySelector('.receipt-smart-prompt') : null;
  if (!prompt) return;
  const addBtn = prompt.querySelector('.receipt-add-more');
  const entry = document.createElement('div');
  entry.className = 'receipt-entry';
  entry.id = 'receipt-entry-' + receiptEntryCount;
  entry.innerHTML =
    '<input type="text" class="receipt-item-name" placeholder="Item ' + receiptEntryCount + '" id="ri-name-' + receiptEntryCount + '"/>' +
    '<div class="receipt-item-amt-wrap"><span>' + S.currency + '</span><input type="number" class="receipt-item-amt" placeholder="0" inputmode="decimal" id="ri-amt-' + receiptEntryCount + '"/></div>';
  if (addBtn) addBtn.before(entry);
}

function confirmReceiptItems() {
  let logged = 0;
  let total = 0;
  for (let i = 1; i <= receiptEntryCount; i++) {
    const nameEl = document.getElementById('ri-name-' + i);
    const amtEl = document.getElementById('ri-amt-' + i);
    if (!nameEl || !amtEl) continue;
    const name = nameEl.value.trim();
    const amt = parseFloat(amtEl.value);
    if (!amt || amt <= 0) continue;
    const tx = {
      id: (Date.now() + i).toString(),
      type: 'expense',
      amount: amt,
      category: guessCategory(name),
      note: name || 'Receipt item',
      date: new Date().toISOString()
    };
    S.transactions.push(tx);
    logged++;
    total += amt;
  }
  if (logged === 0) { showToast('Enter at least one item with an amount', 'error'); return; }
  saveState();
  grantXP(20, 'Receipt scanned');
  checkAchievements();
  closeReceiptUpload();
  receiptEntryCount = 3;
  updateTodaySpendLog();
  showToast('📸 ' + logged + ' item' + (logged > 1 ? 's' : '') + ' logged from receipt!', 'success');
  addHomeBotMessage('ai', '📸 Receipt scanned! Logged ' + logged + ' item' + (logged > 1 ? 's' : '') + ' totalling ' + fmt(total) + '. Your spending is being tracked 📊');
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

/* ── HOME ─────────────────────────────────────────── */
let homeVoiceActive = false;
let homeRecognition = null;
let homeChatHistory = [];

// LLM CONFIGURATION
let LLM_CONFIG = {
  provider: 'ollama',  // 'ollama' | 'openai'
  ollama: {
    url: 'http://localhost:11434/api/chat',
    model: 'llama3.2:latest'
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKey: ''
  },
  lastUsed: 0,  // rate limiting
  rateLimitMs: 2000
};

function loadLLMConfig() {
  const saved = localStorage.getItem('imperium_llm_config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      LLM_CONFIG = { ...LLM_CONFIG, ...config };
    } catch(e) {}
  }
}

function saveLLMConfig() {
  localStorage.setItem('imperium_llm_config', JSON.stringify(LLM_CONFIG));
}

// Get relevant app context for LLM
function getAppContext() {
  const today = new Date().toDateString();
  const recentDays = 7;
  const cutoff = Date.now() - recentDays * 86400000;
  
  const context = {
    user: S.user || { name: 'User' },
    situation: S.situation || 'unknown',
    goal: S.goal || 'optimize life',
    totalCheckins: getTotalCheckinCount(),
    streak: S.streak || 0,
    level: S.level || 1,
    recentCheckins: {},
    passiveData: {},
    transactions: [],
    currency: S.currency || '$'
  };
  
  // Recent checkins (last 7 days)
  Object.keys(S.checkins || {}).sort().slice(-recentDays).forEach(date => {
    context.recentCheckins[date] = S.checkins[date];
  });
  
  // Recent passive data
  Object.keys(S.passiveData || {}).sort().slice(-recentDays).forEach(date => {
    context.passiveData[date] = S.passiveData[date];
  });
  
  // Recent transactions (last 7 days)
  (S.transactions || []).filter(tx => Date.parse(tx.date) > cutoff).forEach(tx => {
    context.transactions.push(tx);
  });
  
  return context;
}

// Central LLM call
async function callLLM(userMessage, chatType = 'general') {
  const now = Date.now();
  if (now - LLM_CONFIG.lastUsed < LLM_CONFIG.rateLimitMs) {
    return { error: 'Please wait a moment before sending another message' };
  }
  
  LLM_CONFIG.lastUsed = now;
  saveLLMConfig();
  
  const context = getAppContext();
  
  const systemPrompt = `You are Imperium AI, a personal intelligence system that tracks daily check-ins, health data (sleep/steps/screen), spending, and life optimization.

USER PROFILE:
- Name: ${context.user.name}
- Situation: ${context.situation} 
- Goal: ${context.goal}
- Level: ${context.level} (${S.xp || 0} XP, ${context.streak} day streak)
- Total check-ins: ${context.totalCheckins}

RECENT DATA (last 7 days):
Check-ins: ${JSON.stringify(context.recentCheckins)}
Health: ${JSON.stringify(context.passiveData)}
Transactions: ${context.transactions.length} (${context.transactions.reduce((s,t)=>s+(t.amount||0),0).toFixed(1)} ${context.currency})

RULES:
- Be concise (2-4 sentences max)
- Actionable insights only
- Use emojis (🧠⚡📊💰😴🚶📱)
- Reference specific data when possible
- Positive/encouraging tone
- End with question or call-to-action if appropriate

User says: "${userMessage}"

Respond conversationally but insightfully.`;
  
  try {
    let url, payload;
    
    if (LLM_CONFIG.provider === 'ollama') {
      url = LLM_CONFIG.ollama.url;
      payload = {
        model: LLM_CONFIG.ollama.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: false,
        options: { temperature: 0.7, num_predict: 300 }
      };
    } else {
      if (!LLM_CONFIG.openai.apiKey) {
        return { error: 'OpenAI API key required. Set in Profile → LLM Settings.' };
      }
      url = LLM_CONFIG.openai.url;
      payload = {
        model: LLM_CONFIG.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 300
      };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(LLM_CONFIG.provider === 'openai' && { 'Authorization': `Bearer ${LLM_CONFIG.openai.apiKey}` })
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const aiText = LLM_CONFIG.provider === 'ollama' 
      ? data.message?.content || data.response || 'No response'
      : data.choices[0]?.message?.content || 'No response';
    
    return { success: true, text: aiText.trim() };
    
  } catch (error) {
    console.error('LLM Error:', error);
    return { 
      error: 'AI service unavailable. Using backup responses.',
      fallback: true 
    };
  }
}

function initHomeData() {
  updateHomeGreeting();
  initParticles();
  initBeams();
  initDottedGlow();
  updateHomeXPChip();
  initCheckinCard();
  initCheckinBeams();
  updatePassiveStrip();
  initSpendNudge();

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
  initSpendNudge();
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

async function homeChat(q) {
  const inputEl = document.getElementById('home-input');
  const text = q || (inputEl ? inputEl.value.trim() : '');
  if (!text) return;
  if (inputEl && !q) inputEl.value = '';
  addHomeBotMessage('user', text);

  // Check if it's a transaction logging intent (pre-LLM)
  const parsed = parseHomeTx(text);
  if (parsed) {
    logFromHomeBot(parsed, text);
    return;
  }

  // Show typing
  const typingDiv = document.createElement('div');
  typingDiv.className = 'hcm hcm-ai hcm-typing';
  typingDiv.innerHTML = '<div class="hcm-av">🧠</div><div class="hcm-bubble"><div class="typing-dots"><div></div><div></div><div></div></div></div>';
  const feed = document.getElementById('home-chat-feed');
  if (feed) {
    feed.appendChild(typingDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  // LLM call
  const result = await callLLM(text, 'home');
  const typingEl = document.querySelector('.hcm-typing');
  if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);

  if (result.success) {
    addHomeBotMessage('ai', result.text);
  } else if (result.fallback) {
    // Fallback to original static response
    generateHomeResponse(text);
  } else {
    addHomeBotMessage('ai', '🤖 LLM temporarily unavailable. ' + (result.error || 'Try again soon.'));
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
  const dates = Object.keys(S.checkins).sort();
  const totalCI = getTotalCheckinCount();
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

  el('isc-checkins', totalCI);
  el('isc-streak', S.streak || 0);
  el('isc-xp', S.totalXp || 0);

  // Update Insights greeting
  const h = new Date().getHours();
  const name = S.user ? S.user.name.split(' ')[0] : 'there';
  const greetEmoji = h < 12 ? '☀️' : h < 17 ? '🌤️' : h < 21 ? '🌅' : '🌙';
  const greetText = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  const greetEl = document.getElementById('insights-greeting');
  const greetSubEl = document.getElementById('insights-greeting-sub');
  if (greetEl) greetEl.textContent = greetText + ', ' + name + ' ' + greetEmoji;
  if (greetSubEl) {
    if (totalCI === 0) greetSubEl.textContent = 'Start checking in to unlock your intelligence';
    else if (totalCI < 10) greetSubEl.textContent = 'Building your profile — ' + totalCI + ' check-ins so far';
    else greetSubEl.textContent = 'Here\'s your intelligence overview';
  }

  // Update action card subtexts dynamically
  const today = new Date().toDateString();
  const todayCI = S.checkins[today] || {};
  const todayPD = S.passiveData[today];
  const periodsDone = Object.keys(todayCI).length;
  const todaySub = document.getElementById('iac-today-sub');
  if (todaySub) todaySub.textContent = periodsDone > 0 ? periodsDone + '/4 check-ins · ' + (todayPD ? '⚡ ' + todayPD.score : 'sync data') : 'No check-ins yet';

  const patterns = detectLifePatterns();
  const patternsSub = document.getElementById('iac-patterns-sub');
  if (patternsSub) patternsSub.textContent = patterns.length > 0 ? patterns.length + ' patterns found' : 'Need 3+ days of data';

  const adviceSub = document.getElementById('iac-advice-sub');
  if (adviceSub) adviceSub.textContent = patterns.length > 0 ? 'Tips based on your data' : 'Check in more for tips';

  const monthTx = S.transactions.filter(function(tx) {
    var d = new Date(tx.date); var n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });
  const totalSpent = monthTx.filter(function(tx) { return tx.type === 'expense'; }).reduce(function(s, tx) { return s + tx.amount; }, 0);
  const spendSub = document.getElementById('iac-spend-sub');
  if (spendSub) spendSub.textContent = monthTx.length > 0 ? fmt(totalSpent) + ' this month' : 'No spending logged';

  // Calculate weekly score
  const recent7 = dates.slice(-7);
  let avgScore = 0, scoreCount = 0;
  recent7.forEach(d => {
    if (S.passiveData[d]) { avgScore += S.passiveData[d].score; scoreCount++; }
  });
  if (scoreCount > 0) {
    avgScore = Math.round(avgScore / scoreCount);
    el('isc-score', avgScore);
    const gradeE = document.getElementById('isc-grade');
    if (gradeE) {
      gradeE.textContent = avgScore >= 75 ? 'excellent' : avgScore >= 50 ? 'good' : 'building';
      gradeE.style.color = avgScore >= 75 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444';
    }
    const scoreEl = document.getElementById('isc-score');
    if (scoreEl) scoreEl.style.color = avgScore >= 75 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444';
  }

  // Weekly chart
  buildWeeklyChart();

  // Pattern cards
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

/* ── INSIGHT ACTION CARDS ─────────────────────────── */
function insightCardAction(type) {
  var expanded = document.getElementById('insight-expanded');
  var title = document.getElementById('insight-expanded-title');
  var body = document.getElementById('insight-expanded-body');
  if (!expanded || !title || !body) return;

  var today = new Date().toDateString();
  var todayCI = S.checkins[today] || {};
  var todayPD = S.passiveData[today];
  var dates = Object.keys(S.checkins).sort();
  var patterns = detectLifePatterns();
  var html = '';

  if (type === 'today') {
    title.textContent = '📊 Today\'s Snapshot';
    var periodsDone = Object.keys(todayCI).length;
    html += '<div class="ieb-section"><div class="ieb-section-title">Check-ins</div>';
    html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">✅</span><span class="ieb-stat-text">' + periodsDone + '/4 check-ins completed</span></div>';
    ['morning','afternoon','evening','night'].forEach(function(p) {
      var icon = todayCI[p] ? '🟢' : '⚪';
      html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">' + icon + '</span><span class="ieb-stat-text">' + CHECKIN_PERIODS[p].label + '</span>' + (todayCI[p] ? '<span class="ieb-stat-val">Done</span>' : '') + '</div>';
    });
    html += '</div>';
    if (todayPD) {
      html += '<div class="ieb-section"><div class="ieb-section-title">Passive Data</div>';
      html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">🚶</span><span class="ieb-stat-text">Steps</span><span class="ieb-stat-val">' + todayPD.steps.toLocaleString() + '</span></div>';
      html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">😴</span><span class="ieb-stat-text">Sleep</span><span class="ieb-stat-val">' + todayPD.sleep + 'h</span></div>';
      html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">📱</span><span class="ieb-stat-text">Screen Time</span><span class="ieb-stat-val">' + todayPD.screenTime + 'm</span></div>';
      html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">⚡</span><span class="ieb-stat-text">Day Score</span><span class="ieb-stat-val">' + todayPD.score + '</span></div>';
      html += '</div>';
    }
  } else if (type === 'patterns') {
    title.textContent = '🔍 Patterns Detected';
    if (patterns.length) {
      patterns.forEach(function(p) {
        html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">' + p.icon + '</span><span class="ieb-stat-text"><strong>' + p.title + '</strong><br><span style="color:var(--label-secondary);font-size:var(--ts-footnote)">' + p.insight + '</span></span></div>';
      });
    } else {
      html += '<div class="ieb-tip">🧠 Keep checking in daily — patterns emerge after 3+ days of data. The more consistent you are, the deeper the insights.</div>';
    }
  } else if (type === 'advice') {
    title.textContent = '💡 Personalised Advice';
    var tips = [];
    patterns.forEach(function(p) {
      if (p.icon.includes('⚠️') || p.icon.includes('📉')) tips.push(p);
    });
    if (tips.length) {
      tips.forEach(function(t) {
        html += '<div class="ieb-tip">🎯 <strong>' + t.title + ':</strong> ' + t.insight + '</div>';
      });
      html += '<div class="ieb-tip">💪 Pick ONE area to improve this week. Small, consistent changes beat dramatic overhauls.</div>';
    } else if (patterns.length) {
      html += '<div class="ieb-tip">✨ Your data looks great! Keep up the consistency. Consider: (1) Track one new habit, (2) Set more ambitious daily priorities, (3) Challenge yourself physically.</div>';
    } else {
      html += '<div class="ieb-tip">📝 I need more data to give personalised advice. Complete at least 3 days of check-ins and sync your health data.</div>';
    }
    html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">🔥</span><span class="ieb-stat-text">Current streak</span><span class="ieb-stat-val">' + (S.streak || 0) + ' days</span></div>';
    html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">⭐</span><span class="ieb-stat-text">Total XP</span><span class="ieb-stat-val">' + (S.totalXp || 0) + '</span></div>';
  } else if (type === 'spend') {
    title.textContent = '💸 Spending Intelligence';
    var now = new Date();
    var monthTx = S.transactions.filter(function(tx) {
      var d = new Date(tx.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    var totalSpent = monthTx.filter(function(tx) { return tx.type === 'expense'; }).reduce(function(s, tx) { return s + tx.amount; }, 0);
    var totalInc = monthTx.filter(function(tx) { return tx.type === 'income'; }).reduce(function(s, tx) { return s + tx.amount; }, 0);
    html += '<div class="ieb-section"><div class="ieb-section-title">This Month</div>';
    html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">📈</span><span class="ieb-stat-text">Income</span><span class="ieb-stat-val">' + fmt(totalInc) + '</span></div>';
    html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">📉</span><span class="ieb-stat-text">Spent</span><span class="ieb-stat-val" style="color:var(--system-red)">' + fmt(totalSpent) + '</span></div>';
    html += '<div class="ieb-stat-row"><span class="ieb-stat-icon">' + (totalInc >= totalSpent ? '✅' : '⚠️') + '</span><span class="ieb-stat-text">Net</span><span class="ieb-stat-val" style="color:' + (totalInc >= totalSpent ? 'var(--system-green)' : 'var(--system-red)') + '">' + fmt(totalInc - totalSpent) + '</span></div>';
    html += '</div>';
    var recent = monthTx.slice(-5).reverse();
    if (recent.length) {
      html += '<div class="ieb-section"><div class="ieb-section-title">Recent Transactions</div>';
      recent.forEach(function(tx) {
        var sign = tx.type === 'income' ? '+' : '-';
        var color = tx.type === 'income' ? 'var(--system-green)' : 'var(--system-red)';
        html += '<div class="ieb-spend-item"><span class="ieb-spend-cat">' + (tx.type === 'income' ? '💰' : '💳') + ' ' + (tx.note || tx.category) + '</span><span class="ieb-spend-amount" style="color:' + color + '">' + sign + fmt(tx.amount) + '</span></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="ieb-tip">💳 No transactions this month. Voice-log from Home — say "Spent $X on Y" or tap the spend nudge card.</div>';
    }
  }

  body.innerHTML = html;
  expanded.classList.remove('hidden');
  expanded.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeInsightCard() {
  var expanded = document.getElementById('insight-expanded');
  if (expanded) expanded.classList.add('hidden');
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
  { icon: '🤖', label: 'AI Assistant', action: () => navigateTo('screen-assistant'), badge: 'NEW' },
  { icon: '👤', label: 'Profile', action: () => navigateTo('screen-profile'), badge: '' },
  { icon: '💬', label: 'Contact & Feedback', action: () => navigateTo('screen-contact'), badge: '' },
  { icon: '⭐', label: 'Upgrade to Pro', action: () => openPro(), badge: 'SOON' },
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

/* ── BEAM COLLISION CANVAS — Check-in Card Background ── */
class BeamCollisionEffect {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.beams = [];
    this.particles = [];
    this.running = false;
    this.W = 0;
    this.H = 0;
    this.colors = [
      { r: 10, g: 132, b: 255 },    // system-blue
      { r: 94, g: 92, b: 230 },     // system-indigo
      { r: 191, g: 90, b: 242 },    // system-purple
      { r: 48, g: 209, b: 88 },     // system-green
      { r: 100, g: 210, b: 255 },   // system-teal
      { r: 255, g: 159, b: 10 },    // system-orange
    ];
    this._resize = this.resize.bind(this);
    this._loop = this.loop.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    window.addEventListener('resize', this._resize);
    this.spawnBeams();
    this._spawnInterval = setInterval(() => this.spawnBeams(), 2400);
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this._resize);
    if (this._spawnInterval) clearInterval(this._spawnInterval);
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.W = this.canvas.width = r.width;
    this.H = this.canvas.height = r.height;
  }

  spawnBeams() {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const fromTop = Math.random() > 0.5;
      const c = this.colors[Math.floor(Math.random() * this.colors.length)];
      const beam = {
        x: Math.random() * this.W,
        y: fromTop ? -20 : this.H + 20,
        angle: fromTop
          ? (Math.PI / 3 + Math.random() * Math.PI / 3)
          : -(Math.PI / 3 + Math.random() * Math.PI / 3),
        speed: 0.8 + Math.random() * 1.2,
        width: 1.5 + Math.random() * 2.5,
        length: 40 + Math.random() * 60,
        color: c,
        alpha: 0.15 + Math.random() * 0.25,
        life: 1,
        trail: [],
      };
      this.beams.push(beam);
    }
  }

  spawnCollisionParticles(x, y, c) {
    const num = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < num; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 2.5,
        color: c,
        alpha: 0.6 + Math.random() * 0.4,
        decay: 0.015 + Math.random() * 0.02,
      });
    }
  }

  loop() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    // Update & draw beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.x += Math.cos(b.angle) * b.speed;
      b.y += Math.sin(b.angle) * b.speed;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > b.length) b.trail.shift();

      // Draw beam trail
      if (b.trail.length > 1) {
        for (let t = 1; t < b.trail.length; t++) {
          const frac = t / b.trail.length;
          const a = b.alpha * frac;
          ctx.beginPath();
          ctx.moveTo(b.trail[t - 1].x, b.trail[t - 1].y);
          ctx.lineTo(b.trail[t].x, b.trail[t].y);
          ctx.strokeStyle = 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + a + ')';
          ctx.lineWidth = b.width * frac;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        // Glow at head
        const head = b.trail[b.trail.length - 1];
        const grd = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 8);
        grd.addColorStop(0, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',' + (b.alpha * 0.6) + ')');
        grd.addColorStop(1, 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0)');
        ctx.beginPath(); ctx.arc(head.x, head.y, 8, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill();
      }

      // Check collision with other beams
      for (let j = i - 1; j >= 0; j--) {
        const b2 = this.beams[j];
        if (b2.trail.length < 2) continue;
        const h2 = b2.trail[b2.trail.length - 1];
        const dx = b.x - h2.x, dy = b.y - h2.y;
        if (Math.sqrt(dx * dx + dy * dy) < 14) {
          // Collision!
          const mx = (b.x + h2.x) / 2, my = (b.y + h2.y) / 2;
          const mc = { r: Math.round((b.color.r + b2.color.r) / 2), g: Math.round((b.color.g + b2.color.g) / 2), b: Math.round((b.color.b + b2.color.b) / 2) };
          this.spawnCollisionParticles(mx, my, mc);
          this.beams.splice(i, 1);
          this.beams.splice(j, 1);
          i--;
          break;
        }
      }

      // Remove if off-screen
      if (b.x < -60 || b.x > this.W + 60 || b.y < -60 || b.y > this.H + 60) {
        this.beams.splice(i, 1);
      }
    }

    // Update & draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96;
      p.alpha -= p.decay;
      if (p.alpha <= 0) { this.particles.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
      ctx.fill();
      // Particle glow
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      pg.addColorStop(0, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + (p.alpha * 0.3) + ')');
      pg.addColorStop(1, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0)');
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
    }

    requestAnimationFrame(this._loop);
  }
}

let checkinBeamEffect = null;

function initCheckinBeams() {
  const canvas = document.getElementById('checkin-beams-canvas');
  if (!canvas) return;
  if (checkinBeamEffect) checkinBeamEffect.stop();
  checkinBeamEffect = new BeamCollisionEffect(canvas);
  checkinBeamEffect.start();
}

function stopCheckinBeams() {
  if (checkinBeamEffect) { checkinBeamEffect.stop(); checkinBeamEffect = null; }
}

/* ── GLOBAL EFFECTS ───────────────────────────────── */
function initGlobalEffects() {
  // iOS native: disabled particles, beams, dotted glow, cursor glow
  // Only keep magnetic for subtle button interactions
  initMagnetic();
}

/* ═══════════════════════════════════════════════════════
   AI ASSISTANT — In-App WhatsApp-Style Chat
   Screenshot upload, file upload, voice notes, patterns
   ═══════════════════════════════════════════════════════ */

let astVoiceRec = null;
let astRecording = false;
let astRecordStart = 0;

function initAssistant() {
  const feed = document.getElementById('assistant-chat');
  if (!feed) return;
  // Render existing messages
  if (S.assistantMessages.length === 0) {
    // Welcome message
    const now = new Date();
    S.assistantMessages.push({
      role: 'ai',
      type: 'text',
      text: 'Hey! 👋 I\'m your Imperium AI assistant.\n\nYou can:\n• Send me screenshots of bank transactions\n• Upload CSV/PDF statements\n• Leave voice notes about spending\n• Ask me to find patterns in your data\n\nThink of me as your personal finance + life analyst. What would you like to do?',
      time: now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
    });
    saveState();
  }
  renderAssistantChat();
}

function renderAssistantChat() {
  const feed = document.getElementById('assistant-chat');
  if (!feed) return;
  let html = '';
  let lastDate = '';
  S.assistantMessages.forEach(m => {
    // Date separator
    const msgDate = m.date || 'Today';
    if (msgDate !== lastDate) {
      html += '<div class="ast-date-sep"><span class="ast-date-pill">' + msgDate + '</span></div>';
      lastDate = msgDate;
    }
    const cls = m.role === 'ai' ? 'ast-msg-ai' : 'ast-msg-user';
    html += '<div class="ast-msg ' + cls + '">';
    html += '<div class="ast-bubble">';
    // Content based on type
    if (m.type === 'image') {
      html += '<img class="ast-img-preview" src="' + m.src + '" alt="Upload"/>';
      if (m.text) html += '<div style="margin-top:4px">' + escHtml(m.text) + '</div>';
    } else if (m.type === 'file') {
      html += '<div class="ast-file-preview"><div class="ast-file-icon">' + getFileIcon(m.fileName) + '</div><div class="ast-file-info"><div class="ast-file-name">' + escHtml(m.fileName) + '</div><div class="ast-file-size">' + m.fileSize + '</div></div></div>';
      if (m.text) html += '<div style="margin-top:4px">' + escHtml(m.text) + '</div>';
    } else if (m.type === 'voice') {
      html += '<div class="ast-voice-note"><div class="ast-voice-play">▶</div><div class="ast-voice-wave">';
      for (let i = 0; i < 20; i++) html += '<div class="ast-voice-bar" style="height:' + (4 + Math.random() * 16) + 'px"></div>';
      html += '</div><div class="ast-voice-duration">' + m.duration + '</div></div>';
      if (m.text) html += '<div style="margin-top:4px;font-size:.82rem">' + escHtml(m.text) + '</div>';
    } else if (m.type === 'transactions') {
      html += '<div class="ast-tx-card"><div class="ast-tx-title">📋 Extracted Transactions</div>';
      let total = 0;
      m.transactions.forEach(tx => {
        total += tx.amount;
        html += '<div class="ast-tx-row"><span class="ast-tx-name">' + tx.emoji + ' ' + escHtml(tx.name) + '</span><span class="ast-tx-amt">' + S.currency + tx.amount.toFixed(2) + '</span></div>';
      });
      html += '<div class="ast-tx-row ast-tx-total"><span class="ast-tx-name">Total</span><span class="ast-tx-amt">' + S.currency + total.toFixed(2) + '</span></div></div>';
      if (m.text) html += '<div style="margin-top:6px">' + escHtml(m.text) + '</div>';
    } else if (m.type === 'patterns') {
      html += '<div class="ast-pattern-card"><div class="ast-pattern-title">🔍 Pattern Analysis</div>';
      m.patterns.forEach(p => { html += '<div class="ast-pattern-item">' + escHtml(p) + '</div>'; });
      html += '</div>';
      if (m.text) html += '<div style="margin-top:6px">' + escHtml(m.text) + '</div>';
    } else {
      html += escHtml(m.text);
    }
    html += '<div class="ast-time">' + (m.time || '') + '</div>';
    html += '</div></div>';
  });
  feed.innerHTML = html;
  feed.scrollTop = feed.scrollHeight;
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function getFileIcon(name) {
  if (!name) return '📄';
  const ext = name.split('.').pop().toLowerCase();
  if (['csv','xlsx','xls'].includes(ext)) return '📊';
  if (ext === 'pdf') return '📕';
  if (ext === 'json') return '📋';
  if (['jpg','jpeg','png','webp','gif'].includes(ext)) return '🖼';
  return '📄';
}

function getTimeStr() {
  return new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

function addAstMessage(role, type, data) {
  const msg = {
    role: role,
    type: type,
    time: getTimeStr(),
    date: 'Today',
    ...data
  };
  S.assistantMessages.push(msg);
  saveState();
  renderAssistantChat();
}

function sendAssistantMsg() {
  const input = document.getElementById('ast-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';

  // Add user message
  addAstMessage('user', 'text', { text: text });

  // Show typing indicator
  showAstTyping();

  // Generate response after delay
  setTimeout(() => {
    hideAstTyping();
    const response = generateAssistantResponse(text);
    if (response.type === 'patterns') {
      addAstMessage('ai', 'patterns', response);
    } else if (response.type === 'transactions') {
      addAstMessage('ai', 'transactions', response);
    } else {
      addAstMessage('ai', 'text', { text: response.text });
    }
  }, 800 + Math.random() * 1200);
}

function showAstTyping() {
  const feed = document.getElementById('assistant-chat');
  if (!feed) return;
  const el = document.createElement('div');
  el.className = 'ast-msg ast-msg-ai';
  el.id = 'ast-typing-indicator';
  el.innerHTML = '<div class="ast-bubble"><div class="ast-typing"><div class="ast-typing-dot"></div><div class="ast-typing-dot"></div><div class="ast-typing-dot"></div></div></div>';
  feed.appendChild(el);
  feed.scrollTop = feed.scrollHeight;
}

function hideAstTyping() {
  const el = document.getElementById('ast-typing-indicator');
  if (el) el.remove();
}

function generateAssistantResponse(text) {
  const lower = text.toLowerCase();

  // Pattern analysis request
  if (lower.includes('pattern') || lower.includes('trend') || lower.includes('analys')) {
    return generatePatternAnalysis();
  }

  // Summary request
  if (lower.includes('summary') || lower.includes('overview') || lower.includes('how am i doing')) {
    return generateSummaryResponse();
  }

  // Spending query
  if (lower.includes('spend') || lower.includes('spent') || lower.includes('money') || lower.includes('transaction')) {
    return generateSpendResponse();
  }

  // Health data
  if (lower.includes('sleep') || lower.includes('step') || lower.includes('screen time') || lower.includes('health')) {
    return generateHealthResponse();
  }

  // Log a transaction from text
  const txMatch = text.match(/(?:spent|paid|bought)\s*(?:\$|£|€|₹)?\s*(\d+(?:\.\d+)?)\s*(?:on|for|at)?\s*(.*)/i);
  if (txMatch) {
    const amount = parseFloat(txMatch[1]);
    const desc = txMatch[2] ? txMatch[2].trim() : 'Misc';
    const cat = guessCategory(desc);
    S.transactions.push({ amount, desc, cat: cat.name, emoji: cat.emoji, date: new Date().toISOString() });
    saveState();
    updateTodaySpendLog();
    grantXP(10, 'logged via AI');
    return { type: 'text', text: '✅ Logged: ' + cat.emoji + ' ' + desc + ' — ' + S.currency + amount.toFixed(2) + '\n\nI\'ve added this to your spending log. Want me to show your patterns?' };
  }

  // General chat
  const responses = [
    'I can help you track spending, analyse patterns, or review your health data. Try sending me a screenshot of your bank app!',
    'Want me to look at your spending patterns? Just ask "show patterns" or upload a transaction file.',
    'I\'m here to help! You can:\n• Send screenshots of transactions\n• Upload CSV/PDF statements\n• Ask about your spending habits\n• Get health & productivity insights',
    'That\'s interesting! Would you like me to analyse your recent data? I can look at spending, sleep, steps, or overall patterns.',
    'Got it! Is there anything specific you\'d like me to track or analyse? I\'m best at finding patterns in your financial and health data.'
  ];
  return { type: 'text', text: responses[Math.floor(Math.random() * responses.length)] };
}

function generatePatternAnalysis() {
  const patterns = [];
  const txs = S.transactions || [];

  if (txs.length > 0) {
    // Spending by category
    const catTotals = {};
    txs.forEach(tx => {
      const cat = tx.cat || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + tx.amount;
    });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      patterns.push('💰 Top spending: ' + sorted.slice(0, 3).map(([c, v]) => c + ' (' + S.currency + v.toFixed(0) + ')').join(', '));
    }

    // Average per transaction
    const avg = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
    patterns.push('📊 Average transaction: ' + S.currency + avg.toFixed(2) + ' across ' + txs.length + ' transactions');

    // Recent trend
    const last7 = txs.filter(t => (Date.now() - new Date(t.date).getTime()) < 7 * 86400000);
    const prev7 = txs.filter(t => { const d = Date.now() - new Date(t.date).getTime(); return d >= 7 * 86400000 && d < 14 * 86400000; });
    if (last7.length > 0 && prev7.length > 0) {
      const thisWeek = last7.reduce((s, t) => s + t.amount, 0);
      const lastWeek = prev7.reduce((s, t) => s + t.amount, 0);
      const pctChange = ((thisWeek - lastWeek) / lastWeek * 100).toFixed(0);
      patterns.push((pctChange >= 0 ? '📈' : '📉') + ' Spending this week: ' + (pctChange >= 0 ? '+' : '') + pctChange + '% vs last week');
    }
  }

  // Health patterns
  const days = Object.keys(S.passiveData).sort().slice(-7);
  if (days.length >= 3) {
    const sleeps = days.map(d => S.passiveData[d].sleep).filter(Boolean);
    if (sleeps.length > 0) {
      const avgSleep = (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1);
      patterns.push('😴 Average sleep: ' + avgSleep + 'h over last ' + sleeps.length + ' days');
    }
    const steps = days.map(d => S.passiveData[d].steps).filter(Boolean);
    if (steps.length > 0) {
      const avgSteps = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length);
      patterns.push('🚶 Average steps: ' + avgSteps.toLocaleString() + '/day');
    }
  }

  // Check-in patterns
  const ciDays = Object.keys(S.checkins).length;
  if (ciDays > 0) {
    const totalCI = Object.values(S.checkins).reduce((s, d) => s + Object.keys(d).length, 0);
    patterns.push('✅ ' + totalCI + ' check-ins across ' + ciDays + ' days');
  }

  if (patterns.length === 0) {
    return { type: 'text', text: 'I don\'t have enough data to show patterns yet. Try:\n• Completing some check-ins from Home\n• Logging a few transactions\n• Syncing your health data\n\nOnce I have 3+ days of data, I\'ll spot trends!' };
  }

  return {
    type: 'patterns',
    patterns: patterns,
    text: 'Based on your data so far. Keep logging for deeper insights!'
  };
}

function generateSummaryResponse() {
  const today = new Date().toDateString();
  const health = S.passiveData[today];
  const todayCI = S.checkins[today];
  const todayTx = (S.transactions || []).filter(t => new Date(t.date).toDateString() === today);

  let text = '📋 **Today\'s Summary**\n\n';

  if (health) {
    text += '🏥 Health: ';
    if (health.sleep) text += health.sleep + 'h sleep, ';
    if (health.steps) text += health.steps.toLocaleString() + ' steps, ';
    if (health.screenTime) text += Math.floor(health.screenTime / 60) + 'h ' + (health.screenTime % 60) + 'm screen\n';
    if (health.score) text += '⚡ Score: ' + health.score + '/100\n';
  } else {
    text += '🏥 Health: Not synced yet\n';
  }

  text += '\n';
  if (todayCI) {
    const periods = Object.keys(todayCI);
    text += '✅ Check-ins: ' + periods.length + '/4 (' + periods.join(', ') + ')\n';
  } else {
    text += '✅ Check-ins: None today\n';
  }

  text += '\n';
  if (todayTx.length > 0) {
    const total = todayTx.reduce((s, t) => s + t.amount, 0);
    text += '💸 Spending: ' + S.currency + total.toFixed(2) + ' across ' + todayTx.length + ' transactions\n';
  } else {
    text += '💸 Spending: Nothing logged today\n';
  }

  text += '\n🔥 Streak: ' + (S.streak || 0) + ' days | ⚡ XP: ' + (S.totalXp || 0) + ' | Level ' + (S.level || 1);

  return { type: 'text', text: text };
}

function generateSpendResponse() {
  const txs = S.transactions || [];
  if (txs.length === 0) {
    return { type: 'text', text: 'No transactions logged yet! You can:\n• Tap the spend categories on Home\n• Upload a receipt photo\n• Send me a screenshot of your bank app\n• Just type "spent $20 on lunch"' };
  }

  const today = new Date().toDateString();
  const todayTx = txs.filter(t => new Date(t.date).toDateString() === today);
  const weekTx = txs.filter(t => (Date.now() - new Date(t.date).getTime()) < 7 * 86400000);

  let text = '💰 Spending Overview\n\n';

  if (todayTx.length > 0) {
    const total = todayTx.reduce((s, t) => s + t.amount, 0);
    text += 'Today: ' + S.currency + total.toFixed(2) + ' (' + todayTx.length + ' transactions)\n';
  } else {
    text += 'Today: Nothing logged\n';
  }

  if (weekTx.length > 0) {
    const weekTotal = weekTx.reduce((s, t) => s + t.amount, 0);
    text += 'This week: ' + S.currency + weekTotal.toFixed(2) + ' (' + weekTx.length + ' transactions)\n';
  }

  text += 'All time: ' + S.currency + txs.reduce((s, t) => s + t.amount, 0).toFixed(2) + ' (' + txs.length + ' total)\n';
  text += '\nWant me to show patterns? Ask "show patterns".';

  return { type: 'text', text: text };
}

function generateHealthResponse() {
  const days = Object.keys(S.passiveData).sort().slice(-7);
  if (days.length === 0) {
    return { type: 'text', text: 'No health data synced yet. Go to Home and tap the health data strip to sync your sleep, steps, and screen time!' };
  }

  let text = '🏥 Health Overview (last ' + days.length + ' days)\n\n';
  const sleeps = days.map(d => S.passiveData[d].sleep).filter(Boolean);
  const steps = days.map(d => S.passiveData[d].steps).filter(Boolean);
  const screens = days.map(d => S.passiveData[d].screenTime).filter(Boolean);
  const scores = days.map(d => S.passiveData[d].score).filter(Boolean);

  if (sleeps.length) text += '😴 Sleep avg: ' + (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) + 'h\n';
  if (steps.length) text += '🚶 Steps avg: ' + Math.round(steps.reduce((a, b) => a + b, 0) / steps.length).toLocaleString() + '/day\n';
  if (screens.length) text += '📱 Screen avg: ' + (screens.reduce((a, b) => a + b, 0) / screens.length / 60).toFixed(1) + 'h/day\n';
  if (scores.length) text += '⚡ Score avg: ' + Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '/100\n';

  text += '\nKeep syncing daily for better patterns!';
  return { type: 'text', text: text };
}

/* ── ASSISTANT: Screenshot Upload ─────────────────── */
function handleAssistantScreenshot(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = function(e) {
    const src = e.target.result;
    // Add user image message
    addAstMessage('user', 'image', { src: src, text: 'Uploaded a screenshot' });

    // Show typing
    showAstTyping();

    // Simulate processing
    setTimeout(() => {
      hideAstTyping();
      // Extract fake transactions from "screenshot"
      const extracted = simulateScreenshotExtraction();
      addAstMessage('ai', 'transactions', {
        transactions: extracted,
        text: 'I found ' + extracted.length + ' transactions in your screenshot. They\'ve been added to your spending log.'
      });
      // Log them
      extracted.forEach(tx => {
        S.transactions.push({ amount: tx.amount, desc: tx.name, cat: tx.cat || 'Other', emoji: tx.emoji, date: new Date().toISOString() });
      });
      S.assistantUploads.push({ type: 'screenshot', date: new Date().toISOString(), count: extracted.length });
      saveState();
      updateTodaySpendLog();
      grantXP(25, 'screenshot upload');
    }, 1500 + Math.random() * 1000);
  };
  reader.readAsDataURL(file);
}

function simulateScreenshotExtraction() {
  // Simulate extracting transactions from a bank screenshot
  const possible = [
    { name: 'Starbucks', emoji: '☕', amount: 5.50, cat: 'Coffee' },
    { name: 'Uber Eats', emoji: '🍕', amount: 18.99, cat: 'Food' },
    { name: 'Amazon', emoji: '🛍', amount: 32.47, cat: 'Online' },
    { name: 'Netflix', emoji: '📱', amount: 15.99, cat: 'Apps/Subs' },
    { name: 'Shell Gas', emoji: '🚗', amount: 45.00, cat: 'Transport' },
    { name: 'Whole Foods', emoji: '🛒', amount: 67.82, cat: 'Groceries' },
    { name: 'Spotify', emoji: '📱', amount: 9.99, cat: 'Apps/Subs' },
    { name: 'Gym membership', emoji: '🏃', amount: 29.99, cat: 'Other' },
    { name: 'Zara', emoji: '🛍', amount: 54.99, cat: 'Online' },
    { name: 'McDonald\'s', emoji: '🍕', amount: 8.49, cat: 'Food' },
  ];
  // Pick 2-4 random ones
  const count = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...possible].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(t => ({ ...t, amount: +(t.amount * (0.8 + Math.random() * 0.4)).toFixed(2) }));
}

/* ── ASSISTANT: File Upload ───────────────────────── */
function handleAssistantFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = '';

  const sizeStr = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : (file.size / 1024).toFixed(0) + ' KB';

  // Add user file message
  addAstMessage('user', 'file', { fileName: file.name, fileSize: sizeStr, text: '' });

  showAstTyping();

  // Read and process
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(e) {
      setTimeout(() => {
        hideAstTyping();
        const extracted = simulateScreenshotExtraction();
        addAstMessage('ai', 'transactions', {
          transactions: extracted,
          text: 'Processed ' + file.name + ' — found ' + extracted.length + ' transactions.'
        });
        extracted.forEach(tx => {
          S.transactions.push({ amount: tx.amount, desc: tx.name, cat: tx.cat || 'Other', emoji: tx.emoji, date: new Date().toISOString() });
        });
        saveState();
        updateTodaySpendLog();
        grantXP(25, 'file upload');
      }, 2000);
    };
    reader.readAsDataURL(file);
  } else {
    // CSV/PDF/etc
    setTimeout(() => {
      hideAstTyping();
      const extracted = simulateCSVExtraction(file.name);
      addAstMessage('ai', 'transactions', {
        transactions: extracted,
        text: 'Parsed ' + file.name + ' — extracted ' + extracted.length + ' transactions. All logged to your spending data.'
      });
      extracted.forEach(tx => {
        S.transactions.push({ amount: tx.amount, desc: tx.name, cat: tx.cat || 'Other', emoji: tx.emoji, date: new Date().toISOString() });
      });
      S.assistantUploads.push({ type: 'file', date: new Date().toISOString(), name: file.name, count: extracted.length });
      saveState();
      updateTodaySpendLog();
      grantXP(40, 'statement upload');
    }, 2500);
  }
}

function simulateCSVExtraction(fileName) {
  const items = [
    { name: 'Monthly rent', emoji: '🏠', amount: 1200, cat: 'Other' },
    { name: 'Electric bill', emoji: '⚡', amount: 85.50, cat: 'Other' },
    { name: 'Internet', emoji: '📱', amount: 49.99, cat: 'Apps/Subs' },
    { name: 'Grocery run', emoji: '🛒', amount: 142.35, cat: 'Groceries' },
    { name: 'Dining out', emoji: '🍕', amount: 67.80, cat: 'Food' },
    { name: 'Fuel', emoji: '🚗', amount: 55.00, cat: 'Transport' },
    { name: 'Clothing store', emoji: '🛍', amount: 89.99, cat: 'Online' },
    { name: 'Coffee shops', emoji: '☕', amount: 23.50, cat: 'Coffee' },
  ];
  const count = 4 + Math.floor(Math.random() * 4);
  return [...items].sort(() => 0.5 - Math.random()).slice(0, count).map(t => ({ ...t, amount: +(t.amount * (0.7 + Math.random() * 0.6)).toFixed(2) }));
}

/* ── ASSISTANT: Voice Notes ───────────────────────── */
function toggleAssistantVoice() {
  const btn = document.getElementById('ast-voice-btn');
  if (!btn) return;

  if (astRecording) {
    stopAssistantVoice();
    return;
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    addAstMessage('ai', 'text', { text: 'Voice recognition isn\'t supported in this browser. Try Chrome on Android or Safari on iOS.' });
    return;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  astVoiceRec = new SpeechRec();
  astVoiceRec.continuous = true;
  astVoiceRec.interimResults = false;
  astVoiceRec.lang = 'en-US';

  astRecording = true;
  astRecordStart = Date.now();
  btn.classList.add('recording');
  btn.textContent = '⏹';

  let transcript = '';
  astVoiceRec.onresult = function(e) {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' ';
    }
  };
  astVoiceRec.onerror = function() { stopAssistantVoice(); };
  astVoiceRec.onend = function() {
    if (astRecording) processVoiceNote(transcript.trim());
  };
  astVoiceRec.start();

  // Auto-stop after 60 seconds
  setTimeout(() => { if (astRecording) stopAssistantVoice(); }, 60000);
}

function stopAssistantVoice() {
  astRecording = false;
  const btn = document.getElementById('ast-voice-btn');
  if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙'; }
  if (astVoiceRec) { try { astVoiceRec.stop(); } catch(e){} }
}

function processVoiceNote(transcript) {
  const duration = Math.round((Date.now() - astRecordStart) / 1000);
  const durStr = Math.floor(duration / 60) + ':' + String(duration % 60).padStart(2, '0');

  // Add voice note message
  addAstMessage('user', 'voice', {
    duration: durStr,
    text: transcript || '(no speech detected)'
  });

  if (!transcript) {
    addAstMessage('ai', 'text', { text: 'I couldn\'t pick up any speech. Try speaking closer to your phone, or type your message instead.' });
    return;
  }

  // Process the transcript as a regular message
  showAstTyping();
  setTimeout(() => {
    hideAstTyping();
    const response = generateAssistantResponse(transcript);
    if (response.type === 'patterns') {
      addAstMessage('ai', 'patterns', response);
    } else if (response.type === 'transactions') {
      addAstMessage('ai', 'transactions', response);
    } else {
      addAstMessage('ai', 'text', { text: response.text });
    }
  }, 800 + Math.random() * 800);
}

/* ── ASSISTANT: Quick Actions ─────────────────────── */
function astQuickAction(action) {
  if (action === 'patterns') {
    addAstMessage('user', 'text', { text: 'Show me my patterns' });
    showAstTyping();
    setTimeout(() => {
      hideAstTyping();
      const result = generatePatternAnalysis();
      if (result.type === 'patterns') addAstMessage('ai', 'patterns', result);
      else addAstMessage('ai', 'text', { text: result.text });
    }, 800);
  } else if (action === 'summary') {
    addAstMessage('user', 'text', { text: 'Give me a summary' });
    showAstTyping();
    setTimeout(() => {
      hideAstTyping();
      const result = generateSummaryResponse();
      addAstMessage('ai', 'text', { text: result.text });
    }, 800);
  }
}

/* ── ASSISTANT: WhatsApp Connect ──────────────────── */
function openWhatsAppConnect() {
  const msg = encodeURIComponent('Hey! I want to connect my Imperium OS app. My user ID: ' + (S.user || 'guest') + '. Send me transaction screenshots and I\'ll log them!');
  const waURL = 'https://wa.me/?text=' + msg;
  // Show info in chat
  addAstMessage('ai', 'text', {
    text: '📱 WhatsApp Integration\n\nTo connect via WhatsApp:\n\n1. Save the Imperium AI number\n2. Send "Connect" to start\n3. Then just forward screenshots, files, or voice notes\n\nThe WhatsApp bot will sync everything back to this app automatically.\n\n🔗 Opening WhatsApp…'
  });
  // Open WhatsApp deep link
  setTimeout(() => {
    window.open(waURL, '_blank');
  }, 1000);
}

function clearAssistantChat() {
  if (!confirm('Clear all AI assistant messages?')) return;
  S.assistantMessages = [];
  saveState();
  initAssistant();
  showToast('Chat cleared', 'success');
}

function formatFileSize(bytes) {
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

/* ── BOOT ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => runBoot());

/* ═══════════════════════════════════════════════════════
   PRO UPGRADE SCREEN
   ═══════════════════════════════════════════════════════ */

// Simulate spots remaining (deterministic based on date so it feels real)
const PRO_BASE_SPOTS = 47;

function getProSpots() {
  // Tick down 1 spot per day from launch date
  const launch = new Date('2026-04-01').getTime();
  const daysPassed = Math.floor((Date.now() - launch) / 86400000);
  return Math.max(3, PRO_BASE_SPOTS - daysPassed);
}

function openPro() {
  const spots = getProSpots();
  const spotsEl = document.getElementById('pro-spots-left');
  if (spotsEl) spotsEl.textContent = spots + ' spots left';
  const earlyEl = document.getElementById('auth-early-spots');
  if (earlyEl) earlyEl.textContent = spots + ' spots left';

  // Remember where we came from so closePro() can return here
  S._proReturnScreen = S.currentScreen || 'screen-auth';

  // Hide waitlist confirm
  const wlConfirm = document.getElementById('pro-waitlist-confirm');
  if (wlConfirm) wlConfirm.classList.add('hidden');

  // Navigate to pro screen (keeps back-stack feel)
  navigateTo('screen-pro');
  // Hide bottom nav on pro screen
  const bn = document.getElementById('bottom-nav');
  if (bn) bn.classList.add('hidden');
}

function closePro() {
  // Return to the exact screen that triggered openPro()
  const target = S._proReturnScreen || 'screen-auth';
  S._proReturnScreen = null;
  // Only restore bottom nav if we're going back into the app (not auth)
  if (S.user && S.onboarded && target !== 'screen-auth') {
    const bn = document.getElementById('bottom-nav');
    if (bn) bn.classList.remove('hidden');
  }
  navigateTo(target);
}

let proWaitlistTier = '';

function joinWaitlist(tier) {
  proWaitlistTier = tier;
  const wlConfirm = document.getElementById('pro-waitlist-confirm');
  const tierEl = document.getElementById('pro-wl-tier');
  if (tierEl) tierEl.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (wlConfirm) {
    wlConfirm.classList.remove('hidden');
    wlConfirm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Save waitlist join in state
  if (!S.proWaitlist) S.proWaitlist = [];
  if (!S.proWaitlist.includes(tier)) S.proWaitlist.push(tier);
  saveState();
  showToast('You\'re on the ' + tier + ' waitlist! 🎉', 'success');
}

/* ═══════════════════════════════════════════════════════
   CONTACT / FEEDBACK SCREEN
   ═══════════════════════════════════════════════════════ */

let contactRating = 0;
let contactType = 'feedback';
let votedFeatures = [];

function initContact() {
  // Restore voted features
  if (S.votedFeatures) votedFeatures = S.votedFeatures;
  // Update voted UI
  votedFeatures.forEach(f => {
    const item = document.querySelector('.contact-vote-item[onclick*="' + f + '"]');
    if (item) item.classList.add('cvote-voted');
  });
  // Restore previous reaction if any
  if (S.lastRating) {
    contactRating = S.lastRating;
    document.querySelectorAll('.contact-react').forEach(b => {
      b.classList.toggle('selected', parseInt(b.dataset.val) === contactRating);
    });
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
  if (!msg.trim() && contactRating === 0) {
    showToast('Add a rating or message first', 'error');
    return;
  }

  // Store locally
  if (!S.feedback) S.feedback = [];
  S.feedback.push({
    type: contactType,
    rating: contactRating,
    msg: msg.trim(),
    email: email.trim(),
    ts: Date.now()
  });
  saveState();

  // Clear form
  const msgEl = document.getElementById('contact-msg');
  const emailEl = document.getElementById('contact-email');
  if (msgEl) msgEl.value = '';
  if (emailEl) emailEl.value = '';

  showToast('Message sent — thank you! 🙏', 'success');
  grantXP(10, 'feedback submitted');
}

function voteFeature(el, feature) {
  if (votedFeatures.includes(feature)) {
    showToast('Already voted!', 'error');
    return;
  }
  votedFeatures.push(feature);
  if (!S.votedFeatures) S.votedFeatures = [];
  S.votedFeatures = votedFeatures;
  saveState();

  el.classList.add('cvote-voted');
  // Animate bar up slightly
  const bar = el.querySelector('.cvote-bar');
  const countEl = el.querySelector('.cvote-count');
  if (bar) {
    const current = parseInt(bar.style.width) || 50;
    const newVal = Math.min(current + Math.floor(Math.random() * 3) + 1, 99);
    bar.style.width = newVal + '%';
    if (countEl) countEl.textContent = newVal + '%';
  }
  showToast('Vote recorded! 🗳', 'success');
  grantXP(5, 'feature voted');
}
