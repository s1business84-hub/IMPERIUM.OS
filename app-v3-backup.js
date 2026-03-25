/* ═══════════════════════════════════════════════════════════
   Imperium v3.0.0 — Brutally honest daily waste tracker
   "See exactly how much of your life you wasted today"
   ═══════════════════════════════════════════════════════════ */

/* ── STATE ────────────────────────────────────────────────── */
const STATE = {
  userEmail: null,
  userName: null,
  userRole: null,        // student | founder | sales | creator
  userGoal: null,        // money | discipline | focus | decisions
  userReminder: 'evening',
  userIntensity: 'moderate', // easy | moderate | intense
  isGuest: false,
  guestStartDate: null,
  onboardingDone: false,
  todayScore: null,
  todayScores: { execution: 0, reasoning: 0, focus: 0, financial: 0 },
  todayAnswers: {},
  scoreHistory: [],        // [{date,score,scores,waste}]
  streak: 0,
  lastReviewDate: null,
  missions: [],
  completedMissions: [],
  totalMissionsCompleted: 0,
  insightIndex: 0,
  reviewGuideDismissed: false,
  reviewGuideShown: false,
  // ── Waste tracking ──
  wasteTimeHours: 0,
  wasteMoney: 0,
  wastePotential: 0,
};

function saveState() {
  try { localStorage.setItem('imperium_state', JSON.stringify(STATE)); } catch (e) {}
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('imperium_state'));
    if (s) Object.assign(STATE, s);
  } catch (e) {}
}

/* ── BOOT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  if (!STATE.onboardingDone && !STATE.userEmail && !STATE.isGuest) {
    showScreen('screen-auth');
  } else if (!STATE.onboardingDone) {
    showScreen('screen-onboarding');
  } else {
    showMainApp();
  }
  initParticles();
  initAurora();
  initRevealAnimations();
  initTiltEffects();
});

function showMainApp() {
  showScreen('screen-home');
  initHomeDashboard();
  initBeams();
  if (STATE.isGuest) initGuestMode();
  showInsightWidget();
}

/* ── AUTH ──────────────────────────────────────────────────── */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-' + tab).classList.add('active');
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-password').value;
  if (!email || !pw) return showAuthMessage('Enter your email and password');
  STATE.userEmail = email;
  STATE.userName = email.split('@')[0];
  STATE.isGuest = false;
  saveState();
  if (!STATE.onboardingDone) { showScreen('screen-onboarding'); } else { showMainApp(); }
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pw = document.getElementById('signup-password').value;
  if (!name || !email || !pw) return showAuthMessage('Fill in all fields');
  if (pw.length < 8) return showAuthMessage('Password must be at least 8 characters');
  STATE.userName = name;
  STATE.userEmail = email;
  STATE.isGuest = false;
  saveState();
  showScreen('screen-onboarding');
}

function handleSocialAuth(provider) {
  STATE.userName = provider + ' User';
  STATE.userEmail = provider.toLowerCase() + '@demo.com';
  STATE.isGuest = false;
  saveState();
  if (!STATE.onboardingDone) { showScreen('screen-onboarding'); } else { showMainApp(); }
}

function continueAsGuest() {
  STATE.isGuest = true;
  STATE.userName = 'Guest';
  if (!STATE.guestStartDate) STATE.guestStartDate = new Date().toISOString();
  saveState();
  showScreen('screen-onboarding');
}

