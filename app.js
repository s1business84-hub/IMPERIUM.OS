/* ===================================================
   IMPERIUM — app.js
   Full SPA: Auth, Onboarding, Voice Chat, AI Engine
=================================================== */

'use strict';

// ─── STATE ────────────────────────────────────────
const STATE = {
  userName: null,
  userEmail: null,
  userType: null,
  userGoal: null,
  coins: 0,
  streak: 0,
  level: 1,
  weeklyScores: [0, 0, 0, 0, 0, 0, 0],
  weeklyMoney: [0, 0, 0, 0, 0, 0, 0],
  pillars: { execution: 0, reasoning: 0, focus: 0, financial: 0 },
  todayScore: null,
  missionsDone: { execution: false, reasoning: false, focus: false, financial: false },
  reviewAnswers: {},
  analysisResult: null,
  lastReviewDate: null,
  totalMissionsCompleted: 0,
  voiceDumpText: '',
};

let scoreChart = null;
let moneyChart = null;

// ─── PERSIST ──────────────────────────────────────
function saveState() {
  try { localStorage.setItem('imperium_state', JSON.stringify(STATE)); } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('imperium_state');
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
    // Already fully onboarded — skip landing
    document.getElementById('screen-landing').classList.remove('active');
    showMainApp();
  } else if (STATE.userEmail) {
    // Has account but not onboarded
    document.getElementById('screen-landing').classList.remove('active');
    navigateTo('screen-onboarding');
  } else {
    // Show landing intro — it's the default active screen
    startLandingSequence();
  }
});

// ─── SVG GRADIENT ────────────────────────────────
function injectSvgGradient() {
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
  const ring = document.getElementById('score-ring-circle');
  if (ring) ring.setAttribute('stroke', 'url(#ringGrad)');
}

// ─── NAVIGATION ───────────────────────────────────
const NAV_SCREENS = ['screen-home', 'screen-missions', 'screen-results', 'screen-progress', 'screen-profile'];
const NAV_IDS     = ['nav-home', 'nav-missions', 'nav-results', 'nav-progress', 'nav-profile'];
let currentScreen = 'screen-auth';

function navigateTo(screenId) {
  const prev = document.getElementById(currentScreen);
  const next = document.getElementById(screenId);
  if (!next || screenId === currentScreen) return;

  if (prev) {
    prev.classList.add('exit');
    setTimeout(() => { prev.classList.remove('active', 'exit'); }, 350);
  }
  next.classList.add('active');
  currentScreen = screenId;

  NAV_SCREENS.forEach((id, i) => {
    const btn = document.getElementById(NAV_IDS[i]);
    if (btn) btn.classList.toggle('active', id === screenId);
  });

  if (screenId === 'screen-home')     initHomeDashboard();
  if (screenId === 'screen-missions') initMissions();
  if (screenId === 'screen-progress') initProgress();
  if (screenId === 'screen-profile')  initProfile();
  if (screenId === 'screen-review')   startReview();
  if (screenId === 'screen-results')  initResults();
}

// =======================================================
//  AUTH
// =======================================================

function switchAuthTab(tab) {
  ['login','signup','guest'].forEach(t => {
    const tabBtn = document.getElementById('tab-' + t);
    const form   = document.getElementById('form-' + t);
    if (tabBtn) tabBtn.classList.toggle('active',  t === tab);
    if (form)   form.classList.toggle('active',   t === tab);
  });
}

function togglePassword(fieldId, btn) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const isHidden = field.type === 'password';
  field.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? 'U+1F648' : 'U+1F441';
}

function showAuthMessage(msg, isError) {
  const toast = document.getElementById('auth-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = isError ? 'rgba(239,68,68,0.85)' : 'rgba(30,64,175,0.85)';
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function handleLogin() {
  const email    = document.getElementById('login-email') ? document.getElementById('login-email').value.trim() : '';
  const password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';
  if (!email || !password) { showAuthMessage('Please enter your email and password.', true); return; }
  if (!email.includes('@')) { showAuthMessage('Please enter a valid email.', true); return; }
  if (password.length < 6) { showAuthMessage('Password must be at least 6 characters.', true); return; }
  STATE.userEmail = email;
  STATE.userName  = email.split('@')[0];
  saveState();
  showAuthMessage('Welcome back!');
  setTimeout(() => {
    if (STATE.userType && STATE.userGoal) showMainApp();
    else navigateTo('screen-onboarding');
  }, 900);
}

function handleSignup() {
  const name     = document.getElementById('signup-name') ? document.getElementById('signup-name').value.trim() : '';
  const email    = document.getElementById('signup-email') ? document.getElementById('signup-email').value.trim() : '';
  const password = document.getElementById('signup-password') ? document.getElementById('signup-password').value : '';
  if (!name)  { showAuthMessage('Please enter your name.', true); return; }
  if (!email || !email.includes('@')) { showAuthMessage('Please enter a valid email.', true); return; }
  if (!password || password.length < 8) { showAuthMessage('Password must be at least 8 characters.', true); return; }
  STATE.userEmail = email;
  STATE.userName  = name;
  STATE.streak    = 1;
  saveState();
  showAuthMessage('Welcome, ' + name + '! Setting up your profile.');
  setTimeout(() => navigateTo('screen-onboarding'), 1000);
}

function handleSocialAuth(provider) {
  showAuthMessage(provider + ' sign-in coming soon! Use email for now.');
}

// =======================================================
//  LANDING
// =======================================================

function startLandingSequence() {
  // Animate demo score ring + pillar bars
  animateLandingDemo();
}

/* ─── Landing pill accordion ────────────────────────── */
function toggleLandingPill(el) {
  const wasExpanded = el.classList.contains('expanded');
  // Close all pills first
  document.querySelectorAll('.landing-pill.expanded').forEach(p => p.classList.remove('expanded'));
  // Toggle the clicked one (if it wasn't already open)
  if (!wasExpanded) el.classList.add('expanded');
}

function skipToAuth() {
  const landing = document.getElementById('screen-landing');
  const auth    = document.getElementById('screen-auth');
  if (landing) {
    landing.classList.add('exit');
    setTimeout(() => landing.classList.remove('active', 'exit'), 350);
  }
  if (auth) {
    auth.classList.add('active');
    currentScreen = 'screen-auth';
  }
}

function continueAsGuest() {
  STATE.userEmail = 'guest@imperium.app';
  STATE.userName  = 'Guest';
  STATE.userType  = 'student';
  STATE.userGoal  = 'focus';
  STATE.isGuest   = true;
  // Don't persist guest state
  const landing = document.getElementById('screen-landing');
  const auth    = document.getElementById('screen-auth');
  if (landing) {
    landing.classList.add('exit');
    setTimeout(() => landing.classList.remove('active', 'exit'), 350);
  }
  if (auth) auth.classList.remove('active');
  document.getElementById('bottom-nav').classList.add('visible');
  currentScreen = 'screen-landing';
  navigateTo('screen-home');
}

// =======================================================
//  ONBOARDING
// =======================================================

function selectRole(btn) {
  document.querySelectorAll('#ob-step-1 .ob-card').forEach(function(c) { c.classList.remove('selected'); });
  btn.classList.add('selected');
  STATE.userType = btn.dataset.value;
  document.getElementById('ob-next-1').classList.remove('hidden');
}

function selectGoal(btn) {
  document.querySelectorAll('#ob-step-2 .ob-card').forEach(function(c) { c.classList.remove('selected'); });
  btn.classList.add('selected');
  STATE.userGoal = btn.dataset.value;
  document.getElementById('ob-next-2').classList.remove('hidden');
}

function goToObStep2() {
  document.getElementById('ob-step-1').classList.remove('active');
  document.getElementById('ob-step-2').classList.add('active');
}

function finishOnboarding() {
  STATE.streak = STATE.streak || 1;
  saveState();
  showMainApp();
}

function showMainApp() {
  var authEl = document.getElementById('screen-auth');
  var obEl   = document.getElementById('screen-onboarding');
  if (authEl) authEl.classList.remove('active');
  if (obEl)   obEl.classList.remove('active');
  document.getElementById('bottom-nav').classList.add('visible');
  currentScreen = 'screen-onboarding';
  navigateTo('screen-home');
}

// =======================================================
//  HOME DASHBOARD
// =======================================================

function setGreeting() {
  var h = new Date().getHours();
  var g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  var el = document.getElementById('greeting-text');
  if (el) el.textContent = g;
}

function setScoreDate() {
  var el = document.getElementById('score-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function initHomeDashboard() {
  setGreeting();
  var score = STATE.todayScore !== null ? STATE.todayScore : '--';
  document.getElementById('daily-score').textContent = score;
  animateRing(typeof score === 'number' ? score : 0);

  var p = STATE.pillars;
  animatePillar('execution',  p.execution);
  animatePillar('reasoning', p.reasoning);
  animatePillar('focus',     p.focus);
  animatePillar('financial', p.financial);

  document.getElementById('coin-count').textContent   = STATE.coins;
  document.getElementById('level-badge').textContent  = 'Lv ' + STATE.level;
  document.getElementById('streak-count').textContent = STATE.streak;
  var done = Object.values(STATE.missionsDone).filter(Boolean).length;
  document.getElementById('missions-done').textContent = done + '/4';
  var avg = calcWeeklyAvg();
  document.getElementById('weekly-avg').textContent = avg > 0 ? avg : '--';

  var title = document.querySelector('.dash-title');
  if (title && STATE.userName && STATE.userName !== 'Guest') title.textContent = 'Hey, ' + STATE.userName.split(' ')[0] + ' \uD83D\uDC4B';

  var preview = document.getElementById('voice-day-preview');
  var icon    = document.getElementById('home-voice-icon');
  if (preview) preview.classList.add('hidden');
  if (icon)    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  var orb = document.getElementById('home-voice-orb');
  if (orb) orb.classList.remove('recording');

  // First-run state handling
  var firstRunSection = document.getElementById('first-run-section');
  var pillarsSection = document.querySelector('.pillars-section');
  var quickStats = document.querySelector('.quick-stats');
  var reviewBtn = document.querySelector('.review-btn');

  if (STATE.todayScore === null && STATE.streak <= 1 && !STATE.lastReviewDate) {
    // First-time user: show guided section, hide empty data
    if (firstRunSection) firstRunSection.style.display = 'block';
    if (pillarsSection) pillarsSection.style.opacity = '0.4';
    if (quickStats) quickStats.style.opacity = '0.4';
  } else {
    // Returning user: hide first-run, show full dashboard
    if (firstRunSection) firstRunSection.style.display = 'none';
    if (pillarsSection) pillarsSection.style.opacity = '1';
    if (quickStats) quickStats.style.opacity = '1';
  }

  // Guest mode banner
  initGuestMode();
  // AI insight widget
  showInsightWidget();
}

function animateRing(score) {
  var circle = document.getElementById('score-ring-circle');
  if (!circle) return;
  var c = 2 * Math.PI * 52;
  var offset = c - (score / 100) * c;
  circle.style.strokeDasharray  = c;
  circle.style.strokeDashoffset = c;
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      circle.style.strokeDashoffset = offset;
    });
  });
}

