/* ===================================================
   BRAINANCE — app.js
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
  pillars: { speed: 0, reasoning: 0, focus: 0, knowledge: 0 },
  todayScore: null,
  missionsDone: { speed: false, reasoning: false, focus: false, knowledge: false },
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
  STATE.userEmail = 'guest@brainance.app';
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
  animatePillar('speed',     p.speed);
  animatePillar('reasoning', p.reasoning);
  animatePillar('focus',     p.focus);
  animatePillar('knowledge', p.knowledge);

  document.getElementById('coin-count').textContent   = STATE.coins;
  document.getElementById('level-badge').textContent  = 'Lv ' + STATE.level;
  document.getElementById('streak-count').textContent = STATE.streak;
  var done = Object.values(STATE.missionsDone).filter(Boolean).length;
  document.getElementById('missions-done').textContent = done + '/4';
  var avg = calcWeeklyAvg();
  document.getElementById('weekly-avg').textContent = avg > 0 ? avg : '--';

  var title = document.querySelector('.dash-title');
  if (title && STATE.userName) title.textContent = 'Hey, ' + STATE.userName.split(' ')[0] + ' \uD83D\uDC4B';

  var preview = document.getElementById('voice-day-preview');
  var icon    = document.getElementById('home-voice-icon');
  if (preview) preview.classList.add('hidden');
  if (icon)    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  var orb = document.getElementById('home-voice-orb');
  if (orb) orb.classList.remove('recording');

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
      showTypingThenBubble("Hey! Ready to reflect on today? I'll ask 7 quick questions, then give you a full intelligence breakdown.", function() {
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

// ── Speech Synthesis (disabled — text only) ──────────────────
function aiSpeak() { /* disabled */ }
function stopAISpeech() { /* disabled */ }