function togglePassword(fieldId, btn) {
  const input = document.getElementById(fieldId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showAuthMessage(msg) {
  const toast = document.getElementById('auth-toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function skipToAuth() { showScreen('screen-auth'); }

/* ── ONBOARDING ───────────────────────────────────────────── */
let obStep = 1;

function updateAIText(text) {
  const el = document.getElementById('ob-ai-text');
  if (el) el.textContent = text;
}

function selectRole(el) {
  const cards = el.parentElement.querySelectorAll('.ob-card');
  cards.forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  STATE.userRole = el.dataset.value;
  saveState();
  updateAIText(`Got it — ${el.querySelector('.ob-card-label').textContent}. Now tell me what's holding you back.`);
  setTimeout(() => advanceOB(2), 400);
}

function selectGoal(el) {
  const cards = el.parentElement.querySelectorAll('.ob-card');
  cards.forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  STATE.userGoal = el.dataset.value;
  saveState();
  updateAIText(`${el.querySelector('.ob-card-label').textContent}. I'll design everything to fix that.`);
  setTimeout(() => advanceOB(3), 400);
}

function selectReminder(el) {
  const cards = el.parentElement.querySelectorAll('.ob-card');
  cards.forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  STATE.userReminder = el.dataset.value;
  saveState();
  updateAIText('Last question — this one\'s important.');
  setTimeout(() => advanceOB(4), 400);
}

function selectIntensity(el) {
  const cards = el.parentElement.querySelectorAll('.ob-card');
  cards.forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  STATE.userIntensity = el.dataset.value;
  saveState();
  const labels = { easy: 'gentle', moderate: 'direct', intense: 'brutal' };
  updateAIText(`${labels[el.dataset.value].charAt(0).toUpperCase() + labels[el.dataset.value].slice(1)} it is. Let's see what you're wasting.`);
}

function advanceOB(step) {
  obStep = step;
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-step-' + step).classList.add('active');
  document.getElementById('ob-progress-fill').style.width = (step * 25) + '%';
  document.getElementById('ob-step-label').textContent = `Step ${step} of 4`;
}

function finishOnboarding() {
  STATE.onboardingDone = true;
  saveState();
  showMainApp();
}

/* ── NAVIGATION ───────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.remove('screen-exit');
  });
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  // Nav highlight
  const navMap = {
    'screen-home': 'nav-home',
    'screen-missions': 'nav-missions',
    'screen-results': 'nav-results',
    'screen-progress': 'nav-progress',
    'screen-profile': 'nav-profile'
  };
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navId = navMap[id];
  if (navId) document.getElementById(navId).classList.add('active');

  // Show/hide nav
  const nav = document.getElementById('bottom-nav');
  const hasNav = ['screen-home', 'screen-missions', 'screen-results', 'screen-progress', 'screen-profile'].includes(id);
  nav.classList.toggle('hidden', !hasNav);
}

function navigateTo(id) {
  const current = document.querySelector('.screen.active');
  if (current) {
    current.classList.add('screen-exit');
    setTimeout(() => {
      current.classList.remove('active', 'screen-exit');
      showScreen(id);
      onScreenEnter(id);
      // Re-init reveal animations for new screen content
      setTimeout(() => initRevealAnimations(), 100);
    }, 250);
  } else {
    showScreen(id);
    onScreenEnter(id);
    setTimeout(() => initRevealAnimations(), 100);
  }
}

function onScreenEnter(id) {
  if (id === 'screen-home') initHomeDashboard();
  if (id === 'screen-results') initResults();
  if (id === 'screen-missions') initMissions();
  if (id === 'screen-progress') initProgress();
  if (id === 'screen-profile') initProfile();
  if (id === 'screen-review') startReview();
}

/* ── HOME DASHBOARD ───────────────────────────────────────── */
function initHomeDashboard() {
  setGreeting();
  setScoreDate();

  const hasReview = STATE.todayScore !== null && STATE.lastReviewDate === getToday();
  const firstRun = document.getElementById('first-run-section');
  const returning = document.getElementById('returning-section');

  if (!hasReview && STATE.scoreHistory.length === 0) {
    // Never reviewed — show first-run
    firstRun.classList.remove('hidden');
    returning.classList.add('hidden');
    if (STATE.isGuest) {
      document.getElementById('first-run-auth').classList.remove('hidden');
    } else {
      document.getElementById('first-run-auth').classList.add('hidden');
    }
    document.querySelector('.review-btn').classList.add('hidden');
  } else {
    firstRun.classList.add('hidden');
    returning.classList.remove('hidden');
    document.querySelector('.review-btn').classList.remove('hidden');

    if (hasReview) {
      animateRing(STATE.todayScore);
      updatePillars(STATE.todayScores);
      updateVerdict(STATE.todayScore);
      updateWasteSection();
      updateScorePotential(STATE.todayScore);
    } else {
      // Has history but not today
      animateRing(0);
      updatePillars({ execution: 0, reasoning: 0, focus: 0, financial: 0 });
      updateVerdict(null);
      updateWasteSection();
    }

    updateQuickStats();
  }
}

function setGreeting() {
  const h = new Date().getHours();
  let g = 'Good evening';
  if (h < 12) g = 'Good morning';
  else if (h < 17) g = 'Good afternoon';
  const name = STATE.userName || '';
  document.getElementById('greeting-text').textContent = name ? `${g}, ${name.split(' ')[0]}` : g;
}

function setScoreDate() {
  const d = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric' };
  document.getElementById('score-date').textContent = d.toLocaleDateString('en-US', opts);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function animateRing(score) {
  const circle = document.getElementById('score-ring-circle');
  const numEl = document.getElementById('daily-score');
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)';
    circle.style.strokeDashoffset = offset;
  }, 300);
  animateNumber(numEl, 0, score, 1200);

  // Celebrate high scores
  if (score >= 85) {
    setTimeout(() => fireConfetti(), 800);
  }
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updatePillars(scores) {
  ['execution', 'reasoning', 'focus', 'financial'].forEach(key => {
    const bar = document.getElementById('pillar-' + key);
    const val = document.getElementById('pillar-' + key + '-val');
    if (bar) {
      setTimeout(() => { bar.style.width = scores[key] + '%'; }, 300);
    }
    if (val) val.textContent = scores[key];
  });
}

function animatePillar(bar, val, score) {
  setTimeout(() => { bar.style.width = score + '%'; }, 300);
  animateNumber(val, 0, score, 1000);
}

function updateVerdict(score) {
  const emoji = document.getElementById('verdict-emoji');
  const headline = document.getElementById('verdict-headline');
  const sub = document.getElementById('verdict-sub');

  if (score === null) {
    emoji.textContent = '⚡';
    headline.textContent = "You haven't checked in yet today.";
    sub.textContent = 'Do your 2-minute review to see today\'s reality check.';
    return;
  }

  const intensity = STATE.userIntensity || 'moderate';

  if (score >= 85) {
    emoji.textContent = '🔥';
    headline.textContent = intensity === 'intense' ? 'Dangerous day. Keep this up.' : 'Strong day. You showed up.';
    sub.textContent = 'You operated near your potential today. Lock this in tomorrow.';
  } else if (score >= 70) {
    emoji.textContent = '⚡';
    headline.textContent = intensity === 'intense' ? 'Decent. But "decent" doesn\'t build empires.' : 'Good day, but you left something on the table.';
    sub.textContent = `Your score was ${score}. You can do better and you know it.`;
  } else if (score >= 50) {
    emoji.textContent = '😐';
    headline.textContent = intensity === 'intense' ? 'Mediocre. This is where people stay stuck.' : 'Average day. Room for improvement.';
    sub.textContent = `Score: ${score}. Half your potential was wasted. Check the damage below.`;
  } else if (score >= 30) {
    emoji.textContent = '⚠️';
    headline.textContent = intensity === 'intense' ? 'Bad day. You wasted most of it.' : 'Rough day. Let\'s figure out what went wrong.';
    sub.textContent = `Score: ${score}. Most of your time and energy went to nothing.`;
  } else {
    emoji.textContent = '🚨';
    headline.textContent = intensity === 'intense' ? 'You burned this day. It\'s gone forever.' : 'Very tough day. Tomorrow is a reset.';
    sub.textContent = `Score: ${score}. Nearly everything was wasted. Read the report below.`;
  }
}

function updateWasteSection() {
  const hasReview = STATE.lastReviewDate === getToday() && STATE.todayScore !== null;

  document.getElementById('waste-time-val').textContent = hasReview ? STATE.wasteTimeHours.toFixed(1) + 'h' : '—';
  document.getElementById('waste-money-val').textContent = hasReview ? '$' + STATE.wasteMoney : '—';
  document.getElementById('waste-potential-val').textContent = hasReview ? STATE.wastePotential + '%' : '—';
  document.getElementById('waste-streak-val').textContent = STATE.streak;
}

function updateScorePotential(score) {
  const el = document.getElementById('score-potential');
  if (!el) return;
  if (score === null) { el.textContent = ''; return; }
  const gap = 100 - score;
  if (gap <= 15) el.textContent = 'Operating near maximum capacity';
  else if (gap <= 35) el.textContent = `${gap}% of your potential is untapped`;
  else el.textContent = `${gap}% wasted. That's ${(gap * 0.16).toFixed(1)} hours of your day gone.`;
}

function updateQuickStats() {
  document.getElementById('streak-count').textContent = STATE.streak;

  const done = STATE.completedMissions ? STATE.completedMissions.length : 0;
  const total = STATE.missions ? STATE.missions.length : 3;
  document.getElementById('missions-done').textContent = `${done}/${total}`;

  const history = STATE.scoreHistory || [];
  const recent = history.slice(-7);
  if (recent.length > 0) {
    const avg = Math.round(recent.reduce((a, b) => a + b.score, 0) / recent.length);
    document.getElementById('weekly-avg').textContent = avg;
  } else {
    document.getElementById('weekly-avg').textContent = '--';
  }
}

/* ── REVIEW GUIDE ─────────────────────────────────────────── */
function dismissReviewGuide() {
  const guide = document.getElementById('review-guide');
  guide.classList.add('hidden');
  STATE.reviewGuideDismissed = true;
  saveState();
}

function showReviewGuideIfNeeded() {
  if (STATE.reviewGuideDismissed) return;
  const guide = document.getElementById('review-guide');
  guide.classList.remove('hidden');
  STATE.reviewGuideShown = true;
}

/* ── VOICE INPUT ──────────────────────────────────────────── */
let recognition = null;
let isListening = false;

function toggleVoiceInput() {
  if (isListening) { stopVoiceInput(); }
  else { startVoiceInput(); }
}

function startVoiceInput() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showAuthMessage('Voice input not supported in this browser');
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('chat-text-field').value = text;
    stopVoiceInput();
  };
  recognition.onerror = () => { stopVoiceInput(); };
  recognition.onend = () => { stopVoiceInput(); };

  recognition.start();
  isListening = true;
  document.getElementById('chat-mic-btn').classList.add('listening');
}

function stopVoiceInput() {
  if (recognition) { try { recognition.stop(); } catch (e) {} }
  isListening = false;
  const btn = document.getElementById('chat-mic-btn');
  if (btn) btn.classList.remove('listening');
}

/* ── DAILY REVIEW ─────────────────────────────────────────── */
const REVIEW_QUESTIONS = [
  {
    id: 'wins',
    question: "What did you actually accomplish today?",
    placeholder: "Be specific — tasks shipped, meetings run, problems solved…",
    type: 'text',
    followUp: (answer) => answer.length < 15 ? "That's pretty vague. Give me something concrete." : null
  },
  {
    id: 'time_wasted',
    question: "How many hours did you waste on things that didn't matter?",
    placeholder: "Scrolling, overthinking, unnecessary meetings…",
    type: 'text',
    followUp: (answer) => {
      const num = parseFloat(answer);
      if (!isNaN(num) && num >= 4) return "That's almost half your waking day. What specifically ate that time?";
      return null;
    }
  },
  {
    id: 'distractions',
    question: "What pulled you away from important work?",
    placeholder: "Phone, notifications, people, procrastination…",
    type: 'text',
    followUp: null
  },
  {
    id: 'decisions',
    question: "What was the biggest decision you made today? Was it good?",
    placeholder: "Describe the decision and whether it was right or wrong…",
    type: 'text',
    followUp: (answer) => {
      const lower = answer.toLowerCase();
      if (lower.includes('bad') || lower.includes('wrong') || lower.includes('mistake') || lower.includes("shouldn't"))
        return "What would you do differently if you could redo it?";
      return null;
    }
  },
  {
    id: 'money_spent',
    question: "How much money did you spend today? On what?",
    placeholder: "Approximate total — be honest about impulse buys…",
    type: 'text',
    followUp: (answer) => {
      const num = parseFloat(answer.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 100) return "Over $100 in a day. Was any of that truly necessary?";
      return null;
    }
  },
  {
    id: 'learning',
    question: "What did you learn or practice today?",
    placeholder: "Books, courses, skills practiced, lessons from mistakes…",
    type: 'text',
    followUp: (answer) => answer.toLowerCase().includes('nothing') ? "Zero learning means zero growth. That's a wasted day." : null
  },
  {
    id: 'tomorrow',
    question: "What's the ONE thing that would make tomorrow worth it?",
    placeholder: "The single most important thing you should do…",
    type: 'text',
    followUp: null
  }
];

let currentQuestion = 0;
let reviewAnswers = {};
let isFollowUp = false;

function startReview() {
  currentQuestion = 0;
  reviewAnswers = {};
  isFollowUp = false;

  const messages = document.getElementById('chat-messages');
  messages.innerHTML = '';

  const options = document.getElementById('chat-options');
  options.innerHTML = '';
  options.classList.add('hidden');

  document.getElementById('chat-text-row').classList.remove('hidden');
  document.getElementById('chat-text-field').value = '';
  document.getElementById('review-step-text').textContent = '1/7';
  document.getElementById('chat-status-text').textContent = 'Analyzing your day';

  showReviewGuideIfNeeded();
  askQuestion(0);
}

function askQuestion(index) {
  if (index >= REVIEW_QUESTIONS.length) {
    finishReview();
    return;
  }

  const q = REVIEW_QUESTIONS[index];
  document.getElementById('review-step-text').textContent = `${index + 1}/7`;

  const placeholder = document.getElementById('chat-text-field');
  placeholder.placeholder = q.placeholder || 'Type your answer…';
  placeholder.focus();

  showTypingThenBubble(q.question, 'ai');
}

function showTypingThenBubble(text, sender) {
  const messages = document.getElementById('chat-messages');

  if (sender === 'ai') {
    const typing = document.createElement('div');
    typing.className = 'chat-bubble ai typing-bubble';
    typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    setTimeout(() => {
      typing.remove();
      addBubble(text, 'ai');
    }, 800 + Math.random() * 400);
  } else {
    addBubble(text, sender);
  }
}

function addBubble(text, sender) {
  const messages = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender} anim-fade-in`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function sendTextAnswer() {
  const input = document.getElementById('chat-text-field');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addBubble(text, 'user');
  submitAnswer(text);
}

function submitAnswer(text) {
  if (isFollowUp) {
    // Follow-up answer — store and move on
    reviewAnswers[REVIEW_QUESTIONS[currentQuestion].id + '_followup'] = text;
    isFollowUp = false;
    currentQuestion++;
    setTimeout(() => askQuestion(currentQuestion), 500);
    return;
  }

  const q = REVIEW_QUESTIONS[currentQuestion];
  reviewAnswers[q.id] = text;

  // Check for follow-up
  if (q.followUp) {
    const follow = q.followUp(text);
    if (follow) {
      isFollowUp = true;
      setTimeout(() => showTypingThenBubble(follow, 'ai'), 500);
      return;
    }
  }

  currentQuestion++;
  setTimeout(() => askQuestion(currentQuestion), 500);
}

// Handle enter key in chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'chat-text-field') {
    e.preventDefault();
    sendTextAnswer();
  }
});

function finishReview() {
  document.getElementById('chat-text-row').classList.add('hidden');
  document.getElementById('chat-status-text').textContent = 'Generating reality check…';

  showTypingThenBubble('Analyzing everything you told me…', 'ai');

  setTimeout(() => {
    const result = analyseDay(reviewAnswers);
    STATE.todayScore = result.score;
    STATE.todayScores = result.scores;
    STATE.todayAnswers = reviewAnswers;
    STATE.lastReviewDate = getToday();

    // Calculate waste metrics
    STATE.wasteTimeHours = calculateWasteTime(reviewAnswers);
    STATE.wasteMoney = calculateWasteMoney(reviewAnswers);
    STATE.wastePotential = Math.max(0, 100 - result.score);

    // Update streak
    updateStreak();

    // Save to history
    STATE.scoreHistory.push({
      date: getToday(),
      score: result.score,
      scores: { ...result.scores },
      waste: {
        time: STATE.wasteTimeHours,
        money: STATE.wasteMoney,
        potential: STATE.wastePotential
      }
    });

    // Generate missions
    STATE.missions = generateAdaptiveMissions(result.scores);
    STATE.completedMissions = [];

    saveState();

    const intensity = STATE.userIntensity || 'moderate';
    let verdict = '';
    if (result.score >= 80) {
      verdict = intensity === 'intense'
        ? `${result.score}/100. Not bad. Don't get comfortable.`
        : `${result.score}/100. Solid day. You showed up.`;
    } else if (result.score >= 50) {
      verdict = intensity === 'intense'
        ? `${result.score}/100. Mediocre. You wasted ${STATE.wasteTimeHours.toFixed(1)} hours and burned $${STATE.wasteMoney}. That's the cost of not caring.`
        : `${result.score}/100. You wasted ${STATE.wasteTimeHours.toFixed(1)} hours today. There's room to do better.`;
    } else {
      verdict = intensity === 'intense'
        ? `${result.score}/100. You burned this day. ${STATE.wasteTimeHours.toFixed(1)} hours gone. $${STATE.wasteMoney} wasted. This is what failure looks like in slow motion.`
        : `${result.score}/100. Tough day. ${STATE.wasteTimeHours.toFixed(1)} hours wasted. Let's build a better plan for tomorrow.`;
    }

    setTimeout(() => {
      showTypingThenBubble(verdict, 'ai');

      setTimeout(() => {
        const viewBtn = document.createElement('div');
        viewBtn.className = 'chat-action-row anim-fade-in';
        viewBtn.innerHTML = `<button class="btn-primary" onclick="navigateTo('screen-results')" style="width:100%;margin-top:8px">View Full Reality Check →</button>`;
        document.getElementById('chat-messages').appendChild(viewBtn);
        document.getElementById('chat-messages').scrollTop = 99999;
      }, 1200);
    }, 1500);
  }, 2000);
}