function animatePillar(pillar, value) {
  var bar = document.getElementById('pillar-' + pillar);
  var val = document.getElementById('pillar-' + pillar + '-val');
  if (bar) { bar.style.width = '0%'; setTimeout(function() { bar.style.width = value + '%'; }, 50); }
  if (val) val.textContent = value;
}

function calcWeeklyAvg() {
  var scores = STATE.weeklyScores.filter(function(s) { return s > 0; });
  if (!scores.length) return 0;
  return Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length);
}

// =======================================================
//  HOME — Voice Day Dump
// =======================================================

var homeSpeechRecognition = null;
var homeSpeechActive = false;

function startVoiceDump() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    navigateTo('screen-review');
    return;
  }

  if (homeSpeechActive) { stopVoiceDump(); return; }

  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  homeSpeechRecognition = new SpeechRec();
  homeSpeechRecognition.lang = 'en-GB';
  homeSpeechRecognition.interimResults = true;
  homeSpeechRecognition.continuous = true;

  var orb  = document.getElementById('home-voice-orb');
  var icon = document.getElementById('home-voice-icon');

  orb.classList.add('recording');
  icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  homeSpeechActive = true;

  homeSpeechRecognition.onresult = function(e) {
    var transcript = '';
    for (var i = 0; i < e.results.length; i++) { transcript += e.results[i][0].transcript; }
    STATE.voiceDumpText = transcript;
    var preview      = document.getElementById('voice-day-preview');
    var transcriptEl = document.getElementById('voice-day-transcript');
    if (preview) preview.classList.remove('hidden');
    if (transcriptEl) transcriptEl.textContent = transcript;
  };

  homeSpeechRecognition.onerror = function() { stopVoiceDump(); };
  homeSpeechRecognition.onend   = function() { if (homeSpeechActive) stopVoiceDump(); };
  homeSpeechRecognition.start();
}

function stopVoiceDump() {
  homeSpeechActive = false;
  if (homeSpeechRecognition) { try { homeSpeechRecognition.stop(); } catch (_) {} }
  var orb  = document.getElementById('home-voice-orb');
  var icon = document.getElementById('home-voice-icon');
  if (orb)  orb.classList.remove('recording');
  if (icon) icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
}

function sendVoiceDump() {
  stopVoiceDump();
  if (STATE.voiceDumpText.trim()) chatPrefill = STATE.voiceDumpText.trim();
  navigateTo('screen-review');
}

// =======================================================
//  DAILY REVIEW — Conversational AI Chat
// =======================================================

var REVIEW_QUESTIONS = [
  {
    id: 'actions',
    text: "Tell me about your day — what did you actually get done today?",
    type: 'text',
    followUps: {
      keywords: ['nothing', 'not much', 'bit', 'little'],
      question: "Even on slow days there's something. What was the one thing you did that moved anything forward?",
    },
  },
  {
    id: 'avoided',
    text: "What tasks did you avoid or keep pushing back?",
    type: 'text',
    followUps: {
      keywords: ['nothing', 'none', 'everything'],
      question: "Think about the task that's been on your list for 3+ days. What is it?",
    },
  },
  {
    id: 'money_spent',
    text: "How much money did you spend today? Just a number is fine.",
    type: 'text',
  },
  {
    id: 'money_earned',
    text: "How much did you earn or generate today? Sales, deals, anything.",
    type: 'text',
    followUps: {
      keywords: ['0', 'zero', 'nothing', 'none'],
      question: "No income today — what's one specific thing you could have done to change that?",
    },
  },
  {
    id: 'time_wasted',
    text: "How much time went to low-value stuff — scrolling, pointless meetings, distractions?",
    type: 'options',
    options: ['None \uD83D\uDD25', '< 1 hour \u26A1', '1\u20132 hours \uD83D\uDE10', '3+ hours \uD83D\uDE14'],
  },
  {
    id: 'missed_opportunities',
    text: "Any opportunities you saw but didn't act on today?",
    type: 'text',
  },
  {
    id: 'discipline',
    text: "Honest answer — how sharp was your discipline today?",
    type: 'options',
    options: ['\uD83D\uDD25 High \u2014 locked in', '\u26A1 Medium \u2014 some focus', '\uD83D\uDE14 Low \u2014 struggled'],
  },
];

var chatStep = 0;
var chatAnswers = {};
var chatPrefill = '';
var waitingForFollowUp = false;
var chatSpeechRecognition = null;
var chatMicActive = false;
var aiSpeechUtterance = null;

