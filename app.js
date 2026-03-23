/* ===================================================
   BRAINANCE — app.js
   Full SPA logic: navigation, onboarding, chat,
   scoring, missions, progress charts, profile
=================================================== */

'use strict';

// ─── STATE ────────────────────────────────────────
const STATE = {
  userType: null,
  userGoal: null,
  coins: 0,
  streak: 0,
  level: 1,
  weeklyScores: [0, 0, 0, 0, 0, 0, 0],
  weeklyMoney: [0, 0, 0, 0, 0, 0, 0],
  pillars: { speed: 0, reasoning: 0, focus: 0, knowledge: 0 },
  todayScore: null,
  missionsDone: { speed: false, reasoning: false, focus: false, knowledge: false },
  reviewAnswers: {},
  analysisResult: null,
  lastReviewDate: null,
  totalMissionsCompleted: 0,
};

let scoreChart = null;
let moneyChart = null;

// ─── PERSISTED STORAGE ────────────────────────────
function saveState() {
  try { localStorage.setItem('brainance_state', JSON.stringify(STATE)); } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('brainance_state');
    if (raw) Object.assign(STATE, JSON.parse(raw));
  } catch (_) {}
}

// ─── BOOT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  injectSvgGradient();
  setGreeting();
  setScoreDate();

  if (STATE.userType && STATE.userGoal) {
    showMainApp();
  }
  // else onboarding is already visible by default
});