function calculateWasteTime(answers) {
  const timeText = answers.time_wasted || '';
  const nums = timeText.match(/[\d.]+/);
  if (nums) return Math.min(parseFloat(nums[0]), 16);

  // Keyword estimates
  const lower = timeText.toLowerCase();
  if (lower.includes('most') || lower.includes('all day')) return 8;
  if (lower.includes('half') || lower.includes('lot')) return 5;
  if (lower.includes('some') || lower.includes('couple') || lower.includes('few')) return 2.5;
  if (lower.includes('little') || lower.includes('barely') || lower.includes('none')) return 0.5;
  return 2;
}

function calculateWasteMoney(answers) {
  const moneyText = answers.money_spent || '';
  const nums = moneyText.match(/[\d.]+/);
  if (nums) return Math.round(parseFloat(nums[0]));

  const lower = moneyText.toLowerCase();
  if (lower.includes('lot') || lower.includes('hundred') || lower.includes('splurge')) return 120;
  if (lower.includes('some') || lower.includes('moderate')) return 40;
  if (lower.includes('nothing') || lower.includes('zero') || lower.includes('none') || lower.includes('free')) return 0;
  return 25;
}

function updateStreak() {
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (STATE.lastReviewDate === yesterday || STATE.streak === 0) {
    STATE.streak = (STATE.streak || 0) + 1;
  } else if (STATE.lastReviewDate !== today) {
    STATE.streak = 1;
  }
}