function startReview() {
  chatStep = 0;
  chatAnswers = {};
  waitingForFollowUp = false;
  var container = document.getElementById('chat-messages');
  if (container) container.innerHTML = '';
  stopAISpeech();
  setEl('chat-status-text', "Let's review your day");

  setTimeout(function() {
    var prefillText = chatPrefill;
    chatPrefill = '';
    if (prefillText) {
      showTypingThenBubble("Got your voice summary! Let me ask a few follow-ups to complete your picture.", function() {
        chatAnswers['actions'] = prefillText;
        addBubble(prefillText, 'user');
        chatStep = 1;
        setTimeout(function() { askQuestion(); }, 600);
      });
    } else {
      showTypingThenBubble("Hey! I'll ask 7 quick questions about your day \u2014 what you did, avoided, spent, and how your focus was. Takes about 2 minutes. Everything stays on your device.", function() {
        setTimeout(function() { askQuestion(); }, 400);
      });
    }
  }, 500);
}

function askQuestion() {
  if (chatStep >= REVIEW_QUESTIONS.length) { finishReview(); return; }
  var q = REVIEW_QUESTIONS[chatStep];
  showTypingThenBubble(q.text, function() {
    showInputForQuestion(q);
  });
}

function showTypingThenBubble(text, callback) {
  var container = document.getElementById('chat-messages');
  var typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  container.appendChild(typing);
  scrollChatBottom();

  var delay = 900 + Math.min(text.length * 12, 1400);
  setTimeout(function() {
    if (container.contains(typing)) container.removeChild(typing);
    addBubble(text, 'ai');
    if (callback) callback();
  }, delay);
}

function addBubble(text, type) {
  var container = document.getElementById('chat-messages');
  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble bubble-' + type;
  bubble.textContent = text;
  container.appendChild(bubble);
  scrollChatBottom();
}

function scrollChatBottom() {
  var c = document.getElementById('chat-messages');
  if (c) setTimeout(function() { c.scrollTop = c.scrollHeight; }, 60);
}

// ── Inject skill breakdown visual into chat ──────────────────
function addSkillBreakdownToChat(result) {
  var container = document.getElementById('chat-messages');
  if (!container) return;

  var card = document.createElement('div');
  card.className = 'chat-skill-card';

  var pillars = [
    { name: 'Execution', key: 'execution', color: 'linear-gradient(90deg, #1e40af, #60a5fa)' },
    { name: 'Reasoning', key: 'reasoning', color: 'linear-gradient(90deg, #4f46e5, #a855f7)' },
    { name: 'Focus', key: 'focus', color: 'linear-gradient(90deg, #0f766e, #14b8a6)' },
    { name: 'Financial', key: 'financial', color: 'linear-gradient(90deg, #b8860b, #f5e27a)' },
  ];

  var html = '<h4>Skill Breakdown</h4>';
  pillars.forEach(function(p) {
    html += '<div class="chat-skill-row">' +
      '<span class="chat-skill-name">' + p.name + '</span>' +
      '<div class="chat-skill-track"><div class="chat-skill-fill" style="width:0%;background:' + p.color + ';" data-target="' + result[p.key] + '"></div></div>' +
      '<span class="chat-skill-val">' + result[p.key] + '</span>' +
    '</div>';
  });

  card.innerHTML = html;
  container.appendChild(card);
  scrollChatBottom();

  // Animate bars after render
  setTimeout(function() {
    var fills = card.querySelectorAll('.chat-skill-fill');
    fills.forEach(function(fill) {
      fill.style.width = fill.getAttribute('data-target') + '%';
    });
  }, 100);
}

// ── Speech Synthesis (disabled — text only) ──────────────────
function aiSpeak() { /* disabled */ }
function stopAISpeech() { /* disabled */ }

// ── Show input controls ────────────────────────────
function showInputForQuestion(q) {
  var optionsWrap = document.getElementById('chat-options');
  var textRow     = document.getElementById('chat-text-row');
  var inputWrap   = document.getElementById('chat-input-wrap');

  // ALWAYS show text input and input wrap
  if (inputWrap) inputWrap.classList.remove('hidden');
  if (textRow) textRow.classList.remove('hidden');
  var field = document.getElementById('chat-text-field');
  if (field) {
    field.value = '';
    field.placeholder = q.type === 'options' ? 'Or type your own answer…' : 'Type your answer…';
    field.onkeydown = function(e) { if (e.key === 'Enter') sendTextAnswer(); };
    // Focus with delay — helps iOS show keyboard
    setTimeout(function() {
      field.focus();
      // Scroll into view as fallback
      if (field.scrollIntoView) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  }
  var sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) sendBtn.onclick = sendTextAnswer;

  if (q.type === 'options') {
    optionsWrap.innerHTML = '';
    optionsWrap.classList.remove('hidden');
    q.options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'chat-option-btn';
      btn.textContent = opt;
      btn.onclick = function() { submitAnswer(opt); };
      optionsWrap.appendChild(btn);
    });
  } else {
    optionsWrap.innerHTML = '';
    optionsWrap.classList.add('hidden');
  }
}

function sendTextAnswer() {
  var field = document.getElementById('chat-text-field');
  if (!field) return;
  var val = field.value.trim();
  if (!val) return;
  stopAISpeech();
  submitAnswer(val);
  field.value = '';
}

function submitAnswer(answer) {
  var q = REVIEW_QUESTIONS[chatStep];

  var optionsWrap = document.getElementById('chat-options');
  if (optionsWrap) { optionsWrap.innerHTML = ''; optionsWrap.classList.add('hidden'); }

  chatAnswers[q.id] = answer;
  addBubble(answer, 'user');

  var fu = q.followUps;
  if (fu && !waitingForFollowUp) {
    var answerLow = answer.toLowerCase();
    var triggered = fu.keywords.some(function(k) { return answerLow.indexOf(k) >= 0; });
    if (triggered) {
      waitingForFollowUp = true;
      setTimeout(function() {
        showTypingThenBubble(fu.question, function() {
          var field = document.getElementById('chat-text-field');
          if (field) {
            field.value = '';
            field.placeholder = 'Follow up…';
            field.onkeydown = function(e) { if (e.key === 'Enter') submitFollowUp(); };
            setTimeout(function() { field.focus(); }, 100);
          }
          var sendBtn = document.getElementById('chat-send-btn');
          if (sendBtn) sendBtn.onclick = submitFollowUp;
        });
      }, 400);
      return;
    }
  }

  var sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) sendBtn.onclick = sendTextAnswer;

  waitingForFollowUp = false;
  chatStep++;
  setTimeout(function() { askQuestion(); }, 500);
}

function submitFollowUp() {
  var field = document.getElementById('chat-text-field');
  var val = field ? field.value.trim() : '';
  if (val) {
    addBubble(val, 'user');
    if (field) field.value = '';
    var q = REVIEW_QUESTIONS[chatStep];
    chatAnswers[q.id] = (chatAnswers[q.id] || '') + '. Follow-up: ' + val;
  }
  var sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) sendBtn.onclick = sendTextAnswer;
  waitingForFollowUp = false;
  chatStep++;
  setTimeout(function() { askQuestion(); }, 500);
}

// ── Chat Microphone ────────────────────────────────
function toggleChatMic() {
  if (chatMicActive) stopChatMic(); else startChatMic();
}

function startChatMic() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showChatToast('Voice not supported in this browser. Please type.');
    return;
  }
  stopAISpeech();
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  chatSpeechRecognition = new SpeechRec();
  chatSpeechRecognition.lang = 'en-GB';
  chatSpeechRecognition.interimResults = true;
  chatSpeechRecognition.continuous = false;

  var micBtn    = document.getElementById('chat-mic-btn');
  var micStatus = document.getElementById('chat-mic-status');
  var statusLbl = document.getElementById('mic-status-label');
  var field     = document.getElementById('chat-text-field');
  var textRow   = document.getElementById('chat-text-row');

  chatMicActive = true;
  if (micBtn)    { micBtn.classList.add('listening'); micBtn.textContent = '●'; }
  if (micStatus) micStatus.classList.remove('hidden');
  if (statusLbl) statusLbl.textContent = 'Listening\u2026';

  chatSpeechRecognition.onresult = function(e) {
    var transcript = '';
    for (var i = 0; i < e.results.length; i++) { transcript += e.results[i][0].transcript; }
    if (field) field.value = transcript;
    var short = transcript.length > 40 ? transcript.slice(0, 40) + '\u2026' : transcript;
    if (statusLbl) statusLbl.textContent = 'Heard: "' + short + '"';
  };

  chatSpeechRecognition.onerror = function(e) {
    stopChatMic();
    if (e.error === 'no-speech') showChatToast("Didn't catch that. Try again!");
  };

  chatSpeechRecognition.onend = function() {
    var val = field ? field.value.trim() : '';
    stopChatMic();
    if (val) setTimeout(function() { sendTextAnswer(); }, 300);
  };

  chatSpeechRecognition.start();
}