function injectSvgGradient() {
  // Inject SVG defs for ring gradient
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.querySelector('.ring-svg');
  if (!svg) return;
  const defs = document.createElementNS(ns, 'defs');
  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', 'ringGrad');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '0%');
  const s1 = document.createElementNS(ns, 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#3b82f6');
  const s2 = document.createElementNS(ns, 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#d4af37');
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad);
  svg.prepend(defs);
  // Now set stroke to use gradient
  const ring = document.getElementById('score-ring-circle');
  if (ring) ring.setAttribute('stroke', 'url(#ringGrad)');
}

// ─── NAVIGATION ───────────────────────────────────
const NAV_SCREENS = ['screen-home', 'screen-missions', 'screen-results', 'screen-progress', 'screen-profile'];
const NAV_IDS     = ['nav-home', 'nav-missions', 'nav-results', 'nav-progress', 'nav-profile'];
let currentScreen = 'screen-onboarding';

function navigateTo(screenId) {
  const prev = document.getElementById(currentScreen);
  const next = document.getElementById(screenId);
  if (!next || screenId === currentScreen) return;

  if (prev) { prev.classList.add('exit'); setTimeout(() => { prev.classList.remove('active', 'exit'); }, 350); }
  next.classList.add('active');
  currentScreen = screenId;

  // Update nav active state
  NAV_SCREENS.forEach((id, i) => {
    const btn = document.getElementById(NAV_IDS[i]);
    if (btn) btn.classList.toggle('active', id === screenId);
  });

  // Screen-specific init
  if (screenId === 'screen-home')     initHomeDashboard();
  if (screenId === 'screen-missions') initMissions();
  if (screenId === 'screen-progress') initProgress();
  if (screenId === 'screen-profile')  initProfile();
  if (screenId === 'screen-review')   startReview();
  if (screenId === 'screen-results')  initResults();
}

// ─── ONBOARDING ───────────────────────────────────
function selectRole(btn) {
  document.querySelectorAll('#ob-step-1 .ob-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.userType = btn.dataset.value;
  document.getElementById('ob-next-1').classList.remove('hidden');
}

function selectGoal(btn) {
  document.querySelectorAll('#ob-step-2 .ob-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.userGoal = btn.dataset.value;
  document.getElementById('ob-next-2').classList.remove('hidden');
}

function goToObStep2() {
  document.getElementById('ob-step-1').classList.remove('active');
  document.getElementById('ob-step-2').classList.add('active');
}

function finishOnboarding() {
  STATE.streak = 1;
  saveState();
  showMainApp();
}

function showMainApp() {
  document.getElementById('screen-onboarding').classList.remove('active');
  document.getElementById('bottom-nav').classList.add('visible');
  navigateTo('screen-home');
}

// ─── GREETING ─────────────────────────────────────
function setGreeting() {
  const h = new Date().getHours();
  let g = 'Good evening';
  if (h < 12) g = 'Good morning';
  else if (h < 17) g = 'Good afternoon';
  const el = document.getElementById('greeting-text');
  if (el) el.textContent = g;
}

function setScoreDate() {
  const el = document.getElementById('score-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── HOME DASHBOARD ───────────────────────────────
function initHomeDashboard() {
  const score = STATE.todayScore ?? '--';
  document.getElementById('daily-score').textContent = score;
  animateRing(typeof score === 'number' ? score : 0);

  const p = STATE.pillars;
  animatePillar('speed',     p.speed);
  animatePillar('reasoning', p.reasoning);
  animatePillar('focus',     p.focus);
  animatePillar('knowledge', p.knowledge);

  document.getElementById('coin-count').textContent     = STATE.coins;
  document.getElementById('level-badge').textContent    = `Lv ${STATE.level}`;
  document.getElementById('streak-count').textContent   = STATE.streak;
  const done = Object.values(STATE.missionsDone).filter(Boolean).length;
  document.getElementById('missions-done').textContent  = `${done}/4`;
  const avg = calcWeeklyAvg();
  document.getElementById('weekly-avg').textContent     = avg > 0 ? avg : '--';
}

function animateRing(score) {
  const circle = document.getElementById('score-ring-circle');
  if (!circle) return;
  const c = 2 * Math.PI * 52; // ~326.7
  const offset = c - (score / 100) * c;
  circle.style.strokeDasharray  = c;
  circle.style.strokeDashoffset = c; // start full
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      circle.style.strokeDashoffset = offset;
    });
  });
}

function animatePillar(pillar, value) {
  const bar = document.getElementById(`pillar-${pillar}`);
  const val = document.getElementById(`pillar-${pillar}-val`);
  if (bar) { bar.style.width = '0%'; setTimeout(() => { bar.style.width = value + '%'; }, 50); }
  if (val) val.textContent = value;
}

function calcWeeklyAvg() {
  const scores = STATE.weeklyScores.filter(s => s > 0);
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── DAILY REVIEW (CHAT) ──────────────────────────
const REVIEW_QUESTIONS = [
  {
    id: 'actions',
    text: "What were your key actions today? (e.g. meetings, work done, outreach)",
    type: 'text',
  },
  {
    id: 'avoided',
    text: "What tasks did you avoid or procrastinate on?",
    type: 'text',
  },
  {
    id: 'money_spent',
    text: "How much money did you spend today? (type an amount or '0')",
    type: 'text',
  },
  {
    id: 'money_earned',
    text: "How much money did you earn or generate today?",
    type: 'text',
  },
  {
    id: 'time_wasted',
    text: "How much time was wasted on low-value activities? (hours)",
    type: 'options',
    options: ['None', '< 1 hour', '1–2 hours', '3+ hours'],
  },
  {
    id: 'missed_opportunities',
    text: "Any opportunities you noticed but didn't act on?",
    type: 'text',
  },
  {
    id: 'discipline',
    text: "How would you rate your discipline today?",
    type: 'options',
    options: ['🔥 High', '⚡ Medium', '😔 Low'],
  },
];

let chatStep = 0;
let chatAnswers = {};

function startReview() {
  chatStep = 0;
  chatAnswers = {};
  STATE.reviewAnswers = {};
  const container = document.getElementById('chat-messages');
  if (container) container.innerHTML = '';
  setTimeout(() => askQuestion(), 500);
}

function askQuestion() {
  if (chatStep >= REVIEW_QUESTIONS.length) {
    finishReview();
    return;
  }
  const q = REVIEW_QUESTIONS[chatStep];
  showTypingThenBubble(q.text, () => {
    showInputForQuestion(q);
  });
}

function showTypingThenBubble(text, callback) {
  const container = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  container.appendChild(typing);
  scrollChatBottom();

  setTimeout(() => {
    container.removeChild(typing);
    addBubble(text, 'ai');
    if (callback) callback();
  }, 1000 + Math.random() * 500);
}

function addBubble(text, type) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble bubble-${type}`;
  bubble.textContent = text;
  container.appendChild(bubble);
  scrollChatBottom();
}

function scrollChatBottom() {
  const c = document.getElementById('chat-messages');
  if (c) setTimeout(() => { c.scrollTop = c.scrollHeight; }, 50);
}

function showInputForQuestion(q) {
  const optionsWrap = document.getElementById('chat-options');
  const textRow     = document.getElementById('chat-text-row');
  const textField   = document.getElementById('chat-text-field');

  if (q.type === 'options') {
    optionsWrap.innerHTML = '';
    optionsWrap.classList.remove('hidden');
    if (textRow) textRow.classList.add('hidden');
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chat-option-btn';
      btn.textContent = opt;
      btn.onclick = () => submitAnswer(opt);
      optionsWrap.appendChild(btn);
    });
  } else {
    optionsWrap.innerHTML = '';
    optionsWrap.classList.add('hidden');
    const chatTextInput = document.getElementById('chat-text-input');
    if (chatTextInput) chatTextInput.classList.remove('hidden');
    const chatTextRowEl = document.getElementById('chat-text-row');
    if (chatTextRowEl) chatTextRowEl.classList.remove('hidden');

    const textInputEl = document.getElementById('chat-text-field');
    if (textInputEl) {
      textInputEl.value = '';
      textInputEl.focus();
      textInputEl.onkeydown = (e) => { if (e.key === 'Enter') sendTextAnswer(); };
    }
  }
}

function sendTextAnswer() {
  const field = document.getElementById('chat-text-field');
  if (!field) return;
  const val = field.value.trim();
  if (!val) return;
  submitAnswer(val);
  field.value = '';
}

function submitAnswer(answer) {
  const q = REVIEW_QUESTIONS[chatStep];
  chatAnswers[q.id] = answer;
  addBubble(answer, 'user');

  // Hide inputs
  const optionsWrap = document.getElementById('chat-options');
  const chatTextRowEl = document.getElementById('chat-text-row');
  if (optionsWrap) { optionsWrap.innerHTML = ''; optionsWrap.classList.add('hidden'); }
  if (chatTextRowEl) chatTextRowEl.classList.add('hidden');

  chatStep++;
  setTimeout(() => askQuestion(), 500);
}

function finishReview() {
  STATE.reviewAnswers = chatAnswers;
  showTypingThenBubble("Great work! I'm analysing your day now…", () => {
    setTimeout(() => {
      const result = analyseDay(chatAnswers);
      STATE.analysisResult = result;
      applyResultToState(result);
      saveState();

      addBubble(`Your Intelligence Score today: ${result.score}/100 ⚡`, 'ai');
      setTimeout(() => {
        addBubble("Your full analysis is ready. Tap below to see your insights.", 'ai');
        // Show "View Results" button in chat
        const optionsWrap = document.getElementById('chat-options');
        optionsWrap.innerHTML = '';
        optionsWrap.classList.remove('hidden');
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.style.background = 'linear-gradient(135deg,#3b82f6,#4f46e5)';
        btn.style.border = 'none';
        btn.style.color = 'white';
        btn.style.fontWeight = '700';
        btn.textContent = '📊 View My Analysis →';
        btn.onclick = () => navigateTo('screen-results');
        optionsWrap.appendChild(btn);
      }, 1200);
    }, 800);
  });
}

// ─── AI ANALYSIS ENGINE ───────────────────────────
function analyseDay(a) {
  const discipline = (a.discipline || '').toLowerCase();
  const timeWasted = a.time_wasted || 'None';
  const avoided    = a.avoided || 'nothing';
  const actions    = a.actions || 'nothing';
  const missed     = a.missed_opportunities || 'none';
  const spent      = parseFloat(a.money_spent) || 0;
  const earned     = parseFloat(a.money_earned) || 0;
  const userType   = STATE.userType || 'professional';
  const goal       = STATE.userGoal || 'success';

  // Score calculation
  let score = 50;
  if (discipline.includes('high'))   score += 20;
  if (discipline.includes('medium')) score += 10;
  if (discipline.includes('low'))    score -= 10;
  if (timeWasted === 'None')         score += 10;
  if (timeWasted === '< 1 hour')     score += 5;
  if (timeWasted === '3+ hours')     score -= 15;
  if (avoided !== 'nothing' && avoided.length > 3) score -= 10;
  if (earned > spent)                score += 10;
  if (missed !== 'none' && missed.length > 3) score -= 5;
  score = Math.max(10, Math.min(100, score));

  // Pillar scores
  const speed     = calcPillarScore(discipline, timeWasted, actions, 'speed');
  const reasoning = calcPillarScore(discipline, timeWasted, actions, 'reasoning');
  const focus     = calcPillarScore(discipline, timeWasted, actions, 'focus');
  const knowledge = calcPillarScore(discipline, timeWasted, actions, 'knowledge');

  // Analysis text
  const mistake  = generateMistake(avoided, timeWasted, discipline, userType);
  const money    = generateMoneyImpact(spent, earned, missed, userType, goal);
  const thinking = generateThinkingPattern(avoided, discipline, timeWasted);
  const missedOpp= generateMissedOpp(missed, userType, goal);
  const fixes    = generateFixes(avoided, timeWasted, discipline, userType, goal);
  const missions = generateMissions(userType, goal, score);

  return { score, speed, reasoning, focus, knowledge, mistake, money, thinking, missedOpp, fixes, missions };
}

function calcPillarScore(discipline, timeWasted, actions, pillar) {
  let base = 50;
  if (discipline.includes('high'))   base += 20;
  if (discipline.includes('medium')) base += 10;
  if (discipline.includes('low'))    base -= 15;
  if (timeWasted === 'None')         base += 10;
  if (timeWasted === '3+ hours')     base -= 20;

  // Pillar-specific tweaks
  const noise = Math.floor(Math.random() * 15) - 7;
  return Math.max(5, Math.min(100, base + noise));
}

const MISTAKE_TEMPLATES = [
  (av, tw) => `You avoided "${av}" while wasting ${tw} on low-value activity. That's a direct discipline leak.`,
  (av)     => `"${av}" keeps getting pushed. Every day it's delayed, the opportunity cost compounds.`,
  (_,  tw) => `${tw} of wasted time is the real problem — not lack of effort, but lack of intentionality.`,
];

const MONEY_TEMPLATES = [
  (sp, ea) => ea > 0 ? `Net day: +₹${ea - sp > 0 ? (ea - sp).toFixed(0) : 0}. But missed opportunities could represent 3–5x more.`
                    : `₹${sp} spent, ₹0 earned today. Every day without income is a compounding deficit.`,
  (sp, ea, mi) => `Missed opportunity in "${mi}" alone could outweigh today's ₹${sp} spend.`,
];

const THINKING_TEMPLATES = [
  'Avoidance loop — you delay difficult tasks until urgency forces action. This kills leverage.',
  'Comfort-seeking bias — prioritising what feels manageable over what actually moves the needle.',
  'Reactive execution — responding to the day rather than designing it. You\'re playing defence.',
  'Perfectionism paralysis — waiting for the right moment instead of taking imperfect action now.',
];

const MISSED_OPP_TEMPLATES = [
  (mi) => `"${mi}" — this is your highest-leverage untapped point right now. One action here compounds.`,
  (mi, g) => `For a ${g} goal, ignoring "${mi}" is leaving the biggest lever unpulled.`,
];

const FIX_TEMPLATES = [
  ['Block 2 hours tomorrow morning exclusively for your avoided task — no distractions, no meetings.',
   'Write the outcome you want from tomorrow in one sentence before you sleep.',
   'Set a $0 spending limit unless it directly generates income.'],
  ['Identify your single highest-value task and do it before 10 AM.',
   'Delete or silence 1 app that killed your focus today.',
   'Convert one missed opportunity into a scheduled action with a deadline.'],
  ['Use a 25-min timer sprint to tackle your most avoided task first thing.',
   'Track every rupee tomorrow — awareness alone changes behaviour.',
   'Replace 30 mins of low-value time with reading directly related to your goal.'],
];

function generateMistake(avoided, timeWasted, discipline, userType) {
  const i = Math.floor(Math.random() * MISTAKE_TEMPLATES.length);
  return MISTAKE_TEMPLATES[i](avoided, timeWasted, discipline, userType);
}

function generateMoneyImpact(spent, earned, missed, userType, goal) {
  if (missed && missed.length > 3) {
    const i = Math.floor(Math.random() * MONEY_TEMPLATES.length);
    return MONEY_TEMPLATES[i](spent, earned, missed);
  }
  return earned > 0
    ? `Net position: ₹${earned} earned, ₹${spent} spent. Focus on scaling what generated that ₹${earned}.`
    : `₹${spent} spent, no income recorded. For a ${goal} goal, days like this have a hidden cost.`;
}

function generateThinkingPattern(avoided, discipline, timeWasted) {
  const idx = discipline.includes('low') ? 0 : discipline.includes('medium') ? 2 : 1;
  return THINKING_TEMPLATES[idx % THINKING_TEMPLATES.length];
}

function generateMissedOpp(missed, userType, goal) {
  if (!missed || missed.length < 3) return `No missed opportunity flagged, but ask yourself: what 1 action would move your ${goal} goal by 10x?`;
  const i = Math.floor(Math.random() * MISSED_OPP_TEMPLATES.length);
  return MISSED_OPP_TEMPLATES[i](missed, goal);
}

function generateFixes(avoided, timeWasted, discipline, userType, goal) {
  const i = discipline.includes('low') ? 0 : discipline.includes('medium') ? 2 : 1;
  return FIX_TEMPLATES[i % FIX_TEMPLATES.length];
}

function generateMissions(userType, goal, score) {
  const pools = {
    student: {
      speed:     'Complete your top 3 study tasks before 12 PM',
      reasoning: 'Solve 5 problems without looking at solutions',
      focus:     '90-min deep study session — phone in another room',
      knowledge: 'Read 1 chapter or watch 1 educational video',
    },
    sales: {
      speed:     'Send 10 outreach messages before 11 AM',
      reasoning: 'Analyse your last 3 lost deals — find the pattern',
      focus:     'Make 20 focused calls with zero multitasking',
      knowledge: 'Learn 1 new closing technique and test it today',
    },
    business: {
      speed:     'Ship one small deliverable or decision before lunch',
      reasoning: 'Identify the single bottleneck killing your growth today',
      focus:     '2-hour no-meeting deep work block on #1 priority',
      knowledge: 'Read 20 mins of competitor or market intelligence',
    },
  };
  const type = userType in pools ? userType : 'business';
  return pools[type];
}

// ─── APPLY RESULT TO STATE ────────────────────────
function applyResultToState(result) {
  STATE.todayScore = result.score;
  STATE.pillars = {
    speed:     result.speed,
    reasoning: result.reasoning,
    focus:     result.focus,
    knowledge: result.knowledge,
  };
  // Shift weekly scores
  STATE.weeklyScores.shift();
  STATE.weeklyScores.push(result.score);
  // Update missions
  const m = result.missions;
  if (m) {
    setEl('mission-speed-task',     m.speed);
    setEl('mission-reasoning-task', m.reasoning);
    setEl('mission-focus-task',     m.focus);
    setEl('mission-knowledge-task', m.knowledge);
  }
  // Update level
  STATE.level = Math.max(1, Math.floor(calcWeeklyAvg() / 10) + 1);
  // Streak
  const today = new Date().toDateString();
  if (STATE.lastReviewDate !== today) {
    STATE.streak = (STATE.streak || 0) + 1;
    STATE.lastReviewDate = today;
  }
}

// ─── RESULTS SCREEN ───────────────────────────────
function initResults() {
  const r = STATE.analysisResult;
  if (!r) {
    // No analysis yet — show placeholder
    setEl('result-score-num', '--');
    return;
  }
  animateNumber('result-score-num', r.score, 0, 1000);
  setEl('res-mistake',  r.mistake);
  setEl('res-money',    r.money);
  setEl('res-thinking', r.thinking);
  setEl('res-missed',   r.missedOpp);

  const fixList = document.getElementById('res-fixes');
  if (fixList && r.fixes) {
    fixList.innerHTML = r.fixes.map(f => `<li>${f}</li>`).join('');
  }

  // Trend icon
  const trend = document.getElementById('result-trend');
  if (trend) {
    const avg = calcWeeklyAvg();
    trend.textContent = r.score >= avg ? '📈' : '📉';
  }
}

// ─── MISSIONS SCREEN ──────────────────────────────
function initMissions() {
  document.getElementById('missions-coin-count').textContent = STATE.coins;

  // Restore mission tasks from analysis
  const m = STATE.analysisResult?.missions;
  if (m) {
    setEl('mission-speed-task',     m.speed);
    setEl('mission-reasoning-task', m.reasoning);
    setEl('mission-focus-task',     m.focus);
    setEl('mission-knowledge-task', m.knowledge);
  }

  // Restore checked state
  ['speed','reasoning','focus','knowledge'].forEach(p => {
    const item  = document.getElementById(`mission-${p}`);
    const check = document.getElementById(`check-${p}`);
    if (STATE.missionsDone[p]) {
      if (item)  item.classList.add('done');
      if (check) check.classList.add('checked');
    } else {
      if (item)  item.classList.remove('done');
      if (check) check.classList.remove('checked');
    }
  });

  checkAllMissionsDone();
}

function completeMission(pillar) {
  if (STATE.missionsDone[pillar]) return;

  STATE.missionsDone[pillar] = true;
  STATE.coins += 10;
  STATE.totalMissionsCompleted++;
  saveState();

  const item  = document.getElementById(`mission-${pillar}`);
  const check = document.getElementById(`check-${pillar}`);
  if (item)  item.classList.add('done');
  if (check) check.classList.add('checked');

  document.getElementById('missions-coin-count').textContent = STATE.coins;
  burstCoins();
  checkAllMissionsDone();
}

function checkAllMissionsDone() {
  const done = Object.values(STATE.missionsDone).every(Boolean);
  const banner = document.getElementById('bonus-banner');
  if (done && banner) {
    banner.classList.add('visible');
    if (!STATE._bonusAwarded) {
      STATE._bonusAwarded = true;
      STATE.coins += 50;
      saveState();
      document.getElementById('missions-coin-count').textContent = STATE.coins;
      setTimeout(burstCoins, 300);
    }
  }
}

function burstCoins() {
  const burst = document.getElementById('coin-burst');
  if (!burst) return;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'coin-particle';
    p.textContent = '🪙';
    const angle = (i / 8) * 2 * Math.PI;
    const r = 80 + Math.random() * 60;
    p.style.left = (cx + Math.cos(angle) * 10) + 'px';
    p.style.top  = (cy + Math.sin(angle) * 10) + 'px';
    p.style.animationDelay = (i * 0.07) + 's';
    p.style.setProperty('--tx', `${Math.cos(angle) * r}px`);
    p.style.setProperty('--ty', `${Math.sin(angle) * r - 60}px`);
    p.style.animation = `coin-fly 1.2s ease-out ${i * 0.07}s forwards`;
    burst.appendChild(p);
    setTimeout(() => { if (burst.contains(p)) burst.removeChild(p); }, 1400);
  }
}