/* ── AI ANALYSIS ENGINE ───────────────────────────────────── */
function analyseDay(answers) {
  const exec = calcExecutionScore(answers);
  const reason = calcReasoningScore(answers);
  const focus = calcFocusScore(answers);
  const fin = calcFinancialScore(answers);

  const score = Math.round((exec + reason + focus + fin) / 4);
  return { score, scores: { execution: exec, reasoning: reason, focus: focus, financial: fin } };
}

function calcExecutionScore(a) {
  let s = 50;
  const wins = (a.wins || '').toLowerCase();
  const wLen = wins.length;

  if (wLen > 100) s += 20;
  else if (wLen > 50) s += 12;
  else if (wLen > 20) s += 5;
  else s -= 10;

  const goodWords = ['shipped', 'launched', 'completed', 'finished', 'built', 'delivered', 'closed', 'sold', 'published', 'submitted', 'deployed', 'created', 'wrote', 'made', 'hit', 'achieved', 'crushed', 'nailed', 'smashed'];
  const badWords = ['nothing', 'didn\'t', 'failed', 'couldn\'t', 'procrastinated', 'lazy', 'skipped', 'forgot', 'zero', 'none', 'barely'];

  goodWords.forEach(w => { if (wins.includes(w)) s += 5; });
  badWords.forEach(w => { if (wins.includes(w)) s -= 8; });

  return Math.max(0, Math.min(100, s));
}

function calcReasoningScore(a) {
  let s = 50;
  const decisions = (a.decisions || '').toLowerCase();
  const dLen = decisions.length;

  if (dLen > 80) s += 15;
  else if (dLen > 30) s += 8;
  else s -= 5;

  const goodWords = ['analyzed', 'thought', 'considered', 'weighed', 'strategic', 'planned', 'calculated', 'intentional', 'smart', 'right', 'good decision', 'wise', 'logical'];
  const badWords = ['impulsive', 'rushed', 'didn\'t think', 'mistake', 'bad', 'wrong', 'regret', 'stupid', 'dumb', 'reactive', 'emotional', 'irrational'];

  goodWords.forEach(w => { if (decisions.includes(w)) s += 5; });
  badWords.forEach(w => { if (decisions.includes(w)) s -= 7; });

  const learning = (a.learning || '').toLowerCase();
  if (learning.includes('nothing') || learning.includes('none') || learning.length < 10) s -= 10;
  else if (learning.length > 50) s += 10;
  else s += 5;

  return Math.max(0, Math.min(100, s));
}

function calcFocusScore(a) {
  let s = 50;
  const distractions = (a.distractions || '').toLowerCase();
  const timeWasted = (a.time_wasted || '').toLowerCase();

  const badWords = ['phone', 'social media', 'tiktok', 'instagram', 'twitter', 'reddit', 'youtube', 'netflix', 'scrolling', 'notifications', 'texting', 'browsing', 'procrastinat', 'distracted'];
  badWords.forEach(w => { if (distractions.includes(w)) s -= 6; });

  const wasteHours = calculateWasteTime(a);
  if (wasteHours >= 6) s -= 25;
  else if (wasteHours >= 4) s -= 18;
  else if (wasteHours >= 2) s -= 10;
  else if (wasteHours <= 1) s += 15;

  if (distractions.length < 10 || distractions.includes('none') || distractions.includes('nothing')) s += 12;

  return Math.max(0, Math.min(100, s));
}

function calcFinancialScore(a) {
  let s = 60;
  const money = (a.money_spent || '').toLowerCase();
  const amount = calculateWasteMoney(a);

  if (amount === 0) s += 20;
  else if (amount <= 15) s += 10;
  else if (amount <= 50) s -= 5;
  else if (amount <= 100) s -= 15;
  else s -= 25;

  const badWords = ['impulse', 'unnecessary', 'splurge', 'wasted', 'regret', 'shouldn\'t', 'didn\'t need', 'drunk', 'gambling', 'bet'];
  const goodWords = ['invested', 'saved', 'earned', 'budget', 'necessary', 'planned', 'needed', 'essential'];

  badWords.forEach(w => { if (money.includes(w)) s -= 6; });
  goodWords.forEach(w => { if (money.includes(w)) s += 5; });

  return Math.max(0, Math.min(100, s));
}

/* ── INSIGHT GENERATORS ───────────────────────────────────── */
function generateMistake(answers, scores) {
  const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
  const intensity = STATE.userIntensity || 'moderate';

  const insights = {
    execution: {
      easy: `Your execution was weakest today at ${lowest[1]}/100. Focus on shipping one concrete thing tomorrow.`,
      moderate: `Execution scored ${lowest[1]}/100 — lowest of all signals. You planned but didn't ship. Plans without output are just daydreaming.`,
      intense: `Execution: ${lowest[1]}/100. You did almost nothing productive today. All your "plans" were just excuses to feel busy without delivering. Ship or shut up.`
    },
    reasoning: {
      easy: `Your decision-making could improve. Consider taking more time before making choices.`,
      moderate: `Reasoning scored ${lowest[1]}/100. You're making decisions on autopilot. Bad inputs = bad outputs. Start thinking before acting.`,
      intense: `Reasoning: ${lowest[1]}/100. Your decisions today were garbage. You're running your life on impulse and wondering why nothing works. Think. Then act.`
    },
    focus: {
      easy: `Focus was your weakest area. Try reducing distractions during your most important work.`,
      moderate: `Focus scored ${lowest[1]}/100. You let distractions control your day. Every hour of distraction is an hour of your life you'll never get back.`,
      intense: `Focus: ${lowest[1]}/100. You're a professional scroller. Your phone is eating your life and you're feeding it voluntarily. Pathetic.`
    },
    financial: {
      easy: `Your spending could be more intentional. Track where your money goes.`,
      moderate: `Financial score: ${lowest[1]}/100. You're leaking money on things that add zero value to your life. Every unnecessary dollar spent is a dollar that can't work for you.`,
      intense: `Financial: ${lowest[1]}/100. You're burning money like you print it. This spending pattern will keep you broke forever. Every dollar wasted is future freedom destroyed.`
    }
  };

  return insights[lowest[0]][intensity];
}