function stopChatMic() {
  chatMicActive = false;
  if (chatSpeechRecognition) { try { chatSpeechRecognition.stop(); } catch (_) {} }
  var micBtn    = document.getElementById('chat-mic-btn');
  var micStatus = document.getElementById('chat-mic-status');
  var textRow   = document.getElementById('chat-text-row');
  var optionsWrap = document.getElementById('chat-options');
  if (micBtn)    { micBtn.classList.remove('listening'); micBtn.textContent = '●'; }
  if (micStatus) micStatus.classList.add('hidden');
  var hasOptions = optionsWrap && optionsWrap.children.length > 0;
  if (!hasOptions && textRow) textRow.classList.remove('hidden');
}

function showChatToast(msg) {
  var container = document.getElementById('chat-messages');
  if (!container) return;
  var toast = document.createElement('div');
  toast.style.cssText = 'align-self:center;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:6px 14px;font-size:0.78rem;color:#8b96b8;';
  toast.textContent = msg;
  container.appendChild(toast);
  scrollChatBottom();
  setTimeout(function() { if (container.contains(toast)) container.removeChild(toast); }, 3000);
}

// ── Finish Review ──────────────────────────────────
function finishReview() {
  STATE.reviewAnswers = chatAnswers;
  stopAISpeech();
  setEl('chat-status-text', 'Analysing\u2026');

  showTypingThenBubble("That's everything I need. Crunching your operating score now\u2026", function() {
    setTimeout(function() {
      var result = analyseDay(chatAnswers);
      STATE.analysisResult = result;
      applyResultToState(result);
      saveState();

      addBubble('Your Operating Score today: ' + result.score + '/100 \u26A1', 'ai');

      // ── Inject visual skill breakdown into chat ──
      addSkillBreakdownToChat(result);

      setEl('chat-status-text', 'Analysis complete');

      setTimeout(function() {
        var insightMsg = getTeaserInsight(result);
        showTypingThenBubble(insightMsg, function() {
          setTimeout(function() {
            var optionsWrap = document.getElementById('chat-options');
            optionsWrap.innerHTML = '';
            optionsWrap.classList.remove('hidden');
            var btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.style.cssText = 'background:linear-gradient(135deg,#3b82f6,#4f46e5);border:none;color:white;font-weight:700;';
            btn.textContent = 'View Full Analysis \u2192';
            btn.onclick = function() { stopAISpeech(); navigateTo('screen-results'); };
            optionsWrap.appendChild(btn);
          }, 1000);
        });
      }, 1400);
    }, 800);
  });
}