// ─── PROGRESS SCREEN ──────────────────────────────
function initProgress() {
  const avg = calcWeeklyAvg();
  setEl('prog-streak',   STATE.streak);
  setEl('prog-avg',      avg > 0 ? avg : '--');
  setEl('prog-missions', STATE.totalMissionsCompleted);
  setEl('progress-level',  `Lv ${STATE.level}`);
  setEl('progress-coins',  STATE.coins);

  // Pillar breakdown
  const p = STATE.pillars;
  setPillarBreakdown('speed',     p.speed);
  setPillarBreakdown('reasoning', p.reasoning);
  setPillarBreakdown('focus',     p.focus);
  setPillarBreakdown('knowledge', p.knowledge);

  drawCharts();
}

function setPillarBreakdown(key, val) {
  const bar = document.getElementById(`pb-${key}`);
  const valEl = document.getElementById(`pb-${key}-val`);
  if (bar) { bar.style.width = '0%'; setTimeout(() => { bar.style.width = val + '%'; }, 100); }
  if (valEl) valEl.textContent = val;
}

function drawCharts() {
  if (typeof Chart === 'undefined') { setTimeout(drawCharts, 300); return; }

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const scores = [...STATE.weeklyScores];

  // Score Chart
  const scoreCtx = document.getElementById('score-chart');
  if (scoreCtx) {
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(scoreCtx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          data: scores,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#0a0f2c',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.4,
        }],
      },
      options: chartOptions('#3b82f6'),
    });
  }

  // Money Chart (simulated)
  const moneyData = STATE.weeklyMoney.length ? STATE.weeklyMoney : [0,0,0,0,0,0,0];
  const moneyCtx = document.getElementById('money-chart');
  if (moneyCtx) {
    if (moneyChart) moneyChart.destroy();
    moneyChart = new Chart(moneyCtx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Behaviour Score',
          data: moneyData.map(v => v || Math.floor(Math.random() * 60)),
          backgroundColor: 'rgba(212,175,55,0.3)',
          borderColor: '#d4af37',
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: chartOptions('#d4af37'),
    });
  }
}