function generateMoneyImpact(answers, scores) {
  const amount = calculateWasteMoney(answers);
  const intensity = STATE.userIntensity || 'moderate';

  if (amount === 0) return 'Zero unnecessary spending today. That\'s discipline.';

  const monthly = amount * 30;
  const yearly = amount * 365;

  if (intensity === 'intense') {
    return `You burned $${amount} today. That's $${monthly.toLocaleString()} a month, $${yearly.toLocaleString()} a year — gone. At this rate, you're choosing to stay broke. Every dollar you waste is a vote for staying exactly where you are.`;
  } else if (intensity === 'moderate') {
    return `$${amount} spent today. Projected: $${monthly.toLocaleString()}/month, $${yearly.toLocaleString()}/year. Ask yourself — did any of that spending move you closer to your goals?`;
  } else {
    return `You spent about $${amount} today. That adds up to ~$${monthly.toLocaleString()} monthly. Consider which expenses are truly necessary.`;
  }
}

function generateThinkingPattern(answers, scores) {
  const reasoning = scores.reasoning;
  const intensity = STATE.userIntensity || 'moderate';

  if (reasoning >= 80) {
    return 'Your decision-making was sharp today. You thought before acting and it showed in your results.';
  } else if (reasoning >= 60) {
    return intensity === 'intense'
      ? 'Your thinking was okay. Not terrible, not great. "Okay" thinking produces "okay" results. You want more than okay.'
      : 'Some solid decisions today, but a few were reactive. Take an extra 30 seconds before your next big call.';
  } else if (reasoning >= 40) {
    return intensity === 'intense'
      ? `Reasoning at ${reasoning}/100 means you're running on autopilot. You're not thinking — you're just reacting. That's how you end up in the same place year after year.`
      : `Reasoning scored ${reasoning}/100. Several reactive decisions today. Try writing down pros/cons before your next big choice.`;
  } else {
    return intensity === 'intense'
      ? `${reasoning}/100 on reasoning. Your brain was off today. You made decisions a coin flip could've beaten. Start asking "why" before every action.`
      : `Reasoning was low today at ${reasoning}/100. Tomorrow, pause and think through your decisions more carefully before acting.`;
  }
}

function generateMissedOpp(answers, scores) {
  const focus = scores.focus;
  const execution = scores.execution;
  const hours = calculateWasteTime(answers);
  const intensity = STATE.userIntensity || 'moderate';

  if (intensity === 'intense') {
    if (hours >= 4) return `You wasted ${hours.toFixed(1)} hours today. That's ${(hours * 365).toFixed(0)} hours a year — ${(hours * 365 / 24).toFixed(0)} full days — doing nothing. Imagine where you'd be if you used half of that time on your goals.`;
    if (focus < 50) return `Your focus was shot. Every notification you checked, every time you picked up your phone — that was you choosing distraction over progress. The gap between where you are and where you want to be is filled with those choices.`;
    if (execution < 50) return `Low execution means low output. You had the same 24 hours as everyone else. Some people built businesses today. You procrastinated. What's your excuse?`;
    return `You left performance on the table today. The gap between your potential and your output is where regret lives.`;
  }

  if (hours >= 4) return `${hours.toFixed(1)} wasted hours today. Over a year, that's ${(hours * 365 / 24).toFixed(0)} full days. Small daily waste compounds into massive lost potential.`;
  if (focus < 50) return `Focus was your biggest leak. Consider: phone in another room, notifications off, one task at a time.`;
  return `There's a gap between what you did and what you could've done. Tomorrow's missions are designed to close that gap.`;
}

function generateFixes(answers, scores) {
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const fixes = [];

  const fixMap = {
    execution: [
      'Ship ONE deliverable before noon — no excuses, no delays.',
      'Write your 3 non-negotiable tasks tonight. Do them first thing.',
      'Set a 90-minute deep work block. Phone off. Door closed.',
    ],
    reasoning: [
      'Before every decision today, write down 2 alternatives.',
      'Journal for 10 minutes about yesterday\'s mistakes.',
      'Read 20 pages of something that challenges how you think.',
    ],
    focus: [
      'Phone goes in another room during work hours.',
      'Delete the app you waste the most time on. Today.',
      'Use a timer: 50 minutes focused work, 10 minutes break.',
    ],
    financial: [
      'Before every purchase, ask: "Do I need this, or do I want it?"',
      'Track every dollar you spend today. Write it down.',
      'Set a $20 daily spending cap and stick to it.',
    ]
  };

  sorted.slice(0, 2).forEach(([key]) => {
    const pool = fixMap[key];
    fixes.push(pool[Math.floor(Math.random() * pool.length)]);
  });

  // Always add a general one
  const general = [
    'Review this report before bed. Let it sink in.',
    'Tell one person your #1 goal for tomorrow. Accountability works.',
    'Go to bed 30 minutes earlier. Sleep is the foundation.',
  ];
  fixes.push(general[Math.floor(Math.random() * general.length)]);

  return fixes;
}