function getTeaserInsight(result) {
  var phrases = [
    'One thing stood out: ' + result.mistake.split('.')[0] + '.',
    result.score >= 70 ? 'Solid day. Here\u2019s your full breakdown:' : result.score >= 50 ? 'Decent day, but there\u2019s leverage you left on the table.' : 'Tough day \u2014 but the fix is simpler than you think.',
    'Your ' + (result.score >= 65 ? 'strongest' : 'weakest') + ' area today was ' + (result.score >= 65 ? getTopPillar(result) : getBottomPillar(result)) + '. Tap below for everything.',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function getTopPillar(r) {
  return ['execution','reasoning','focus','financial'].sort(function(a,b) { return r[b]-r[a]; })[0];
}
function getBottomPillar(r) {
  return ['execution','reasoning','focus','financial'].sort(function(a,b) { return r[a]-r[b]; })[0];
}

// =======================================================
//  AI ANALYSIS ENGINE
// =======================================================

function analyseDay(a) {
  var discipline = (a.discipline || '').toLowerCase();
  var timeWasted = a.time_wasted || 'None';
  var avoided    = a.avoided || 'nothing';
  var actions    = a.actions || 'nothing';
  var missed     = a.missed_opportunities || 'none';
  var spent      = parseFloat(a.money_spent) || 0;
  var earned     = parseFloat(a.money_earned) || 0;

  // ── Overall Score ──
  var score = 50;
  if (discipline.indexOf('high') >= 0)   score += 20;
  if (discipline.indexOf('medium') >= 0) score += 10;
  if (discipline.indexOf('low') >= 0)    score -= 10;
  if (timeWasted.indexOf('none') >= 0 || timeWasted === 'None') score += 10;
  if (timeWasted.indexOf('1 hour') >= 0) score += 5;
  if (timeWasted.indexOf('3+') >= 0)     score -= 15;
  if (avoided !== 'nothing' && avoided.length > 3) score -= 10;
  if (earned > spent && earned > 0) score += 10;
  if (missed !== 'none' && missed.length > 3) score -= 5;
  score = Math.max(10, Math.min(100, score));

  // ── Pillar Scores (differentiated) ──
  var execution  = calcExecutionScore(discipline, timeWasted, actions, avoided);
  var reasoning  = calcReasoningScore(discipline, missed, avoided);
  var focus      = calcFocusScore(discipline, timeWasted);
  var financial  = calcFinancialScore(spent, earned, missed);

  return {
    score: score,
    execution: execution,
    reasoning: reasoning,
    focus: focus,
    financial: financial,
    mistake:   generateMistake(avoided, timeWasted, actions, discipline),
    money:     generateMoneyImpact(spent, earned, missed),
    thinking:  generateThinkingPattern(discipline, timeWasted, avoided),
    missedOpp: generateMissedOpp(missed, actions),
    fixes:     generateFixes(discipline, timeWasted, avoided, missed, spent, earned, STATE.userType || 'founder'),
    missions:  generateAdaptiveMissions(STATE.userType || 'founder', { execution: execution, reasoning: reasoning, focus: focus, financial: financial }),
  };
}

function calcExecutionScore(discipline, timeWasted, actions, avoided) {
  var base = 50;
  if (discipline.indexOf('high') >= 0)   base += 20;
  if (discipline.indexOf('medium') >= 0) base += 8;
  if (discipline.indexOf('low') >= 0)    base -= 15;
  if (avoided !== 'nothing' && avoided.length > 3) base -= 12;
  if (actions.length > 30) base += 8;
  if (timeWasted.indexOf('none') >= 0 || timeWasted === 'None') base += 10;
  if (timeWasted.indexOf('3+') >= 0) base -= 15;
  var noise = Math.floor(Math.random() * 8) - 4;
  return Math.max(5, Math.min(100, base + noise));
}

function calcReasoningScore(discipline, missed, avoided) {
  var base = 55;
  if (discipline.indexOf('high') >= 0)   base += 15;
  if (discipline.indexOf('low') >= 0)    base -= 10;
  if (missed !== 'none' && missed.length > 3) base -= 15;
  if (avoided !== 'nothing' && avoided.length > 3) base -= 8;
  var noise = Math.floor(Math.random() * 10) - 5;
  return Math.max(5, Math.min(100, base + noise));
}

function calcFocusScore(discipline, timeWasted) {
  var base = 50;
  if (discipline.indexOf('high') >= 0)   base += 25;
  if (discipline.indexOf('medium') >= 0) base += 10;
  if (discipline.indexOf('low') >= 0)    base -= 20;
  if (timeWasted.indexOf('none') >= 0 || timeWasted === 'None') base += 15;
  if (timeWasted.indexOf('1 hour') >= 0) base += 5;
  if (timeWasted.indexOf('3+') >= 0)     base -= 25;
  var noise = Math.floor(Math.random() * 8) - 4;
  return Math.max(5, Math.min(100, base + noise));
}

function calcFinancialScore(spent, earned, missed) {
  var base = 50;
  if (earned > 0) base += 15;
  if (earned > spent) base += 10;
  if (spent === 0) base += 10;
  if (spent > 100) base -= 15;
  if (spent > 50 && earned === 0) base -= 10;
  if (missed && missed.length > 3) base -= 5;
  var noise = Math.floor(Math.random() * 8) - 4;
  return Math.max(5, Math.min(100, base + noise));
}

function generateMistake(avoided, timeWasted, actions, discipline) {
  if (avoided !== 'nothing' && avoided.length > 3 && timeWasted.indexOf('3+') >= 0) {
    return 'You avoided "' + avoided + '" while spending 3+ hours on low-value activity. That\'s not a time problem \u2014 it\'s a priority problem. The avoided task is where your leverage sits.';
  }
  if (avoided !== 'nothing' && avoided.length > 3) {
    return '"' + avoided + '" keeps getting pushed. Based on your answers, this has been on your list. Every day it\'s delayed, the opportunity cost compounds. What\'s the real blocker?';
  }
  if (timeWasted.indexOf('3+') >= 0) {
    return 'You reported 3+ hours of low-value time and rated discipline ' + discipline + '. That\'s a full quarter of your waking hours gone. The issue isn\'t motivation \u2014 it\'s environment design.';
  }
  return 'You got things done today, but look at what you actually shipped vs. what moved the needle. Busyness \u2260 progress. Tomorrow, name one outcome before you start.';
}

function generateMoneyImpact(spent, earned, missed) {
  if (earned > 0 && spent > 0) {
    var net = earned - spent;
    return 'Net today: ' + (net >= 0 ? '+' : '') + '$' + net.toFixed(2) + ' (earned $' + earned.toFixed(2) + ', spent $' + spent.toFixed(2) + '). ' + (net >= 0 ? 'Positive day \u2014 identify what generated that income and do more of it.' : 'Negative day \u2014 one of those expenses was unnecessary. Which one?');
  }
  if (earned > 0) {
    return '$' + earned.toFixed(2) + ' earned with no spending. Clean day. The question: is this repeatable, or was it one-off?';
  }
  if (spent > 0) {
    return '$' + spent.toFixed(2) + ' out, $0 in. Not every day needs income, but track this pattern. 7 days of this = $' + (spent * 7).toFixed(0) + ' gone.';
  }
  return 'No money moved today. That\'s neutral, but ask: was there an opportunity to generate income that you didn\'t act on?';
}

function generateThinkingPattern(discipline, timeWasted, avoided) {
  if (discipline.indexOf('low') >= 0 && timeWasted.indexOf('3+') >= 0) {
    return 'Avoidance loop detected \u2014 you rated discipline low and wasted significant time. This is a pattern where discomfort triggers escape behavior. You delay hard tasks until urgency forces action, which kills quality and leverage.';
  }
  if (discipline.indexOf('low') >= 0) {
    return 'Comfort-seeking bias \u2014 your discipline was low today. You\'re prioritizing what feels manageable over what actually moves the needle. Awareness is step one. Tomorrow, do the hardest thing first.';
  }
  if (discipline.indexOf('medium') >= 0 && avoided !== 'nothing' && avoided.length > 3) {
    return 'Reactive execution \u2014 medium discipline plus avoided tasks means you responded to the day instead of designing it. You\'re playing defense. Flip it: decide your top 1 outcome before opening any app.';
  }
  if (discipline.indexOf('high') >= 0) {
    return 'Intentional execution \u2014 high discipline today. The risk at this level is perfectionism paralysis \u2014 waiting for perfect conditions instead of shipping. Keep the bias toward action.';
  }
  return 'Mixed signals today. Your discipline and time usage don\'t tell a clear story. That usually means the day happened to you, not that you happened to the day. Set your intention earlier tomorrow.';
}

function generateMissedOpp(missed, actions) {
  if (!missed || missed.length < 3 || missed.toLowerCase() === 'none') {
    return 'No missed opportunity flagged \u2014 good. But here\'s a harder question: what\'s one action you could have taken today that would compound over the next 30 days? That\'s your real missed opportunity.';
  }
  return '"' + missed + '" \u2014 you identified this yourself, which means you saw the opportunity and chose not to act. That\'s not ignorance, it\'s hesitation. What\'s the smallest version of this you could do in 15 minutes?';
}

function generateFixes(discipline, timeWasted, avoided, missed, spent, earned, userType) {
  var fixes = [];
  
  // Fix based on weakest area
  if (timeWasted.indexOf('3+') >= 0) {
    fixes.push('Block your top distraction app for the first 2 hours of tomorrow. Use Screen Time, Cold Turkey, or airplane mode.');
  }
  if (avoided !== 'nothing' && avoided.length > 3) {
    fixes.push('Spend exactly 25 minutes on "' + avoided + '" tomorrow morning \u2014 set a timer. You don\'t need to finish it, just start.');
  }
  if (spent > 0 && earned === 0) {
    fixes.push('Before any purchase tomorrow, ask: "Does this directly help me ' + (userType === 'student' ? 'study better' : 'earn more') + '?" Track every dollar.');
  }
  if (discipline.indexOf('low') >= 0) {
    fixes.push('Write tomorrow\'s #1 outcome tonight and put it where you\'ll see it first thing. Decision fatigue kills morning discipline.');
  }
  if (missed && missed.length > 3 && missed.toLowerCase() !== 'none') {
    fixes.push('Convert "' + missed + '" into a 15-minute action with a deadline. Put it on your calendar for before noon.');
  }
  
  // Always have at least 3 fixes
  if (fixes.length < 3) {
    fixes.push('Do your single highest-value task before 10 AM tomorrow \u2014 no email, no messages first.');
    fixes.push('End tomorrow by writing one sentence: "Today I moved the needle on ___." If you can\'t fill the blank, the day missed.');
    fixes.push('Replace 30 minutes of low-value time with something that compounds: reading, building, or connecting.');
  }
  
  return fixes.slice(0, 3);
}

function generateAdaptiveMissions(userType, pillarScores) {
  // Sort pillars by score ascending (weakest first)
  var sorted = Object.entries(pillarScores).sort(function(a,b) { return a[1] - b[1]; });
  var weakest = sorted[0][0];
  var secondWeakest = sorted[1][0];

  var missionPools = {
    student: {
      execution: ['Complete your top 3 study tasks before noon', 'Submit one assignment or project section today', 'Finish one task you\'ve been avoiding for 3+ days'],
      reasoning: ['Solve a problem set without looking at solutions first', 'Write a 3-sentence summary of what you learned today', 'Identify one concept you don\'t understand and research it'],
      focus: ['Study 60 minutes with phone in another room', 'Do a single 25-min Pomodoro on your hardest subject', 'No social media until your top task is done'],
      financial: ['Track every purchase today', 'Find one subscription to cancel or pause', 'Set a spending limit for tomorrow and stick to it'],
    },
    founder: {
      execution: ['Ship one deliverable or decision before noon', 'Clear your highest-friction task within the first 2 hours', 'Send one thing to a customer or user today'],
      reasoning: ['Identify the single biggest bottleneck in your business today', 'Write down 3 decisions you made today and rate them', 'Ask yourself: what would I do differently if I had to restart this week?'],
      focus: ['2-hour no-meeting deep work block on your #1 priority', 'Close all tabs except the one thing you\'re working on', 'Say no to one meeting or request that doesn\'t serve your top goal'],
      financial: ['Track every dollar spent today', 'Review your last 3 days of spending \u2014 find one unnecessary expense', 'Earn or generate at least $1 in revenue today'],
    },
    sales: {
      execution: ['Send 10 outreach messages before 11 AM', 'Follow up with 3 warm leads today', 'Close or advance one deal by end of day'],
      reasoning: ['Analyse your last 3 lost deals \u2014 find the common pattern', 'Write down why your last objection happened and prep a response', 'Review your win rate this week and identify one improvement'],
      focus: ['Make 20 focused calls with zero multitasking', 'Block 90 minutes for pipeline work, no interruptions', 'Turn off notifications during your peak selling hours'],
      financial: ['Calculate your commission-per-hour today', 'Set a daily spending cap and track against it', 'Find one way to increase deal size on your next pitch'],
    },
    creator: {
      execution: ['Publish one piece of content today', 'Finish and ship one creative deliverable', 'Respond to 5 audience comments or messages'],
      reasoning: ['Analyse your best-performing content \u2014 why did it work?', 'Write down 3 content ideas and pick the highest-leverage one', 'Identify one skill gap holding back your content quality'],
      focus: ['Create for 60 minutes without checking analytics', 'Batch-create content: write/film 3 pieces in one session', 'No social scrolling until you\'ve created first'],
      financial: ['Track your content-to-income ratio this week', 'Identify one monetization opportunity you\'re not using', 'Reach out to one potential sponsor or collaborator'],
    },
  };

  var pool = missionPools[userType in missionPools ? userType : 'founder'];
  var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  return {
    execution:  pick(pool.execution),
    reasoning:  pick(pool.reasoning),
    focus:      pick(pool.focus),
    financial:  pick(pool.financial),
    _weakest: weakest,
    _secondWeakest: secondWeakest,
  };
}

// ─── APPLY RESULT ─────────────────────────────────
function applyResultToState(result) {
  STATE.todayScore = result.score;
  STATE.pillars = { execution: result.execution, reasoning: result.reasoning, focus: result.focus, financial: result.financial };
  STATE.weeklyScores.shift();
  STATE.weeklyScores.push(result.score);
  var m = result.missions;
  if (m) { setEl('mission-execution-task', m.execution); setEl('mission-reasoning-task', m.reasoning); setEl('mission-focus-task', m.focus); setEl('mission-financial-task', m.financial); }
  STATE.level = Math.max(1, Math.floor(calcWeeklyAvg() / 10) + 1);
  var today = new Date().toDateString();
  if (STATE.lastReviewDate !== today) { STATE.streak = (STATE.streak || 0) + 1; STATE.lastReviewDate = today; }
}

// =======================================================
//  RESULTS
// =======================================================

function initResults() {
  var r = STATE.analysisResult;
  if (!r) { setEl('result-score-num', '--'); return; }
  animateNumber('result-score-num', r.score, 0, 1000);
  setEl('res-mistake', r.mistake);
  setEl('res-money', r.money);
  setEl('res-thinking', r.thinking);
  setEl('res-missed', r.missedOpp);
  var fixList = document.getElementById('res-fixes');
  if (fixList && r.fixes) fixList.innerHTML = r.fixes.map(function(f) { return '<li>' + f + '</li>'; }).join('');
  var trend = document.getElementById('result-trend');
  if (trend) trend.innerHTML = r.score >= calcWeeklyAvg()
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';

  // ── Skill Breakdown Bars (animated) ──
  setTimeout(function() {
    var pillars = ['execution', 'reasoning', 'focus', 'financial'];
    pillars.forEach(function(p) {
      var bar = document.getElementById('skill-bar-' + p);
      var val = document.getElementById('skill-val-' + p);
      if (bar) bar.style.width = r[p] + '%';
      if (val) animateNumber('skill-val-' + p, r[p], 0, 800);
    });
  }, 300);

  // ── Input Summary Mini-Cards ──
  var summaryEl = document.getElementById('input-summary');
  if (summaryEl && STATE.reviewAnswers) {
    var a = STATE.reviewAnswers;
    var cards = [];
    if (a.discipline) cards.push({ icon: '🎯', label: 'Discipline', value: a.discipline });
    if (a.time_wasted) cards.push({ icon: '⏱', label: 'Time Wasted', value: a.time_wasted });
    if (a.money_spent) cards.push({ icon: '💸', label: 'Spent', value: '$' + parseFloat(a.money_spent || 0).toFixed(2) });
    if (a.money_earned) cards.push({ icon: '💰', label: 'Earned', value: '$' + parseFloat(a.money_earned || 0).toFixed(2) });
    if (a.avoided) cards.push({ icon: '🚫', label: 'Avoided', value: a.avoided });
    if (a.missed_opportunities) cards.push({ icon: '💡', label: 'Missed Opp', value: a.missed_opportunities });
    summaryEl.innerHTML = cards.map(function(c) {
      return '<div class="input-summary-card"><span class="summary-icon">' + c.icon + '</span><span class="summary-label">' + c.label + '</span><span class="summary-value">' + c.value + '</span></div>';
    }).join('');
  }
}

// =======================================================
//  MISSIONS
// =======================================================

function initMissions() {
  document.getElementById('missions-coin-count').textContent = STATE.coins;
  var m = STATE.analysisResult && STATE.analysisResult.missions;
  if (m) { setEl('mission-execution-task', m.execution); setEl('mission-reasoning-task', m.reasoning); setEl('mission-focus-task', m.focus); setEl('mission-financial-task', m.financial); }
  ['execution','reasoning','focus','financial'].forEach(function(p) {
    if (STATE.missionsDone[p]) {
      var item = document.getElementById('mission-' + p); if (item) item.classList.add('done');
      var check = document.getElementById('check-' + p); if (check) check.classList.add('checked');
    } else {
      var item = document.getElementById('mission-' + p); if (item) item.classList.remove('done');
      var check = document.getElementById('check-' + p); if (check) check.classList.remove('checked');
    }
  });
  checkAllMissionsDone();
}

function completeMission(pillar) {
  if (STATE.missionsDone[pillar]) return;
  STATE.missionsDone[pillar] = true;
  // Stretch mission (financial) earns more coins
  var coinReward = pillar === 'financial' ? 25 : 15;
  STATE.coins += coinReward;
  STATE.totalMissionsCompleted++;
  saveState();
  var item = document.getElementById('mission-' + pillar); if (item) item.classList.add('done');
  var check = document.getElementById('check-' + pillar); if (check) check.classList.add('checked');
  document.getElementById('missions-coin-count').textContent = STATE.coins;
  burstCoins();
  checkAllMissionsDone();
}

function checkAllMissionsDone() {
  var done = Object.values(STATE.missionsDone).every(Boolean);
  var banner = document.getElementById('bonus-banner');
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
  var burst = document.getElementById('coin-burst');
  if (!burst) return;
  var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (var i = 0; i < 8; i++) {
    var p = document.createElement('div');
    p.className = 'coin-particle';
    p.textContent = '●';
    p.style.color = '#d4af37';
    var angle = (i / 8) * 2 * Math.PI;
    var r = 80 + Math.random() * 60;
    p.style.left = (cx + Math.cos(angle) * 10) + 'px';
    p.style.top  = (cy + Math.sin(angle) * 10) + 'px';
    p.style.animation = 'coin-fly 1.2s ease-out ' + (i * 0.07) + 's forwards';
    burst.appendChild(p);
    setTimeout(function(el) { return function() { if (burst.contains(el)) burst.removeChild(el); }; }(p), 1400);
  }
}

// =======================================================
//  PROGRESS
// =======================================================

function initProgress() {
  var avg = calcWeeklyAvg();
  setEl('prog-streak', STATE.streak);
  setEl('prog-avg', avg > 0 ? avg : '--');
  setEl('prog-missions', STATE.totalMissionsCompleted);
  setEl('progress-level', 'Lv ' + STATE.level);
  setEl('progress-coins', STATE.coins);
  var p = STATE.pillars;
  setPillarBreakdown('execution', p.execution);
  setPillarBreakdown('reasoning', p.reasoning);
  setPillarBreakdown('focus', p.focus);
  setPillarBreakdown('financial', p.financial);
  drawCharts();
}

function setPillarBreakdown(key, val) {
  var bar   = document.getElementById('pb-' + key);
  var valEl = document.getElementById('pb-' + key + '-val');
  if (bar)   { bar.style.width = '0%'; setTimeout(function() { bar.style.width = val + '%'; }, 100); }
  if (valEl) valEl.textContent = val;
}

function drawCharts() {
  if (typeof Chart === 'undefined') { setTimeout(drawCharts, 300); return; }
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var scores = STATE.weeklyScores.slice();

  var scoreCtx = document.getElementById('score-chart');
  if (scoreCtx) {
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(scoreCtx, {
      type: 'line',
      data: { labels: days, datasets: [{ data: scores, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#3b82f6', pointBorderColor: '#050a1a', pointBorderWidth: 2, fill: true, tension: 0.4 }] },
      options: chartOptions('#3b82f6'),
    });
  }

  var moneyData = STATE.weeklyMoney.length ? STATE.weeklyMoney : [0,0,0,0,0,0,0];
  var moneyCtx  = document.getElementById('money-chart');
  if (moneyCtx) {
    if (moneyChart) moneyChart.destroy();
    moneyChart = new Chart(moneyCtx, {
      type: 'bar',
      data: { labels: days, datasets: [{ label: 'Behaviour Score', data: moneyData.map(function(v) { return v || Math.floor(Math.random() * 60); }), backgroundColor: 'rgba(212,175,55,0.3)', borderColor: '#d4af37', borderWidth: 2, borderRadius: 6 }] },
      options: chartOptions('#d4af37'),
    });
  }
}

function chartOptions(color) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(5,10,26,0.95)', titleColor: '#f0f4ff', bodyColor: '#8b96b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5578', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5578', font: { size: 10 } }, min: 0, max: 100 },
    },
  };
}

// =======================================================
//  PROFILE
// =======================================================

function exportData() {
  var data = {
    exportDate: new Date().toISOString(),
    user: { name: STATE.userName, type: STATE.userType, goal: STATE.userGoal },
    stats: { level: STATE.level, coins: STATE.coins, streak: STATE.streak, todayScore: STATE.todayScore, totalMissions: STATE.totalMissionsCompleted },
    pillars: STATE.pillars,
    weeklyScores: STATE.weeklyScores,
    weeklyMoney: STATE.weeklyMoney,
    lastReview: STATE.reviewAnswers || null,
    lastAnalysis: STATE.analysisResult ? { score: STATE.analysisResult.score, execution: STATE.analysisResult.execution, reasoning: STATE.analysisResult.reasoning, focus: STATE.analysisResult.focus, financial: STATE.analysisResult.financial, mistake: STATE.analysisResult.mistake, money: STATE.analysisResult.money, thinking: STATE.analysisResult.thinking, missedOpp: STATE.analysisResult.missedOpp, fixes: STATE.analysisResult.fixes } : null,
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'imperium-data-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initProfile() {
  var typeMap = { student: 'Student', sales: 'Sales Pro', founder: 'Founder', creator: 'Creator', business: 'Business Builder' };
  var goalMap = { money: 'Stop Wasting Money', discipline: 'Consistent Routine', focus: 'Deep Focus', decisions: 'Better Decisions' };
  var iconMap = { student: 'book', sales: 'briefcase', founder: 'rocket', creator: 'bulb', business: 'rocket' };
  var svgMap = {
    book: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    briefcase: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    rocket: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
    bulb: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20h6v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/><line x1="10" y1="22" x2="14" y2="22"/></svg>',
  };

  setEl('profile-user-type', STATE.userName || typeMap[STATE.userType] || 'Imperium User');
  setEl('profile-user-goal', 'Goal: ' + (goalMap[STATE.userGoal] || '\u2014'));
  setEl('profile-level-badge', 'Level ' + STATE.level);
  setEl('profile-coins-badge', STATE.coins + ' coins');
  setEl('profile-streak-badge', STATE.streak + ' streak');
  var avatarEl = document.getElementById('profile-avatar-icon');
  if (avatarEl) avatarEl.innerHTML = svgMap[iconMap[STATE.userType] || 'bulb'] || svgMap.bulb;

  if (!document.getElementById('profile-footer')) {
    var sc = document.querySelector('#screen-profile .screen-content');
    if (sc) {
      var footer = document.createElement('div');
      footer.id = 'profile-footer';
      footer.className = 'profile-footer';
      footer.innerHTML = '<p>Founded &amp; Owned by <strong>Sanskaar</strong></p><p>Co-founded by <strong>Kashish Devnani</strong></p><p class="footer-copy">\u00A9 2026 Imperium. All rights reserved.</p>';
      sc.appendChild(footer);
    }
  }
}

// =======================================================
//  PRO MODAL + RESET
// =======================================================

function showProModal() { document.getElementById('pro-modal').classList.remove('hidden'); }
function closeProModal() { document.getElementById('pro-modal').classList.add('hidden'); }

function resetApp() {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  localStorage.removeItem('imperium_state');
  location.reload();
}

// ─── UTILITIES ────────────────────────────────────
function setEl(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function animateNumber(id, target, start, duration) {
  start = start || 0; duration = duration || 800;
  var el = document.getElementById(id);
  if (!el) return;
  var startTime = performance.now();
  function tick(now) {
    var p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * easeOut(p));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

/* ── Beams Canvas Animation ────────────────────────────────────── */
(function initBeams() {
  var canvas = document.getElementById('beams-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H;
  var beams = [];
  var BEAM_COUNT = 8;

  function resize() {
    W = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
    H = canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var BEAM_COLORS = [
    { r: 96, g: 165, b: 250 },   // blue
    { r: 129, g: 140, b: 248 },  // indigo
    { r: 168, g: 85, b: 247 },   // purple
    { r: 212, g: 175, b: 55 },   // gold
    { r: 99, g: 102, b: 241 },   // violet
    { r: 59, g: 130, b: 246 },   // bright blue
    { r: 245, g: 226, b: 122 },  // light gold
    { r: 34, g: 197, b: 94 },    // green
  ];

  function Beam() { this.reset(); }

  Beam.prototype.reset = function() {
    this.color = BEAM_COLORS[Math.floor(Math.random() * BEAM_COLORS.length)];
    this.width = Math.random() * 2.5 + 0.5;
    this.speed = Math.random() * 1.2 + 0.4;
    this.alpha = Math.random() * 0.15 + 0.04;
    this.drift = (Math.random() - 0.5) * 0.3;
    this.y = -20;
    this.x = Math.random() * W;
    this.length = Math.random() * 200 + 100;
    this.curve = (Math.random() - 0.5) * 0.008;
    this.angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    this.glow = Math.random() * 12 + 4;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.03 + 0.01;
  };

  Beam.prototype.update = function() {
    this.x += Math.cos(this.angle) * this.speed + this.drift;
    this.y += Math.sin(this.angle) * this.speed;
    this.angle += this.curve;
    this.pulsePhase += this.pulseSpeed;

    if (this.y > H + 40 || this.x < -100 || this.x > W + 100) {
      this.reset();
    }
  };

  Beam.prototype.draw = function() {
    var pulse = 0.6 + 0.4 * Math.sin(this.pulsePhase);
    var a = this.alpha * pulse;
    var c = this.color;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',1)';
    ctx.lineWidth = this.width;
    ctx.shadowBlur = this.glow * pulse;
    ctx.shadowColor = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.5)';
    ctx.lineCap = 'round';

    // Draw beam as a line
    var tailX = this.x - Math.cos(this.angle) * this.length;
    var tailY = this.y - Math.sin(this.angle) * this.length;

    var grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
    grad.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
    grad.addColorStop(0.6, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a * 0.7) + ')');
    grad.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')');
    ctx.strokeStyle = grad;

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Collision point glow at bottom
    if (this.y > H - 80) {
      var proximity = 1 - (H - this.y) / 80;
      ctx.beginPath();
      ctx.arc(this.x, H, 20 * proximity, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (proximity * 0.15) + ')';
      ctx.shadowBlur = 30 * proximity;
      ctx.fill();
    }
    ctx.restore();
  };

  // Create beams
  for (var i = 0; i < BEAM_COUNT; i++) {
    var b = new Beam();
    b.y = Math.random() * H;  // pre-position
    beams.push(b);
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    // Bottom collision gradient
    var bottomGrad = ctx.createLinearGradient(0, H - 60, 0, H);
    bottomGrad.addColorStop(0, 'transparent');
    bottomGrad.addColorStop(1, 'rgba(96,165,250,0.03)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, H - 60, W, 60);

    for (var i = 0; i < beams.length; i++) {
      beams[i].update();
      beams[i].draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
})();

/* ── Landing Demo Score Animation ─────────────────────────────── */
function animateLandingDemo() {
  var ring = document.querySelector('.demo-ring-progress');
  var scoreEl = document.getElementById('demo-score');
  var fills = document.querySelectorAll('.demo-p-fill');
  if (!ring || !scoreEl) return;

  var targetScore = 71;
  var circumference = 2 * Math.PI * 42; // r=42

  // Animate ring
  setTimeout(function() {
    var offset = circumference - (targetScore / 100) * circumference;
    ring.style.strokeDashoffset = offset;
  }, 400);

  // Animate score number
  var start = performance.now();
  function tick(now) {
    var p = Math.min((now - start) / 1800, 1);
    var ease = 1 - Math.pow(1 - p, 3);
    scoreEl.textContent = Math.round(targetScore * ease);
    if (p < 1) requestAnimationFrame(tick);
  }
  setTimeout(function() { requestAnimationFrame(tick); }, 400);

  // Animate pillar bars
  fills.forEach(function(fill) {
    setTimeout(function() {
      fill.style.width = fill.style.getPropertyValue('--target');
    }, 600);
  });
}

/* ── Guest 3-Day Limit Logic ──────────────────────────────────── */
function initGuestMode() {
  if (!STATE.isGuest) return;

  // Track first guest visit
  var guestStart = localStorage.getItem('imperium_guest_start');
  if (!guestStart) {
    guestStart = Date.now().toString();
    localStorage.setItem('imperium_guest_start', guestStart);
  }

  var elapsed = Date.now() - parseInt(guestStart);
  var daysUsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  var daysLeft = Math.max(0, 3 - daysUsed);

  // Show guest banner
  var banner = document.getElementById('guest-banner');
  var daysEl = document.getElementById('guest-days-left');
  if (banner) {
    banner.classList.remove('hidden');
    if (daysEl) daysEl.textContent = daysLeft + (daysLeft === 1 ? ' day' : ' days');
    if (daysLeft === 0) {
      daysEl.textContent = 'Expired';
      daysEl.style.color = '#ef4444';
    }
  }
}

/* ── AI Insight Widget ────────────────────────────────────────── */
function showInsightWidget() {
  var widget = document.getElementById('insight-widget');
  var textEl = document.getElementById('insight-text');
  if (!widget || !textEl) return;

  var insights = [];

  // Generate contextual insights
  if (STATE.streak >= 3) {
    insights.push('You\'re on a ' + STATE.streak + '-day streak! Consistency compounds — keep going.');
  }
  if (STATE.todayScore !== null && STATE.todayScore < 50) {
    insights.push('Score dipped below 50. Focus on your weakest pillar tomorrow to recover.');
  }
  if (STATE.todayScore !== null && STATE.todayScore >= 80) {
    insights.push('Outstanding day — score of ' + STATE.todayScore + '! Your discipline is paying off.');
  }
  if (STATE.coins >= 100) {
    insights.push('You\'ve earned ' + STATE.coins + ' coins. You\'re building momentum.');
  }
  var p = STATE.pillars;
  var lowest = Object.entries(p).sort(function(a,b){ return a[1]-b[1]; })[0];
  if (lowest && lowest[1] > 0 && lowest[1] < 40) {
    var pillarNames = { execution: 'Execution', reasoning: 'Reasoning', focus: 'Focus', financial: 'Financial' };
    insights.push('Your ' + (pillarNames[lowest[0]] || lowest[0]) + ' pillar is at ' + lowest[1] + ' \u2014 this is your biggest growth area.');
  }
  if (STATE.todayScore === null) {
    insights.push('You haven\'t completed today\'s review yet. Tap "Start Daily Review" to get your score.');
  }

  if (insights.length === 0) {
    insights.push('Complete your daily review to unlock personalised AI insights.');
  }

  textEl.textContent = insights[Math.floor(Math.random() * insights.length)];
  widget.classList.remove('hidden');
}

/* ── Particle System ────────────────────────────────────────────── */
(function initParticles() {
  var canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var COLORS = [
    'rgba(96,165,250,',   // blue
    'rgba(129,140,248,',  // indigo
    'rgba(245,226,122,',  // gold
    'rgba(168,85,247,',   // purple
    'rgba(34,197,94,',    // green
  ];

  function Particle() {
    this.reset();
  }

  Particle.prototype.reset = function() {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 1.4 + 0.4;
    this.vx = (Math.random() - 0.5) * 0.22;
    this.vy = (Math.random() - 0.5) * 0.22 - 0.08;
    this.alpha = Math.random() * 0.4 + 0.08;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.life  = Math.random() * 300 + 200;
    this.age   = 0;
    this.twinkle = Math.random() * Math.PI * 2;
    this.twinkleSpeed = Math.random() * 0.04 + 0.01;
  };

  Particle.prototype.update = function() {
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    this.twinkle += this.twinkleSpeed;
    if (this.age > this.life || this.x < -10 || this.x > W + 10 || this.y < -10) {
      this.reset();
    }
  };

  Particle.prototype.draw = function() {
    var a = this.alpha * (0.6 + 0.4 * Math.sin(this.twinkle));
    // Fade in/out by age
    var fadeIn  = Math.min(this.age / 40, 1);
    var fadeOut = Math.min((this.life - this.age) / 40, 1);
    var opacity = a * fadeIn * fadeOut;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color + opacity + ')';
    ctx.fill();
  };

  // Create ~120 particles
  for (var i = 0; i < 120; i++) {
    var p = new Particle();
    p.age = Math.floor(Math.random() * p.life); // pre-age them
    particles.push(p);
  }

  // Draw connecting lines between close particles
  function drawLines() {
    var max = 80;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < max) {
          var opacity = (1 - dist / max) * 0.04;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(96,165,250,' + opacity + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawLines();
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
})();

// ─── VIRTUAL KEYBOARD HANDLER ─────────────────────
// Moves chat-input-wrap above the virtual keyboard on iOS/iPadOS/Android
(function() {
  var inputWrap = null;

  function getEls() {
    inputWrap = document.getElementById('chat-input-wrap');
  }

  function handleViewportResize() {
    getEls();
    if (!inputWrap) return;

    var vv = window.visualViewport;
    if (!vv) return;

    // Calculate keyboard height
    var keyboardHeight = window.innerHeight - vv.height;

    if (keyboardHeight > 100) {
      // Keyboard is open — move input wrap up using bottom
      inputWrap.style.bottom = keyboardHeight + 'px';
      // Scroll chat to bottom
      setTimeout(function() {
        var c = document.getElementById('chat-messages');
        if (c) c.scrollTop = c.scrollHeight;
      }, 100);
    } else {
      // Keyboard is closed
      inputWrap.style.bottom = '0';
    }
  }

  // Handle focus on the chat text field
  document.addEventListener('focusin', function(e) {
    if (e.target && e.target.id === 'chat-text-field') {
      setTimeout(function() {
        handleViewportResize();
      }, 300);
    }
  });

  document.addEventListener('focusout', function(e) {
    if (e.target && e.target.id === 'chat-text-field') {
      getEls();
      if (inputWrap) inputWrap.style.bottom = '0';
    }
  });

  // Listen to visualViewport resize (fires when keyboard opens/closes)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportResize);
  }
})();