function chartOptions(color) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(10,15,44,0.95)',
      titleColor: '#f0f4ff',
      bodyColor: '#8b96b8',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
    }},
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5578', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5578', font: { size: 10 } }, min: 0, max: 100 },
    },
  };
}

// ─── PROFILE SCREEN ───────────────────────────────
function initProfile() {
  const typeMap = { student: 'Student Agent', sales: 'Sales Warrior', business: 'Business Builder' };
  const goalMap = { money: 'Make Money', discipline: 'Build Discipline', focus: 'Master Focus' };
  const iconMap = { student: '📚', sales: '💼', business: '🚀' };

  setEl('profile-user-type', typeMap[STATE.userType] || 'Intelligence Agent');
  setEl('profile-user-goal', `Goal: ${goalMap[STATE.userGoal] || '—'}`);
  setEl('profile-level-badge', `Level ${STATE.level}`);
  setEl('profile-coins-badge', `${STATE.coins} 🪙`);
  setEl('profile-streak-badge', `${STATE.streak} 🔥 Streak`);

  const avatarEl = document.getElementById('profile-avatar-icon');
  if (avatarEl) avatarEl.textContent = iconMap[STATE.userType] || '🧠';

  // Inject footer if not already there
  if (!document.getElementById('profile-footer')) {
    const sc = document.querySelector('#screen-profile .screen-content');
    if (sc) {
      const footer = document.createElement('div');
      footer.id = 'profile-footer';
      footer.className = 'profile-footer';
      footer.innerHTML = `
        <p>Founded &amp; Owned by <strong>Sanskaar</strong></p>
        <p>Co-founded by <strong>Kashish Devnani</strong></p>
        <p class="footer-copy">© 2026 Brainance. All rights reserved.</p>
      `;
      sc.appendChild(footer);
    }
  }
}

// ─── PRO MODAL ────────────────────────────────────
function showProModal() {
  document.getElementById('pro-modal').classList.remove('hidden');
}

function closeProModal() {
  document.getElementById('pro-modal').classList.add('hidden');
}

// ─── RESET ────────────────────────────────────────
function resetApp() {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  localStorage.removeItem('brainance_state');
  location.reload();
}

// ─── UTILITIES ────────────────────────────────────
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function animateNumber(id, target, start = 0, duration = 800) {
  const el = document.getElementById(id);
  if (!el) return;
  const startTime = performance.now();
  const tick = (now) => {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * easeOut(p));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