/* ── ADAPTIVE MISSIONS ────────────────────────────────────── */
function generateAdaptiveMissions(scores) {
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0][0];
  const second = sorted[1][0];

  const missionPools = {
    student: {
      execution: [
        { task: 'Complete your hardest assignment before lunch', time: '~90 min', why: 'Execution was your weakest signal' },
        { task: 'Study for 2 hours with phone in another room', time: '~120 min', why: 'Deep work builds execution muscle' },
        { task: 'Submit or finish one pending assignment', time: '~60 min', why: 'Shipping beats planning' },
      ],
      reasoning: [
        { task: 'Teach one concept to someone else', time: '~30 min', why: 'Teaching forces deeper understanding' },
        { task: 'Write a one-page analysis of a decision you made', time: '~20 min', why: 'Reflection strengthens reasoning' },
        { task: 'Read 30 pages of non-fiction', time: '~45 min', why: 'Better inputs = better thinking' },
      ],
      focus: [
        { task: 'Do a 90-min focus session — no phone, no tabs', time: '~90 min', why: 'Your focus score needs work' },
        { task: 'Delete or hide your most distracting app for 24 hours', time: '~2 min', why: 'Remove the temptation entirely' },
        { task: 'Use a website blocker during study hours', time: '~5 min', why: 'Willpower is limited — use systems' },
      ],
      financial: [
        { task: 'Track every rupee/dollar spent today', time: '~5 min', why: 'Awareness is the first step' },
        { task: 'Find one subscription you can cancel', time: '~10 min', why: 'Small leaks sink ships' },
        { task: 'Cook at home instead of ordering out', time: '~30 min', why: 'Small savings compound fast' },
      ]
    },
    founder: {
      execution: [
        { task: 'Ship one feature, email, or deliverable before noon', time: '~60 min', why: 'Execution was weakest' },
        { task: 'Close one open loop that\'s been sitting for 3+ days', time: '~45 min', why: 'Open loops drain energy' },
        { task: 'Write and send one cold email or outreach', time: '~15 min', why: 'Nothing happens without output' },
      ],
      reasoning: [
        { task: 'Write a 1-page memo on your biggest current bet', time: '~30 min', why: 'Clarity on strategy is everything' },
        { task: 'List 3 assumptions you\'re making and test one', time: '~20 min', why: 'Untested assumptions are risks' },
        { task: 'Talk to one customer/user for feedback', time: '~30 min', why: 'Real data beats assumptions' },
      ],
      focus: [
        { task: '3-hour deep work block on your #1 priority', time: '~180 min', why: 'Focus compounds' },
        { task: 'Say no to one meeting or request today', time: '~2 min', why: 'Protect your time ruthlessly' },
        { task: 'Work from a different location with no distractions', time: '~all day', why: 'Environment shapes behavior' },
      ],
      financial: [
        { task: 'Review your runway — how many months do you have?', time: '~15 min', why: 'Cash awareness = survival' },
        { task: 'Cut one unnecessary business expense', time: '~10 min', why: 'Lean operations win' },
        { task: 'Invoice one client or follow up on unpaid work', time: '~10 min', why: 'Revenue waits for no one' },
      ]
    },
    sales: {
      execution: [
        { task: 'Make 10 outbound calls or messages before noon', time: '~60 min', why: 'Volume drives results in sales' },
        { task: 'Follow up with every warm lead from this week', time: '~45 min', why: 'Fortune is in the follow-up' },
        { task: 'Close one deal or move one prospect forward', time: '~varies', why: 'Movement beats stagnation' },
      ],
      reasoning: [
        { task: 'Review your last 5 lost deals — find the pattern', time: '~30 min', why: 'Learn from losses' },
        { task: 'Script a new objection handler and practice it', time: '~20 min', why: 'Preparation beats talent' },
        { task: 'Study one competitor\'s pitch and identify weaknesses', time: '~30 min', why: 'Know the battlefield' },
      ],
      focus: [
        { task: 'Block 2 hours for prospecting — nothing else', time: '~120 min', why: 'Focused prospecting outperforms scattered work' },
        { task: 'Turn off email notifications during selling hours', time: '~1 min', why: 'Interruptions kill momentum' },
        { task: 'Do your most dreaded task first thing', time: '~30 min', why: 'Eat the frog' },
      ],
      financial: [
        { task: 'Calculate your effective hourly rate this week', time: '~10 min', why: 'Know what your time is worth' },
        { task: 'Identify one way to increase your average deal size', time: '~15 min', why: 'Same effort, more revenue' },
        { task: 'Set a specific income target for this month', time: '~5 min', why: 'Targets create focus' },
      ]
    },
    creator: {
      execution: [
        { task: 'Publish one piece of content today', time: '~60 min', why: 'Consistency beats perfection' },
        { task: 'Finish the draft you\'ve been sitting on', time: '~90 min', why: 'Done is better than perfect' },
        { task: 'Batch-create 3 pieces of content', time: '~120 min', why: 'Batching is efficient' },
      ],
      reasoning: [
        { task: 'Analyze your top-performing content — why did it work?', time: '~20 min', why: 'Data-driven creation wins' },
        { task: 'Study one creator who\'s ahead of you', time: '~30 min', why: 'Learn from the best' },
        { task: 'Write down your content strategy for the next 7 days', time: '~15 min', why: 'Strategy prevents randomness' },
      ],
      focus: [
        { task: 'Create for 90 minutes with zero social media', time: '~90 min', why: 'Consuming kills creating' },
        { task: 'Separate creation time from consumption time today', time: '~all day', why: 'Mixing them destroys both' },
        { task: 'Use airplane mode during your creation block', time: '~1 min', why: 'Total focus, total output' },
      ],
      financial: [
        { task: 'Pitch one brand for a collaboration', time: '~30 min', why: 'Monetize what you create' },
        { task: 'Review your income streams — which one can grow?', time: '~15 min', why: 'Focus on what scales' },
        { task: 'Set up one new income stream (course, product, etc)', time: '~varies', why: 'Diversification = security' },
      ]
    }
  };

  const role = STATE.userRole || 'founder';
  const pool = missionPools[role] || missionPools.founder;

  const missions = [];

  // Two missions from weakest areas
  [weakest, second].forEach(pillar => {
    const options = pool[pillar] || pool.execution;
    const mission = options[Math.floor(Math.random() * options.length)];
    missions.push({ ...mission, pillar });
  });

  // Stretch mission from a different area
  const remaining = sorted.slice(2);
  if (remaining.length > 0) {
    const stretchPillar = remaining[0][0];
    const options = pool[stretchPillar] || pool.execution;
    const mission = options[Math.floor(Math.random() * options.length)];
    missions.push({ ...mission, pillar: stretchPillar, stretch: true });
  }

  return missions;
}

/* ── RESULTS ──────────────────────────────────────────────── */
function initResults() {
  if (!STATE.todayScore && STATE.todayScore !== 0) return;

  // Score
  document.getElementById('result-score-num').textContent = STATE.todayScore;

  // Trend
  const trend = document.getElementById('result-trend');
  const history = STATE.scoreHistory || [];
  if (history.length >= 2) {
    const prev = history[history.length - 2].score;
    const diff = STATE.todayScore - prev;
    trend.textContent = diff > 0 ? `↑ ${diff} from last` : diff < 0 ? `↓ ${Math.abs(diff)} from last` : '→ Same as last';
    trend.className = 'results-score-trend ' + (diff > 0 ? 'trend-up' : diff < 0 ? 'trend-down' : '');
  } else {
    trend.textContent = 'First review';
  }

  // Waste summary
  document.getElementById('ws-time').textContent = STATE.wasteTimeHours.toFixed(1) + 'h';
  document.getElementById('ws-money').textContent = '$' + STATE.wasteMoney;
  document.getElementById('ws-potential').textContent = STATE.wastePotential + '%';

  const intensity = STATE.userIntensity || 'moderate';
  if (intensity === 'intense') {
    document.getElementById('waste-summary-title').textContent = "Here's what you destroyed today:";
  } else if (intensity === 'moderate') {
    document.getElementById('waste-summary-title').textContent = "Today's damage:";
  } else {
    document.getElementById('waste-summary-title').textContent = "Today's summary:";
  }

  // Skill bars
  ['execution', 'reasoning', 'focus', 'financial'].forEach(key => {
    const bar = document.getElementById('skill-bar-' + key);
    const val = document.getElementById('skill-val-' + key);
    if (bar) setTimeout(() => { bar.style.width = STATE.todayScores[key] + '%'; }, 200);
    if (val) val.textContent = STATE.todayScores[key];
  });

  // Input summary
  const summary = document.getElementById('input-summary');
  summary.innerHTML = '';
  const displayMap = {
    wins: '✅ Accomplishments',
    time_wasted: '⏱️ Time wasted',
    distractions: '📱 Distractions',
    decisions: '🧠 Decisions',
    money_spent: '💰 Money spent',
    learning: '📚 Learning',
    tomorrow: '🎯 Tomorrow\'s focus'
  };
  Object.entries(displayMap).forEach(([key, label]) => {
    const val = STATE.todayAnswers[key];
    if (val) {
      const div = document.createElement('div');
      div.className = 'input-summary-item';
      div.innerHTML = `<span class="isi-label">${label}</span><span class="isi-value">${val}</span>`;
      summary.appendChild(div);
    }
  });

  // Insight highlight
  const insightBody = document.getElementById('insight-highlight-body');
  const scores = STATE.todayScores;
  const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
  insightBody.textContent = generateMistake(STATE.todayAnswers, scores);

  // Result cards
  document.getElementById('res-mistake').textContent = generateMistake(STATE.todayAnswers, scores);
  document.getElementById('res-money').textContent = generateMoneyImpact(STATE.todayAnswers, scores);
  document.getElementById('res-thinking').textContent = generateThinkingPattern(STATE.todayAnswers, scores);
  document.getElementById('res-missed').textContent = generateMissedOpp(STATE.todayAnswers, scores);

  const fixesList = document.getElementById('res-fixes');
  fixesList.innerHTML = '';
  generateFixes(STATE.todayAnswers, scores).forEach(fix => {
    const li = document.createElement('li');
    li.textContent = fix;
    fixesList.appendChild(li);
  });
}