// ── Show input controls ────────────────────────────
function showInputForQuestion(q) {
  var optionsWrap = document.getElementById('chat-options');
  var textRow     = document.getElementById('chat-text-row');

  // ALWAYS show text input
  if (textRow) textRow.classList.remove('hidden');
  var field = document.getElementById('chat-text-field');
  if (field) {
    field.value = '';
    field.placeholder = q.type === 'options' ? 'Or type your own answer…' : 'Type your answer…';
    field.onkeydown = function(e) { if (e.key === 'Enter') sendTextAnswer(); };
    setTimeout(function() { field.focus(); }, 100);
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

  showTypingThenBubble("That's everything I need. Crunching your intelligence score now\u2026", function() {
    setTimeout(function() {
      var result = analyseDay(chatAnswers);
      STATE.analysisResult = result;
      applyResultToState(result);
      saveState();

      addBubble('Your Intelligence Score today: ' + result.score + '/100 \u26A1', 'ai');
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
  return ['speed','reasoning','focus','knowledge'].sort(function(a,b) { return r[b]-r[a]; })[0];
}
function getBottomPillar(r) {
  return ['speed','reasoning','focus','knowledge'].sort(function(a,b) { return r[a]-r[b]; })[0];
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

  var speed     = calcPillarScore(discipline, timeWasted);
  var reasoning = calcPillarScore(discipline, timeWasted);
  var focus     = calcPillarScore(discipline, timeWasted);
  var knowledge = calcPillarScore(discipline, timeWasted);

  return {
    score: score,
    speed: speed,
    reasoning: reasoning,
    focus: focus,
    knowledge: knowledge,
    mistake:   generateMistake(avoided, timeWasted),
    money:     generateMoneyImpact(spent, earned, missed),
    thinking:  generateThinkingPattern(discipline),
    missedOpp: generateMissedOpp(missed),
    fixes:     generateFixes(discipline),
    missions:  generateMissions(STATE.userType || 'business'),
  };
}

function calcPillarScore(discipline, timeWasted) {
  var base = 50;
  if (discipline.indexOf('high') >= 0)   base += 20;
  if (discipline.indexOf('medium') >= 0) base += 10;
  if (discipline.indexOf('low') >= 0)    base -= 15;
  if (timeWasted.indexOf('none') >= 0 || timeWasted === 'None') base += 10;
  if (timeWasted.indexOf('3+') >= 0) base -= 20;
  var noise = Math.floor(Math.random() * 15) - 7;
  return Math.max(5, Math.min(100, base + noise));
}

function generateMistake(avoided, timeWasted) {
  var templates = [
    'You avoided "' + avoided + '" while spending ' + timeWasted + ' on low-value activity. That\'s a direct discipline leak.',
    '"' + avoided + '" keeps getting pushed. Every day it\'s delayed, the opportunity cost compounds.',
    timeWasted + ' of wasted time is the real problem \u2014 not lack of effort, but lack of intentionality.',
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateMoneyImpact(spent, earned, missed) {
  if (missed && missed.length > 3) {
    return 'Missed opportunity in "' + missed + '" could outweigh today\'s $' + spent.toFixed(2) + ' spend.';
  }
  return earned > 0
    ? 'Net: $' + earned.toFixed(2) + ' earned, $' + spent.toFixed(2) + ' spent. Scale what generated that $' + earned.toFixed(2) + '.'
    : '$' + spent.toFixed(2) + ' spent, no income recorded. Days like this compound into a deficit.';
}

function generateThinkingPattern(discipline) {
  var templates = [
    'Avoidance loop \u2014 you delay difficult tasks until urgency forces action. This kills leverage.',
    'Comfort-seeking bias \u2014 prioritising what feels manageable over what actually moves the needle.',
    'Reactive execution \u2014 responding to the day rather than designing it. You\'re playing defence.',
    'Perfectionism paralysis \u2014 waiting for the right moment instead of taking imperfect action now.',
  ];
  var idx = discipline.indexOf('low') >= 0 ? 0 : discipline.indexOf('medium') >= 0 ? 2 : 1;
  return templates[idx];
}

function generateMissedOpp(missed) {
  if (!missed || missed.length < 3) return 'No missed opportunity flagged \u2014 but ask: what 1 action would move your goal by 10x?';
  return '"' + missed + '" \u2014 this is your highest-leverage untapped point. One action here compounds.';
}

function generateFixes(discipline) {
  var templates = [
    ['Block 2 hours tomorrow exclusively for your avoided task.', 'Write the outcome you want from tomorrow in one sentence before you sleep.', 'Set a $0 spend limit unless it directly generates income.'],
    ['Do your single highest-value task before 10 AM tomorrow.', 'Delete or silence 1 app that killed your focus today.', 'Convert one missed opportunity into a scheduled action with a deadline.'],
    ['Use a 25-min timer sprint to tackle your most avoided task first thing.', 'Track every dollar tomorrow \u2014 awareness alone changes behaviour.', 'Replace 30 mins of low-value time with reading related to your goal.'],
  ];
  var i = discipline.indexOf('low') >= 0 ? 0 : discipline.indexOf('medium') >= 0 ? 2 : 1;
  return templates[i];
}

function generateMissions(userType) {
  var pools = {
    student:  { speed: 'Complete top 3 study tasks before 12 PM', reasoning: 'Solve 5 problems without looking at solutions', focus: '90-min deep study session \u2014 phone in another room', knowledge: 'Read 1 chapter or watch 1 educational video' },
    sales:    { speed: 'Send 10 outreach messages before 11 AM', reasoning: 'Analyse your last 3 lost deals \u2014 find the pattern', focus: 'Make 20 focused calls with zero multitasking', knowledge: 'Learn 1 new closing technique and test it today' },
    business: { speed: 'Ship one deliverable or decision before lunch', reasoning: 'Identify the single bottleneck killing your growth today', focus: '2-hour no-meeting deep work block on #1 priority', knowledge: 'Read 20 mins of competitor or market intelligence' },
  };
  return pools[userType in pools ? userType : 'business'];
}

// ─── APPLY RESULT ─────────────────────────────────
function applyResultToState(result) {
  STATE.todayScore = result.score;
  STATE.pillars = { speed: result.speed, reasoning: result.reasoning, focus: result.focus, knowledge: result.knowledge };
  STATE.weeklyScores.shift();
  STATE.weeklyScores.push(result.score);
  var m = result.missions;
  if (m) { setEl('mission-speed-task', m.speed); setEl('mission-reasoning-task', m.reasoning); setEl('mission-focus-task', m.focus); setEl('mission-knowledge-task', m.knowledge); }
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
}

// =======================================================
//  MISSIONS
// =======================================================

function initMissions() {
  document.getElementById('missions-coin-count').textContent = STATE.coins;
  var m = STATE.analysisResult && STATE.analysisResult.missions;
  if (m) { setEl('mission-speed-task', m.speed); setEl('mission-reasoning-task', m.reasoning); setEl('mission-focus-task', m.focus); setEl('mission-knowledge-task', m.knowledge); }
  ['speed','reasoning','focus','knowledge'].forEach(function(p) {
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
  STATE.coins += 10;
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
  setPillarBreakdown('speed', p.speed);
  setPillarBreakdown('reasoning', p.reasoning);
  setPillarBreakdown('focus', p.focus);
  setPillarBreakdown('knowledge', p.knowledge);
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

function initProfile() {
  var typeMap = { student: 'Student Agent', sales: 'Sales Warrior', business: 'Business Builder' };
  var goalMap = { money: 'Make Money', discipline: 'Build Discipline', focus: 'Master Focus' };
  var iconMap = { student: 'book', sales: 'briefcase', business: 'rocket' };
  var svgMap = {
    book: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    briefcase: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    rocket: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
    bulb: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20h6v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/><line x1="10" y1="22" x2="14" y2="22"/></svg>',
  };

  setEl('profile-user-type', STATE.userName || typeMap[STATE.userType] || 'Intelligence Agent');
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
      footer.innerHTML = '<p>Founded &amp; Owned by <strong>Sanskaar</strong></p><p>Co-founded by <strong>Kashish Devnani</strong></p><p class="footer-copy">\u00A9 2026 Brainance. All rights reserved.</p>';
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
  localStorage.removeItem('brainance_state');
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
  var guestStart = localStorage.getItem('brainance_guest_start');
  if (!guestStart) {
    guestStart = Date.now().toString();
    localStorage.setItem('brainance_guest_start', guestStart);
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
    insights.push('Your ' + lowest[0] + ' pillar is at ' + lowest[1] + ' — this is your biggest growth area.');
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