/* ── MISSIONS ─────────────────────────────────────────────── */
function initMissions() {
  const empty = document.getElementById('missions-empty');
  const list = document.getElementById('missions-list');

  if (!STATE.missions || STATE.missions.length === 0) {
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');

  const pillars = ['execution', 'reasoning', 'focus'];
  STATE.missions.forEach((m, i) => {
    const pillar = pillars[i] || 'focus';
    const taskEl = document.getElementById(`mission-${pillar}-task`);
    const whyEl = document.getElementById(`mission-${pillar}-why`);
    if (taskEl) taskEl.textContent = m.task;
    if (whyEl) whyEl.textContent = m.why;
  });

  updateMissionsStatus();
}

function completeMission(pillar) {
  if (!STATE.completedMissions) STATE.completedMissions = [];
  const idx = STATE.completedMissions.indexOf(pillar);
  if (idx >= 0) {
    STATE.completedMissions.splice(idx, 1);
    document.getElementById(`check-${pillar}`).classList.remove('checked');
    document.getElementById(`mission-${pillar}`).classList.remove('completed');
  } else {
    STATE.completedMissions.push(pillar);
    STATE.totalMissionsCompleted = (STATE.totalMissionsCompleted || 0) + 1;
    document.getElementById(`check-${pillar}`).classList.add('checked');
    document.getElementById(`mission-${pillar}`).classList.add('completed');

    // Celebrate completion
    if (STATE.completedMissions.length === (STATE.missions ? Math.min(STATE.missions.length, 3) : 3)) {
      setTimeout(() => fireConfetti(), 300);
    }
  }
  saveState();
  updateMissionsStatus();
}

function updateMissionsStatus() {
  const done = STATE.completedMissions ? STATE.completedMissions.length : 0;
  const total = STATE.missions ? Math.min(STATE.missions.length, 3) : 3;
  const text = document.getElementById('missions-status-text');
  if (text) text.textContent = `${done} of ${total} completed`;

  // Restore checked state
  if (STATE.completedMissions) {
    STATE.completedMissions.forEach(p => {
      const check = document.getElementById(`check-${p}`);
      const item = document.getElementById(`mission-${p}`);
      if (check) check.classList.add('checked');
      if (item) item.classList.add('completed');
    });
  }
}

/* ── PROGRESS ─────────────────────────────────────────────── */
function initProgress() {
  const history = STATE.scoreHistory || [];

  // Stats
  document.getElementById('prog-streak').textContent = STATE.streak || 0;
  document.getElementById('prog-missions').textContent = STATE.totalMissionsCompleted || 0;

  if (history.length > 0) {
    const avg = Math.round(history.reduce((a, b) => a + b.score, 0) / history.length);
    document.getElementById('prog-avg').textContent = avg;
  } else {
    document.getElementById('prog-avg').textContent = '--';
  }

  // Cumulative waste
  const week = history.slice(-7);
  let totalWasteHours = 0, totalWasteMoney = 0, totalPotential = 0;
  week.forEach(entry => {
    if (entry.waste) {
      totalWasteHours += entry.waste.time || 0;
      totalWasteMoney += entry.waste.money || 0;
      totalPotential += entry.waste.potential || 0;
    }
  });
  document.getElementById('cw-hours').textContent = totalWasteHours.toFixed(1);
  document.getElementById('cw-money').textContent = '$' + Math.round(totalWasteMoney);
  document.getElementById('cw-potential').textContent = week.length > 0 ? Math.round(totalPotential / week.length) + '%' : '0%';

  // Summary
  generateProgressSummary(history);

  // Chart
  drawScoreChart(history);

  // Pillar breakdown (latest)
  if (history.length > 0) {
    const latest = history[history.length - 1].scores;
    ['execution', 'reasoning', 'focus', 'financial'].forEach(key => {
      const bar = document.getElementById('pb-' + key);
      const val = document.getElementById('pb-' + key + '-val');
      if (bar) bar.style.width = (latest[key] || 0) + '%';
      if (val) val.textContent = latest[key] || 0;
    });
  }
}

function generateProgressSummary(history) {
  const el = document.getElementById('progress-summary-text');
  if (history.length < 2) {
    el.textContent = 'Complete a few reviews to see your weekly pattern here.';
    return;
  }

  const recent = history.slice(-7);
  const avg = Math.round(recent.reduce((a, b) => a + b.score, 0) / recent.length);
  const intensity = STATE.userIntensity || 'moderate';

  // Calculate weekly waste totals
  let weekWasteHours = 0, weekWasteMoney = 0;
  recent.forEach(entry => {
    if (entry.waste) {
      weekWasteHours += entry.waste.time || 0;
      weekWasteMoney += entry.waste.money || 0;
    }
  });

  const trend = recent.length >= 2
    ? recent[recent.length - 1].score - recent[0].score
    : 0;

  if (intensity === 'intense') {
    if (avg >= 75) {
      el.textContent = `${recent.length}-day avg: ${avg}/100. You've wasted ${weekWasteHours.toFixed(1)} hours and $${Math.round(weekWasteMoney)} this week. Even at this level, that's ${weekWasteHours.toFixed(1)} hours you'll never get back.`;
    } else if (avg >= 50) {
      el.textContent = `${recent.length}-day avg: ${avg}/100. ${weekWasteHours.toFixed(1)} hours wasted. $${Math.round(weekWasteMoney)} burned. This is the pattern that keeps people mediocre. ${trend > 0 ? 'You\'re improving, but not fast enough.' : 'And you\'re getting worse.'}`;
    } else {
      el.textContent = `${recent.length}-day avg: ${avg}/100. ${weekWasteHours.toFixed(1)} wasted hours. $${Math.round(weekWasteMoney)} gone. This is not a rough patch — this is a pattern. Change it or accept mediocrity.`;
    }
  } else if (intensity === 'moderate') {
    el.textContent = `${recent.length}-day avg: ${avg}/100. ${weekWasteHours.toFixed(1)} hours wasted, $${Math.round(weekWasteMoney)} spent this week. ${trend > 0 ? 'Trending up.' : trend < 0 ? 'Trending down — time to refocus.' : 'Holding steady.'}`;
  } else {
    el.textContent = `Your ${recent.length}-day average is ${avg}/100. ${trend > 0 ? 'You\'re improving!' : 'Keep going — consistency matters.'}`;
  }
}

function drawScoreChart(history) {
  const ctx = document.getElementById('score-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  // Destroy existing chart
  if (window._scoreChart) window._scoreChart.destroy();

  const last7 = history.slice(-7);
  const labels = last7.map(h => {
    const d = new Date(h.date);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });
  const data = last7.map(h => h.score);

  window._scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#60a5fa',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }
        }
      }
    }
  });
}

/* ── PROFILE ──────────────────────────────────────────────── */
function initProfile() {
  const roleLabels = { student: '🎓 Student', founder: '🚀 Founder', sales: '💼 Sales', creator: '✨ Creator' };
  const goalLabels = { money: 'Fix: Bleeding money', discipline: 'Fix: Zero discipline', focus: 'Fix: Constant distraction', decisions: 'Fix: Bad decisions' };

  document.getElementById('profile-user-type').textContent = STATE.userName || 'Imperium User';
  document.getElementById('profile-user-goal').textContent = goalLabels[STATE.userGoal] || 'Goal: —';
  document.getElementById('profile-streak-badge').textContent = (STATE.streak || 0) + ' day streak';
  document.getElementById('setting-email').textContent = STATE.userEmail || 'Not signed in';
}

function exportData() {
  const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `imperium-data-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetApp() {
  if (!confirm('This will permanently delete ALL your data. Are you sure?')) return;
  if (!confirm('Last chance. This cannot be undone.')) return;
  localStorage.removeItem('imperium_state');
  location.reload();
}

function showProModal() {
  document.getElementById('pro-modal').classList.remove('hidden');
}

function closeProModal() {
  document.getElementById('pro-modal').classList.add('hidden');
}

/* ── GUEST MODE ───────────────────────────────────────────── */
function initGuestMode() {
  if (!STATE.isGuest) return;
  const banner = document.getElementById('guest-banner');
  banner.classList.remove('hidden');

  const startDate = new Date(STATE.guestStartDate);
  const now = new Date();
  const daysUsed = Math.floor((now - startDate) / 86400000);
  const daysLeft = Math.max(0, 3 - daysUsed);

  document.getElementById('guest-days-left').textContent = daysLeft + ' day' + (daysLeft !== 1 ? 's' : '');

  if (daysLeft <= 0) {
    banner.querySelector('.guest-banner-btn').textContent = 'Create Account →';
    banner.style.borderColor = 'rgba(239,68,68,0.3)';
  }
}

/* ── INSIGHT WIDGET ───────────────────────────────────────── */
const INSIGHTS = [
  "People who track their daily waste reduce it by 40% within a month.",
  "The average person wastes 3.5 hours a day on things that don't matter.",
  "A 10% improvement in focus = 15% more output. Small changes, big results.",
  "You can't manage what you don't measure. That's why you're here.",
  "The gap between where you are and where you want to be is measured in wasted hours.",
  "Every dollar spent without thinking is a dollar that can't build your future.",
  "Consistency beats intensity. One review a day beats a weekend of planning.",
  "The best performers aren't smarter — they waste less.",
  "Your daily review is the most productive 2 minutes of your day.",
  "People overestimate what they can do in a day, underestimate a month of consistency.",
];

function showInsightWidget() {
  if (STATE.scoreHistory.length === 0) return;
  const widget = document.getElementById('insight-widget');
  const text = document.getElementById('insight-text');
  widget.classList.remove('hidden');
  text.textContent = INSIGHTS[STATE.insightIndex % INSIGHTS.length];
  STATE.insightIndex = (STATE.insightIndex + 1) % INSIGHTS.length;
  saveState();
}

/* ── CANVAS: BEAMS (enhanced with aurora-like colors) ─────── */
function initBeams() {
  const canvas = document.getElementById('beams-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const beams = Array.from({ length: 12 }, (_, i) => ({
    x: Math.random() * window.innerWidth,
    speed: 0.2 + Math.random() * 0.5,
    width: 1 + Math.random() * 2.5,
    hue: [210, 230, 260, 280, 320, 190][i % 6] + Math.random() * 20,
    opacity: 0.03 + Math.random() * 0.06,
    phase: Math.random() * Math.PI * 2,
    amplitude: 30 + Math.random() * 80,
    frequency: 0.002 + Math.random() * 0.003,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    beams.forEach(b => {
      ctx.beginPath();
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, `hsla(${b.hue}, 80%, 70%, 0)`);
      grad.addColorStop(0.3, `hsla(${b.hue}, 80%, 70%, ${b.opacity})`);
      grad.addColorStop(0.7, `hsla(${(b.hue + 30) % 360}, 80%, 70%, ${b.opacity})`);
      grad.addColorStop(1, `hsla(${(b.hue + 60) % 360}, 80%, 70%, 0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = b.width;

      for (let y = 0; y < canvas.height; y += 3) {
        const x = b.x + Math.sin((y * b.frequency) + b.phase + frame * 0.008 * b.speed) * b.amplitude;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    frame++;
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── CANVAS: PARTICLES (enhanced with connections & glow) ─── */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const CONNECTION_DISTANCE = 120;
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 0.5 + Math.random() * 2,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    hue: [210, 230, 260, 280, 320, 190][Math.floor(Math.random() * 6)] + Math.random() * 20,
    alpha: 0.1 + Math.random() * 0.25,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.01 + Math.random() * 0.025,
  }));

  // Mouse interaction
  let mouse = { x: -1000, y: -1000 };
  canvas.parentElement.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  canvas.parentElement.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections first
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DISTANCE) {
          const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `hsla(${particles[i].hue}, 60%, 60%, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.pulse += p.pulseSpeed;

      // Mouse repel
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 100) {
        p.x += (mdx / mdist) * 1.5;
        p.y += (mdy / mdist) * 1.5;
      }

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const a = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
      
      // Glow effect
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0, `hsla(${p.hue}, 70%, 70%, ${a})`);
      grd.addColorStop(0.5, `hsla(${p.hue}, 60%, 60%, ${a * 0.3})`);
      grd.addColorStop(1, `hsla(${p.hue}, 60%, 60%, 0)`);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 75%, ${a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── CANVAS: AURORA ───────────────────────────────────────── */
function initAurora() {
  const canvas = document.getElementById('aurora-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  const layers = [
    { hue: 210, speed: 0.003, amplitude: 40, yOffset: 0.3, width: 200 },
    { hue: 260, speed: 0.004, amplitude: 50, yOffset: 0.4, width: 180 },
    { hue: 320, speed: 0.002, amplitude: 35, yOffset: 0.5, width: 220 },
    { hue: 190, speed: 0.0035, amplitude: 45, yOffset: 0.35, width: 190 },
  ];

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    layers.forEach(layer => {
      const baseY = canvas.height * layer.yOffset;
      const grad = ctx.createLinearGradient(0, baseY - layer.width, 0, baseY + layer.width);
      grad.addColorStop(0, `hsla(${layer.hue}, 70%, 60%, 0)`);
      grad.addColorStop(0.4, `hsla(${layer.hue}, 80%, 65%, 0.04)`);
      grad.addColorStop(0.5, `hsla(${(layer.hue + 20) % 360}, 80%, 65%, 0.06)`);
      grad.addColorStop(0.6, `hsla(${layer.hue}, 80%, 65%, 0.04)`);
      grad.addColorStop(1, `hsla(${layer.hue}, 70%, 60%, 0)`);

      ctx.beginPath();
      ctx.moveTo(0, baseY - layer.width);
      for (let x = 0; x <= canvas.width; x += 3) {
        const y = baseY + Math.sin(x * 0.003 + t * layer.speed) * layer.amplitude
                        + Math.sin(x * 0.007 + t * layer.speed * 1.5) * (layer.amplitude * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, baseY + layer.width);
      ctx.lineTo(0, baseY + layer.width);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    });

    t++;
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── CONFETTI CELEBRATION ─────────────────────────────────── */
function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#60a5fa', '#a855f7', '#14b8a6', '#d4af37', '#f87171', '#34d399', '#818cf8', '#f472b6', '#22d3ee'];
  const confetti = Array.from({ length: 80 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 12 - 4,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    gravity: 0.15 + Math.random() * 0.1,
    opacity: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    confetti.forEach(c => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.vx *= 0.99;
      c.rotation += c.rotSpeed;
      c.opacity -= 0.008;

      if (c.opacity > 0 && c.y < canvas.height + 50) {
        alive = true;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.globalAlpha = c.opacity;
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 180) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  draw();
}

/* ── BUTTON RIPPLE EFFECT ─────────────────────────────────── */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary');
  if (!btn) return;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

/* ── INTERSECTION OBSERVER FOR REVEAL ANIMATIONS ──────────── */
function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.pillar-card, .waste-card, .stat-chip, .result-card, .mission-item, .progress-stat-card, .cw-item, .first-run-signal, .landing-signal, .landing-reason, .landing-step').forEach(el => {
    el.classList.add('reveal-target');
    observer.observe(el);
  });
}

/* ── TILT EFFECT ON CARDS ─────────────────────────────────── */
function initTiltEffects() {
  document.querySelectorAll('.verdict-card, .score-ring, .first-run-card, .waste-summary-card').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.01)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

/* ── KEYBOARD / VIEWPORT ──────────────────────────────────── */
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--vvh', window.visualViewport.height + 'px');
  });
}
