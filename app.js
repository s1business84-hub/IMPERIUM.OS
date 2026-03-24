/* ═══════════════════════════════════════════════
   IMPERIUM v2 — app.js
   Complete ground-up rewrite
   ═══════════════════════════════════════════════ */

/* ── State ── */
const STATE = {
  userName: '',
  userEmail: '',
  userType: '',
  userGoal: '',
  userReminder: 'evening',
  userIntensity: 'moderate',
  coins: 0,
  streak: 0,
  level: 1,
  weeklyScores: [0,0,0,0,0,0,0],
  weeklyMoney:  [0,0,0,0,0,0,0],
  pillars: { execution:0, reasoning:0, focus:0, financial:0 },
  todayScore: 0,
  missionsDone: { execution:false, reasoning:false, focus:false },
  reviewAnswers: {},
  analysisResult: null,
  lastReviewDate: '',
  totalMissionsCompleted: 0,
  voiceDumpText: ''
};

function saveState() {
  try { localStorage.setItem('imperium_state', JSON.stringify(STATE)); } catch(e) {}
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('imperium_state'));
    if (s) Object.assign(STATE, s);
    // Ensure new fields exist
    if (!STATE.userReminder) STATE.userReminder = 'evening';
    if (!STATE.userIntensity) STATE.userIntensity = 'moderate';
    if (!STATE.missionsDone.focus && STATE.missionsDone.financial !== undefined) {
      // Migrate from old 4-mission to new 3-mission system
      STATE.missionsDone = { execution: false, reasoning: false, focus: false };
    }
  } catch(e) {}
}


/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  injectSvgGradient();
  setGreeting();
  setScoreDate();

  const fullyOnboarded = STATE.userType && STATE.userGoal;
  const hasAccount = STATE.userName || STATE.userEmail;

  if (fullyOnboarded) {
    showMainApp();
  } else if (hasAccount) {
    showScreen('screen-onboarding');
  } else {
    // No separate landing — home page shows first-run content
    showMainApp();
  }
});

function injectSvgGradient() {
  if (document.getElementById('imperium-svg-defs')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id = 'imperium-svg-defs';
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs>
    <linearGradient id="pillarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>`;
  document.body.prepend(svg);
}


/* ═══════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════ */

const NAV_SCREENS = ['screen-home','screen-missions','screen-results','screen-progress','screen-profile'];
const NAV_IDS     = ['nav-home','nav-missions','nav-results','nav-progress','nav-profile'];

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active','exit');
  });
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function navigateTo(id) {
  // Exit current
  const current = document.querySelector('.screen.active');
  if (current) {
    current.classList.add('exit');
    current.classList.remove('active');
    setTimeout(() => current.classList.remove('exit'), 400);
  }

  // Activate new
  setTimeout(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active','exit'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    // Update nav
    const navIdx = NAV_SCREENS.indexOf(id);
    document.querySelectorAll('.nav-item').forEach((n, i) => {
      n.classList.toggle('active', i === navIdx);
    });
    document.getElementById('bottom-nav').style.display =
      NAV_SCREENS.includes(id) ? '' : 'none';

    // Init screens
    if (id === 'screen-home')     initHomeDashboard();
    if (id === 'screen-missions') initMissions();
    if (id === 'screen-results')  initResults();
    if (id === 'screen-progress') initProgress();
    if (id === 'screen-profile')  initProfile();
    if (id === 'screen-review')   startReview();
  }, 80);
}


/* ═══════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════ */

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-login').classList.toggle('active', tab === 'login');
  document.getElementById('form-signup').classList.toggle('active', tab === 'signup');
}

function togglePassword(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.style.opacity = isPass ? '1' : '.5';
}

function showAuthMessage(msg) {
  const t = document.getElementById('auth-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  if (!email || !pass) return showAuthMessage('Please fill in all fields');
  if (!email.includes('@')) return showAuthMessage('Enter a valid email');

  STATE.userEmail = email;
  STATE.userName = email.split('@')[0];
  saveState();

  if (STATE.userType && STATE.userGoal) {
    showMainApp();
  } else {
    showScreen('screen-onboarding');
  }
}

function handleSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-password').value;
  if (!name || !email || !pass) return showAuthMessage('Please fill in all fields');
  if (!email.includes('@')) return showAuthMessage('Enter a valid email');
  if (pass.length < 8) return showAuthMessage('Password must be at least 8 characters');

  STATE.userName = name;
  STATE.userEmail = email;
  saveState();
  showScreen('screen-onboarding');
}

function handleSocialAuth(provider) {
  STATE.userName = provider + ' User';
  STATE.userEmail = provider.toLowerCase() + '@example.com';
  saveState();
  showScreen('screen-onboarding');
}


/* ═══════════════════════════════════════════════
   LANDING
   ═══════════════════════════════════════════════ */

function skipToAuth() {
  showScreen('screen-auth');
}

function continueAsGuest() {
  STATE.userName = 'Guest';
  STATE.userType = 'founder';
  STATE.userGoal = 'discipline';
  STATE.userReminder = 'evening';
  STATE.userIntensity = 'moderate';
  if (!localStorage.getItem('imperium_guest_start')) {
    localStorage.setItem('imperium_guest_start', Date.now().toString());
  }
  saveState();
  showMainApp();
}


/* ═══════════════════════════════════════════════
   ONBOARDING — 4 steps
   ═══════════════════════════════════════════════ */

let obCurrentStep = 1;

function updateObProgress() {
  const pct = (obCurrentStep / 4) * 100;
  document.getElementById('ob-progress-fill').style.width = pct + '%';
  document.getElementById('ob-step-label').textContent = `Step ${obCurrentStep} of 4`;
}

function goToObStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('ob-step-' + step);
  if (el) el.classList.add('active');
  obCurrentStep = step;
  updateObProgress();
}

function selectRole(btn) {
  document.querySelectorAll('#ob-step-1 .ob-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.userType = btn.dataset.value;
  saveState();
  setTimeout(() => goToObStep(2), 350);
}

function selectGoal(btn) {
  document.querySelectorAll('#ob-step-2 .ob-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.userGoal = btn.dataset.value;
  saveState();
  setTimeout(() => goToObStep(3), 350);
}

function selectReminder(btn) {
  document.querySelectorAll('#ob-step-3 .ob-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.userReminder = btn.dataset.value;
  saveState();
  setTimeout(() => goToObStep(4), 350);
}

function selectIntensity(btn) {
  document.querySelectorAll('#ob-step-4 .ob-card').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.userIntensity = btn.dataset.value;
  saveState();
}

function finishOnboarding() {
  if (!STATE.userType || !STATE.userGoal) return;
  saveState();
  showMainApp();
}

function showMainApp() {
  showScreen('screen-home');
  document.getElementById('bottom-nav').style.display = '';
  initHomeDashboard();
  initGuestMode();
  showInsightWidget();
}


/* ═══════════════════════════════════════════════
   HOME DASHBOARD
   ═══════════════════════════════════════════════ */

function setGreeting() {
  const h = new Date().getHours();
  let g = 'Good evening';
  if (h < 12) g = 'Good morning';
  else if (h < 17) g = 'Good afternoon';

  const name = STATE.userName ? `, ${STATE.userName.split(' ')[0]}` : '';
  const el = document.getElementById('greeting-text');
  if (el) el.textContent = g + name;
}

function setScoreDate() {
  const el = document.getElementById('score-date');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }
}

function initHomeDashboard() {
  setGreeting();
  setScoreDate();

  const isFirstRun = !STATE.lastReviewDate;
  const firstRunSec = document.getElementById('first-run-section');
  const returningSec = document.getElementById('returning-section');
  const firstRunAuth = document.getElementById('first-run-auth');

  if (isFirstRun) {
    firstRunSec.classList.remove('hidden');
    firstRunSec.style.display = '';
    returningSec.classList.remove('visible');
    returningSec.style.display = 'none';
    // Hide auth link if user is already signed in
    if (firstRunAuth) {
      firstRunAuth.style.display = (STATE.userName && STATE.userName !== 'Guest') ? 'none' : '';
    }
  } else {
    firstRunSec.classList.add('hidden');
    firstRunSec.style.display = 'none';
    returningSec.classList.add('visible');
    returningSec.style.display = '';

    // Score ring
    const score = STATE.todayScore || 0;
    document.getElementById('daily-score').textContent = score;
    animateRing(score);

    // Pillars
    ['execution','reasoning','focus','financial'].forEach(p => {
      const val = STATE.pillars[p] || 0;
      animatePillar(p, val);
    });

    // Quick stats
    document.getElementById('streak-count').textContent = STATE.streak;
    const done = Object.values(STATE.missionsDone).filter(Boolean).length;
    document.getElementById('missions-done').textContent = `${done}/3`;
    document.getElementById('weekly-avg').textContent = calcWeeklyAvg();
  }

  // Guest mode
  initGuestMode();
  showInsightWidget();
}

function animateRing(score) {
  const circle = document.getElementById('score-ring-circle');
  if (!circle) return;
  const circumference = 326.7;
  const offset = circumference - (score / 100) * circumference;
  requestAnimationFrame(() => {
    circle.style.strokeDashoffset = offset;
  });
}

function animatePillar(name, val) {
  const bar = document.getElementById('pillar-' + name);
  const valEl = document.getElementById('pillar-' + name + '-val');
  if (bar) setTimeout(() => { bar.style.width = val + '%'; }, 200);
  if (valEl) valEl.textContent = val;
}

function calcWeeklyAvg() {
  const valid = STATE.weeklyScores.filter(s => s > 0);
  if (!valid.length) return '--';
  return Math.round(valid.reduce((a,b) => a + b, 0) / valid.length);
}


/* ═══════════════════════════════════════════════
   VOICE INPUT FOR CHAT
   ═══════════════════════════════════════════════ */

let voiceRecognition = null;
let isVoiceListening = false;

function toggleVoiceInput() {
  if (isVoiceListening) {
    stopVoiceInput();
  } else {
    startVoiceInput();
  }
}

function startVoiceInput() {
  const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechAPI) {
    alert('Voice input is not supported in this browser. Try Chrome or Safari.');
    return;
  }

  voiceRecognition = new SpeechAPI();
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = 'en-US';

  const field = document.getElementById('chat-text-field');
  const micBtn = document.getElementById('chat-mic-btn');

  voiceRecognition.onstart = () => {
    isVoiceListening = true;
    if (micBtn) micBtn.classList.add('listening');
    if (field) field.placeholder = 'Listening… speak now';
  };

  voiceRecognition.onresult = (e) => {
    let transcript = '';
    for (let i = 0; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    if (field) field.value = transcript;
  };

  voiceRecognition.onend = () => {
    isVoiceListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    if (field) field.placeholder = 'Type or tap \ud83c\udf99\ufe0f to speak\u2026';
    // Auto-send if we got something meaningful
    if (field && field.value.trim().length > 0) {
      sendTextAnswer();
    }
  };

  voiceRecognition.onerror = (e) => {
    isVoiceListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    if (field) field.placeholder = 'Type or tap \ud83c\udf99\ufe0f to speak\u2026';
    if (e.error === 'not-allowed') {
      alert('Microphone access denied. Please allow microphone permission in your browser settings.');
    }
  };

  voiceRecognition.start();
}

function stopVoiceInput() {
  if (voiceRecognition) {
    voiceRecognition.stop();
  }
  isVoiceListening = false;
  const micBtn = document.getElementById('chat-mic-btn');
  if (micBtn) micBtn.classList.remove('listening');
}


/* ═══════════════════════════════════════════════
   REVIEW GUIDE
   ═══════════════════════════════════════════════ */

function dismissReviewGuide() {
  const guide = document.getElementById('review-guide');
  if (guide) {
    guide.classList.add('dismissed');
    try { localStorage.setItem('imperium_guide_dismissed', '1'); } catch(e) {}
  }
}

function showReviewGuideIfNeeded() {
  const guide = document.getElementById('review-guide');
  if (!guide) return;
  const dismissed = localStorage.getItem('imperium_guide_dismissed');
  if (dismissed) {
    guide.classList.add('dismissed');
  } else {
    guide.classList.remove('dismissed');
  }
}


/* ═══════════════════════════════════════════════
   DAILY REVIEW — 7 Questions
   ═══════════════════════════════════════════════ */

const REVIEW_QUESTIONS = [
  { id: 'actions', text: 'What did you actually get done today?', type: 'text',
    followUps: [
      { keywords: ['nothing','zero','0','nah','not much'], text: 'What stopped you from getting things done?' }
    ]
  },
  { id: 'avoided', text: 'What did you avoid or procrastinate on?', type: 'text',
    followUps: [
      { keywords: ['pitch','deck','email','call','meeting'], text: 'Why did you avoid it? Fear, boredom, or unclear next step?' }
    ]
  },
  { id: 'money_spent', text: 'How much money did you spend today?', type: 'text' },
  { id: 'money_earned', text: 'How much did you earn or move closer to earning?', type: 'text' },
  { id: 'time_wasted', text: 'How much time did you waste on low-value activities?', type: 'options',
    options: ['None','Under 1 hour','1–2 hours','2–4 hours','4+ hours']
  },
  { id: 'missed_opportunities', text: 'Was there anything you should have done but didn\'t?', type: 'text' },
  { id: 'discipline', text: 'How would you rate your discipline today?', type: 'options',
    options: ['Very high','High','Medium','Low','Very low']
  }
];

let currentQuestion = 0;
let reviewActive = false;

function startReview() {
  if (reviewActive) return;
  reviewActive = true;
  currentQuestion = 0;
  STATE.reviewAnswers = {};

  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = '';
  updateReviewProgress();
  showReviewGuideIfNeeded();
  stopVoiceInput();

  // Initial greeting
  showTypingThenBubble("Hi! Let's review your day. I'll ask 7 quick questions — it takes about 2 minutes.", () => {
    askQuestion(0);
  });
}

function updateReviewProgress() {
  const stepText = document.getElementById('review-step-text');
  if (stepText) {
    const display = Math.min(currentQuestion + 1, 7);
    stepText.textContent = `${display}/7`;
  }
}

function askQuestion(idx) {
  if (idx >= REVIEW_QUESTIONS.length) {
    finishReview();
    return;
  }
  currentQuestion = idx;
  updateReviewProgress();
  const q = REVIEW_QUESTIONS[idx];
  showTypingThenBubble(q.text, () => {
    showInputForQuestion(q);
  });
}

function showTypingThenBubble(text, cb) {
  const msgs = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(typing);
  scrollChatBottom();

  const delay = Math.min(600 + text.length * 12, 1800);
  setTimeout(() => {
    typing.remove();
    addBubble(text, 'ai');
    if (cb) cb();
  }, delay);
}

function addBubble(text, type) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${type}`;
  div.textContent = text;
  msgs.appendChild(div);
  scrollChatBottom();
}

function scrollChatBottom() {
  const msgs = document.getElementById('chat-messages');
  requestAnimationFrame(() => {
    msgs.scrollTop = msgs.scrollHeight;
  });
}

function showInputForQuestion(q) {
  const opts = document.getElementById('chat-options');
  const textRow = document.getElementById('chat-text-row');
  const field = document.getElementById('chat-text-field');
  opts.innerHTML = '';
  stopVoiceInput();

  if (q.type === 'options' && q.options) {
    textRow.style.display = 'none';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chat-option-btn';
      btn.textContent = opt;
      btn.onclick = () => submitAnswer(opt);
      opts.appendChild(btn);
    });
  } else {
    textRow.style.display = '';
    field.value = '';
    field.focus();
  }
}

function sendTextAnswer() {
  const field = document.getElementById('chat-text-field');
  const val = field.value.trim();
  if (!val) return;
  field.value = '';
  stopVoiceInput();
  submitAnswer(val);
}

function submitAnswer(answer) {
  addBubble(answer, 'user');

  const q = REVIEW_QUESTIONS[currentQuestion];
  STATE.reviewAnswers[q.id] = answer;
  saveState();

  // Check follow-ups
  const opts = document.getElementById('chat-options');
  opts.innerHTML = '';
  document.getElementById('chat-text-row').style.display = 'none';

  if (q.followUps) {
    const lower = answer.toLowerCase();
    const fu = q.followUps.find(f => f.keywords.some(k => lower.includes(k)));
    if (fu) {
      showTypingThenBubble(fu.text, () => {
        document.getElementById('chat-text-row').style.display = '';
        const field = document.getElementById('chat-text-field');
        field.value = '';
        field.focus();
        // Override send to capture follow-up
        const sendBtn = document.getElementById('chat-send-btn');
        const origClick = sendBtn.onclick;
        sendBtn.onclick = () => {
          const v = document.getElementById('chat-text-field').value.trim();
          if (!v) return;
          addBubble(v, 'user');
          document.getElementById('chat-text-field').value = '';
          STATE.reviewAnswers[q.id + '_followup'] = v;
          saveState();
          sendBtn.onclick = origClick;
          askQuestion(currentQuestion + 1);
        };
      });
      return;
    }
  }

  askQuestion(currentQuestion + 1);
}


/* ═══════════════════════════════════════════════
   FINISH REVIEW — Transcript review + Analysis
   ═══════════════════════════════════════════════ */

function finishReview() {
  reviewActive = false;
  const opts = document.getElementById('chat-options');
  const textRow = document.getElementById('chat-text-row');
  opts.innerHTML = '';
  textRow.style.display = 'none';

  document.getElementById('review-step-text').textContent = '✓';

  showTypingThenBubble("Thanks! Let me analyze your day...", () => {
    // Run analysis
    const result = analyseDay(STATE.reviewAnswers);
    STATE.analysisResult = result;
    applyResultToState(result);
    saveState();

    // Show score
    setTimeout(() => {
      addBubble(`Your Operating Score: ${result.overallScore}/100`, 'ai');

      // Add skill breakdown inline
      setTimeout(() => {
        addSkillBreakdownToChat(result);

        setTimeout(() => {
          const topP = getTopPillar(result);
          const botP = getBottomPillar(result);
          const insight = `Your strongest signal today was ${topP.name} (${topP.score}). Your biggest opportunity for improvement is ${botP.name} (${botP.score}).`;
          showTypingThenBubble(insight, () => {
            // Add CTA button
            const msgs = document.getElementById('chat-messages');
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.style.cssText = 'max-width:280px;margin:8px 0;align-self:flex-start;animation:bubbleIn .3s var(--ease-spring) both';
            btn.textContent = 'View Full Analysis →';
            btn.onclick = () => navigateTo('screen-results');
            msgs.appendChild(btn);
            scrollChatBottom();
          });
        }, 600);
      }, 400);
    }, 800);
  });
}

function addSkillBreakdownToChat(result) {
  const msgs = document.getElementById('chat-messages');
  const card = document.createElement('div');
  card.className = 'chat-skill-breakdown';

  const pillars = [
    { name: 'Execution', key: 'execution', val: result.executionScore },
    { name: 'Reasoning', key: 'reasoning', val: result.reasoningScore },
    { name: 'Focus',     key: 'focus',     val: result.focusScore },
    { name: 'Financial', key: 'financial', val: result.financialScore }
  ];

  card.innerHTML = `<h4>Performance Signals</h4>` +
    pillars.map(p => `
      <div class="chat-skill-bar">
        <span class="chat-skill-label">${p.name}</span>
        <div class="chat-skill-track"><div class="chat-skill-fill ${p.key}" style="width:0%"></div></div>
      </div>
    `).join('');

  msgs.appendChild(card);
  scrollChatBottom();

  // Animate bars
  setTimeout(() => {
    pillars.forEach(p => {
      const fill = card.querySelector(`.chat-skill-fill.${p.key}`);
      if (fill) fill.style.width = p.val + '%';
    });
  }, 100);
}

function getTopPillar(r) {
  const p = [
    { name: 'Execution', score: r.executionScore },
    { name: 'Reasoning', score: r.reasoningScore },
    { name: 'Focus', score: r.focusScore },
    { name: 'Financial', score: r.financialScore }
  ];
  return p.reduce((a,b) => a.score >= b.score ? a : b);
}

function getBottomPillar(r) {
  const p = [
    { name: 'Execution', score: r.executionScore },
    { name: 'Reasoning', score: r.reasoningScore },
    { name: 'Focus', score: r.focusScore },
    { name: 'Financial', score: r.financialScore }
  ];
  return p.reduce((a,b) => a.score <= b.score ? a : b);
}


/* ═══════════════════════════════════════════════
   AI ANALYSIS ENGINE
   ═══════════════════════════════════════════════ */

function analyseDay(answers) {
  const executionScore  = calcExecutionScore(answers);
  const reasoningScore  = calcReasoningScore(answers);
  const focusScore      = calcFocusScore(answers);
  const financialScore  = calcFinancialScore(answers);
  const overallScore    = Math.round((executionScore + reasoningScore + focusScore + financialScore) / 4);

  return {
    overallScore,
    executionScore,
    reasoningScore,
    focusScore,
    financialScore,
    mistake:      generateMistake(answers),
    moneyImpact:  generateMoneyImpact(answers),
    thinking:     generateThinkingPattern(answers),
    missed:       generateMissedOpp(answers),
    fixes:        generateFixes(answers),
    missions:     generateAdaptiveMissions(
      { executionScore, reasoningScore, focusScore, financialScore },
      STATE.userType
    )
  };
}

function calcExecutionScore(a) {
  let s = 50;
  const actions = (a.actions || '').toLowerCase();
  if (actions.length > 40) s += 15;
  if (actions.length > 100) s += 10;
  if (/shipped|finished|completed|done|built|launched|sent|published/i.test(actions)) s += 15;
  if (/nothing|zero|0|didn'?t|none/i.test(actions)) s -= 25;

  const avoided = (a.avoided || '').toLowerCase();
  if (avoided.length > 5 && !/nothing|none|n\/a/i.test(avoided)) s -= 10;

  return clamp(s + noise(), 0, 100);
}

function calcReasoningScore(a) {
  let s = 50;
  const missed = (a.missed_opportunities || '').toLowerCase();
  if (/nothing|none|n\/a|no/i.test(missed)) s += 15;
  else if (missed.length > 20) s -= 10;

  const discipline = (a.discipline || '').toLowerCase();
  if (/very high|high/i.test(discipline)) s += 15;
  if (/very low|low/i.test(discipline)) s -= 15;

  return clamp(s + noise(), 0, 100);
}

function calcFocusScore(a) {
  let s = 60;
  const tw = (a.time_wasted || '').toLowerCase();
  if (/none/i.test(tw)) s += 25;
  if (/under 1/i.test(tw)) s += 10;
  if (/1.*2/i.test(tw)) s -= 5;
  if (/2.*4/i.test(tw)) s -= 15;
  if (/4\+/i.test(tw)) s -= 30;

  const discipline = (a.discipline || '').toLowerCase();
  if (/very high/i.test(discipline)) s += 10;
  if (/very low/i.test(discipline)) s -= 10;

  return clamp(s + noise(), 0, 100);
}

function calcFinancialScore(a) {
  let s = 55;
  const spent = parseFloat((a.money_spent || '0').replace(/[^0-9.]/g, '')) || 0;
  const earned = parseFloat((a.money_earned || '0').replace(/[^0-9.]/g, '')) || 0;

  if (spent === 0) s += 10;
  else if (spent < 20) s += 5;
  else if (spent > 100) s -= 15;
  else if (spent > 50) s -= 8;

  if (earned > 0) s += 15;
  if (earned > 100) s += 10;

  return clamp(s + noise(), 0, 100);
}

function noise() { return Math.floor(Math.random() * 7) - 3; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* Evidence-based insight generators */

function generateMistake(a) {
  const avoided = a.avoided || '';
  const tw = a.time_wasted || '';
  const disc = a.discipline || '';

  if (/nothing|zero|0|didn'?t/i.test(a.actions || ''))
    return `Observation: You reported getting nothing done today.\n\nEvidence: "${(a.actions || '').substring(0,80)}"\n\nWhy this matters: Zero-output days compound. Each one resets momentum and makes the next day harder to start.\n\nAction: Tomorrow, commit to one 30-minute work block before checking anything else.`;

  if (/2.*4|4\+/i.test(tw))
    return `Observation: You spent ${tw.toLowerCase()} on low-value activities.\n\nEvidence: That's a significant portion of your waking hours consumed by things that don't move you forward.\n\nWhy this matters: Time is the only non-renewable resource. At this rate, you're losing 15-30 hours per week.\n\nAction: Identify your top time sink and block it for the first 4 hours of tomorrow.`;

  if (avoided.length > 5 && !/nothing|none/i.test(avoided))
    return `Observation: You avoided "${avoided.substring(0,60)}"\n\nEvidence: Avoidance is usually a signal of unclear next steps or underlying fear.\n\nWhy this matters: The things you avoid are often the highest-leverage tasks.\n\nAction: Break the avoided task into a 15-minute first step and do it before anything else tomorrow.`;

  return `Observation: Your day was moderate — not terrible, but with room for improvement.\n\nEvidence: Your discipline was rated "${disc}" and you reported "${tw}" of wasted time.\n\nWhy this matters: Moderate days feel productive but rarely move the needle.\n\nAction: Define your #1 outcome for tomorrow before you go to sleep.`;
}

function generateMoneyImpact(a) {
  const spent = parseFloat((a.money_spent || '0').replace(/[^0-9.]/g,'')) || 0;
  const earned = parseFloat((a.money_earned || '0').replace(/[^0-9.]/g,'')) || 0;

  if (spent > 50 && earned === 0)
    return `You spent $${spent} and earned $0 today. That's a net negative day. Over 30 days at this rate, you'd be down $${(spent*30).toLocaleString()}. Before spending tomorrow, ask: "Does this move me closer to my goal?"`;

  if (earned > 0)
    return `You earned $${earned} today. ${spent > 0 ? `After $${spent} in spending, your net is $${earned - spent}.` : 'And you kept spending at zero.'} Track whether this earning rate is consistent or a one-off.`;

  if (spent === 0 && earned === 0)
    return `No money moved today — that's not necessarily bad, but ask yourself: did you work on anything that will generate income this week? Revenue doesn't appear without upstream action.`;

  return `You spent $${spent} today. Without income to offset it, ensure every dollar spent has a clear return — whether in learning, tools, or time saved.`;
}

function generateThinkingPattern(a) {
  const disc = (a.discipline || '').toLowerCase();
  const tw = (a.time_wasted || '').toLowerCase();
  const avoided = (a.avoided || '').toLowerCase();

  if (/very low|low/i.test(disc) && /2.*4|4\+/i.test(tw))
    return `Pattern detected: Low discipline + high time waste. This usually means you're operating reactively — responding to whatever is in front of you instead of designing your day. The fix isn't willpower; it's structure. Set your top 3 tasks before the day starts.`;

  if (/high|very high/i.test(disc) && !/none/i.test(tw))
    return `Interesting contradiction: You rated discipline as ${disc}, but still reported ${tw} of wasted time. This often means you're disciplined about the wrong things — busy but not productive. Audit what you're being disciplined about.`;

  if (avoided.length > 10 && /high/i.test(disc))
    return `You showed high discipline but still avoided something important. This pattern suggests selective discipline — you're great at execution on comfortable tasks but avoid the uncomfortable high-leverage work.`;

  return `Your thinking pattern today suggests a ${disc}-discipline approach with ${tw} of time leakage. The goal isn't perfection — it's catching these patterns early so they don't compound.`;
}

function generateMissedOpp(a) {
  const missed = a.missed_opportunities || '';
  if (/nothing|none|no|n\/a/i.test(missed) || missed.length < 3)
    return `You reported no missed opportunities. That's either great awareness or a sign you weren't looking for them. Tomorrow, actively scan for one opportunity you might otherwise overlook.`;

  return `Missed opportunity: "${missed.substring(0,100)}"\n\nEvery day has windows that close. The fact that you noticed this is valuable — it means your awareness is working. Now act on it tomorrow before the window closes.`;
}

function generateFixes(a) {
  const fixes = [];
  const disc = (a.discipline || '').toLowerCase();
  const tw = (a.time_wasted || '').toLowerCase();

  if (/low|very low/i.test(disc))
    fixes.push('Set 3 priorities tonight and place them where you\'ll see them first thing');

  if (/2.*4|4\+/i.test(tw))
    fixes.push('Block your top distraction for the first 3 hours of the day');

  const avoided = (a.avoided || '');
  if (avoided.length > 5 && !/nothing|none/i.test(avoided))
    fixes.push(`Start with 15 minutes on: ${avoided.substring(0,50)}`);

  const earned = parseFloat((a.money_earned || '0').replace(/[^0-9.]/g,'')) || 0;
  if (earned === 0)
    fixes.push('Do one action that moves you closer to earning money');

  if (fixes.length === 0) {
    fixes.push('Maintain today\'s momentum — consistency compounds');
    fixes.push('Increase your hardest task\'s time allocation by 20%');
  }

  return fixes;
}


/* ═══════════════════════════════════════════════
   ADAPTIVE MISSIONS
   ═══════════════════════════════════════════════ */

function generateAdaptiveMissions(scores, userType) {
  const pools = {
    student: {
      execution:  [
        { task: 'Complete one assignment or study session before noon', why: 'Build morning execution habit', time: '~45 min' },
        { task: 'Submit or finish one pending deliverable', why: 'Clear your backlog', time: '~30 min' },
        { task: 'Review notes from your last class within 24 hours', why: 'Active recall strengthens memory', time: '~20 min' }
      ],
      reasoning: [
        { task: 'Write a 1-paragraph summary of what you learned today', why: 'Forces synthesis and understanding', time: '~10 min' },
        { task: 'Identify one concept you don\'t fully understand and look it up', why: 'Close knowledge gaps early', time: '~15 min' },
        { task: 'Explain one topic to someone (or write it as if teaching)', why: 'Teaching is the best learning', time: '~20 min' }
      ],
      focus: [
        { task: 'Do a 60-minute deep study block with phone in another room', why: 'Uninterrupted focus doubles retention', time: '~60 min' },
        { task: 'Complete one task without switching tabs or apps', why: 'Train single-task muscle', time: '~30 min' },
        { task: 'Study for 25 minutes, break 5, repeat 3x (Pomodoro)', why: 'Structured focus builds endurance', time: '~90 min' }
      ],
      financial: [
        { task: 'Track every expense today — write them all down', why: 'Awareness is the first step to control', time: '~5 min' },
        { task: 'Find one subscription or expense you can cut', why: 'Small leaks sink big ships', time: '~10 min' },
        { task: 'Research one way to earn money with your skills', why: 'Income awareness builds financial thinking', time: '~15 min' }
      ]
    },
    founder: {
      execution: [
        { task: 'Ship one feature, update, or deliverable before noon', why: 'Shipping is the only metric that matters', time: '~2 hrs' },
        { task: 'Send one outreach message to a potential customer', why: 'Revenue comes from conversations', time: '~15 min' },
        { task: 'Close one open loop from your task list', why: 'Open loops drain cognitive energy', time: '~30 min' }
      ],
      reasoning: [
        { task: 'Write down your top 3 risks and one mitigation for each', why: 'Founders who plan for risk survive longer', time: '~15 min' },
        { task: 'Review one competitor and identify one thing to learn', why: 'Competitive awareness sharpens strategy', time: '~20 min' },
        { task: 'Define the one metric that matters most this week', why: 'Focus prevents scattered effort', time: '~10 min' }
      ],
      focus: [
        { task: 'Block 2 hours for your highest-priority project', why: 'Deep work compounds in startups', time: '~2 hrs' },
        { task: 'Turn off all notifications for 90 minutes and build', why: 'Notifications kill founder flow', time: '~90 min' },
        { task: 'Delegate or eliminate one task that isn\'t core', why: 'Your time is your scarcest resource', time: '~15 min' }
      ],
      financial: [
        { task: 'Track burn rate: What did the business spend today?', why: 'Cash awareness prevents surprises', time: '~10 min' },
        { task: 'Follow up on one pending invoice or payment', why: 'Cash flow is oxygen for startups', time: '~10 min' },
        { task: 'Calculate: at current burn, how many months of runway left?', why: 'Runway awareness drives urgency', time: '~15 min' }
      ]
    },
    sales: {
      execution: [
        { task: 'Make 5 outbound calls or send 5 prospecting messages', why: 'Pipeline is built through volume', time: '~45 min' },
        { task: 'Follow up with every lead from the last 48 hours', why: 'Speed-to-lead wins deals', time: '~30 min' },
        { task: 'Book one meeting for this week', why: 'Meetings are the currency of sales', time: '~20 min' }
      ],
      reasoning: [
        { task: 'Review one lost deal and identify the failure point', why: 'Losses teach more than wins', time: '~15 min' },
        { task: 'Role-play one objection handling scenario', why: 'Preparation beats improvisation', time: '~15 min' },
        { task: 'Write down the 3 most common objections and your best response', why: 'Scripted responses increase close rate', time: '~20 min' }
      ],
      focus: [
        { task: 'Dedicate 60 minutes to pure prospecting — nothing else', why: 'Focused prospecting fills the funnel', time: '~60 min' },
        { task: 'Close your email and CRM notifications for 2 hours', why: 'Context switching kills closing ability', time: '~2 hrs' },
        { task: 'Work on one high-value deal without multitasking', why: 'Big deals need deep attention', time: '~45 min' }
      ],
      financial: [
        { task: 'Calculate your pipeline value and expected close rate', why: 'Know your numbers to hit targets', time: '~15 min' },
        { task: 'Track every personal expense today', why: 'Salespeople who track spend earn more', time: '~5 min' },
        { task: 'Set a specific income goal for this month with daily targets', why: 'Clear targets drive clear action', time: '~10 min' }
      ]
    },
    creator: {
      execution: [
        { task: 'Publish or complete one piece of content today', why: 'Shipping beats perfecting', time: '~1 hr' },
        { task: 'Spend 30 minutes on creation, not consumption', why: 'Creators create; consumers scroll', time: '~30 min' },
        { task: 'Outline your next 3 content pieces', why: 'Planning removes start friction', time: '~20 min' }
      ],
      reasoning: [
        { task: 'Analyze your best-performing content — what made it work?', why: 'Data beats gut feeling', time: '~15 min' },
        { task: 'Study one creator you admire and note 3 techniques they use', why: 'Pattern recognition accelerates growth', time: '~20 min' },
        { task: 'Write down your unique perspective on one trending topic', why: 'Original angles build audience', time: '~15 min' }
      ],
      focus: [
        { task: 'Block 90 minutes for deep creation with no social media', why: 'Creative flow requires unbroken time', time: '~90 min' },
        { task: 'Do one creative task before checking any platform', why: 'Create before you consume', time: '~30 min' },
        { task: 'Work on your craft skill for 60 minutes straight', why: 'Skill compounds silently', time: '~60 min' }
      ],
      financial: [
        { task: 'Explore one monetization method for your content', why: 'Creativity without income is a hobby', time: '~20 min' },
        { task: 'Reach out to one brand or potential sponsor', why: 'Income doesn\'t come from waiting', time: '~15 min' },
        { task: 'Track all income sources and their trends', why: 'What you measure, you manage', time: '~10 min' }
      ]
    }
  };

  const type = pools[userType] || pools.founder;

  // Find weakest two pillars for core missions + weakest remaining for stretch
  const sorted = Object.entries(scores)
    .map(([k, v]) => ({ key: k.replace('Score',''), score: v }))
    .sort((a,b) => a.score - b.score);

  const corePillars = sorted.slice(0, 2);
  const stretchPillar = sorted[2] || sorted[0];

  const pick = (pillar) => {
    const pool = type[pillar] || type.execution;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  return {
    core: [
      { ...pick(corePillars[0].key), pillar: corePillars[0].key },
      { ...pick(corePillars[1].key), pillar: corePillars[1].key }
    ],
    stretch: { ...pick(stretchPillar.key), pillar: stretchPillar.key }
  };
}


/* ═══════════════════════════════════════════════
   APPLY RESULT
   ═══════════════════════════════════════════════ */

function applyResultToState(result) {
  STATE.todayScore = result.overallScore;
  STATE.pillars.execution = result.executionScore;
  STATE.pillars.reasoning = result.reasoningScore;
  STATE.pillars.focus = result.focusScore;
  STATE.pillars.financial = result.financialScore;

  // Weekly arrays — shift
  STATE.weeklyScores.shift();
  STATE.weeklyScores.push(result.overallScore);

  const spent = parseFloat((STATE.reviewAnswers.money_spent || '0').replace(/[^0-9.]/g,'')) || 0;
  STATE.weeklyMoney.shift();
  STATE.weeklyMoney.push(spent);

  // Reset missions
  STATE.missionsDone = { execution: false, reasoning: false, focus: false };

  // Level
  const totalScore = STATE.weeklyScores.reduce((a,b) => a + b, 0);
  STATE.level = Math.max(1, Math.floor(totalScore / 200) + 1);

  // Streak
  const today = new Date().toDateString();
  if (STATE.lastReviewDate) {
    const last = new Date(STATE.lastReviewDate);
    const diff = Math.floor((new Date(today) - last) / 86400000);
    STATE.streak = diff <= 1 ? STATE.streak + 1 : 1;
  } else {
    STATE.streak = 1;
  }
  STATE.lastReviewDate = today;

  saveState();
}


/* ═══════════════════════════════════════════════
   RESULTS — Intelligence Report
   ═══════════════════════════════════════════════ */

function initResults() {
  const r = STATE.analysisResult;
  if (!r) return;

  // Score animation
  const scoreEl = document.getElementById('result-score-num');
  animateNumber(scoreEl, 0, r.overallScore, 800);

  // Trend
  const trendEl = document.getElementById('result-trend');
  const prev = STATE.weeklyScores[STATE.weeklyScores.length - 2] || 0;
  if (prev > 0) {
    const diff = r.overallScore - prev;
    trendEl.textContent = diff >= 0 ? `↑ ${diff} from yesterday` : `↓ ${Math.abs(diff)} from yesterday`;
    trendEl.style.color = diff >= 0 ? 'var(--success)' : 'var(--danger)';
  }

  // Skill bars
  ['execution','reasoning','focus','financial'].forEach(p => {
    const bar = document.getElementById('skill-bar-' + p);
    const val = document.getElementById('skill-val-' + p);
    const score = r[p + 'Score'] || 0;
    if (bar) setTimeout(() => { bar.style.width = score + '%'; }, 200);
    if (val) val.textContent = score;
  });

  // Input summary
  const summary = document.getElementById('input-summary');
  if (summary) {
    const items = [
      { label: 'Actions', val: STATE.reviewAnswers.actions },
      { label: 'Avoided', val: STATE.reviewAnswers.avoided },
      { label: 'Spent', val: STATE.reviewAnswers.money_spent },
      { label: 'Earned', val: STATE.reviewAnswers.money_earned },
      { label: 'Time Lost', val: STATE.reviewAnswers.time_wasted },
      { label: 'Discipline', val: STATE.reviewAnswers.discipline }
    ];
    summary.innerHTML = items.filter(i => i.val).map(i => `
      <div class="input-summary-item">
        <div class="input-summary-label">${i.label}</div>
        <div class="input-summary-val">${i.val}</div>
      </div>
    `).join('');
  }

  // Dominant insight highlight
  const hlBody = document.getElementById('insight-highlight-body');
  if (hlBody) {
    const bot = getBottomPillar(r);
    hlBody.textContent = `Your ${bot.name} score (${bot.score}) was lowest today. This is where focused improvement will have the biggest impact on your overall performance.`;
  }

  // Result cards
  setEl('res-mistake', r.mistake);
  setEl('res-money', r.moneyImpact);
  setEl('res-thinking', r.thinking);
  setEl('res-missed', r.missed);

  const fixesList = document.getElementById('res-fixes');
  if (fixesList && r.fixes) {
    fixesList.innerHTML = r.fixes.map(f => `<li>${f}</li>`).join('');
  }
}


/* ═══════════════════════════════════════════════
   TODAY'S PLAN (MISSIONS)
   ═══════════════════════════════════════════════ */

function initMissions() {
  const r = STATE.analysisResult;
  const emptyEl = document.getElementById('missions-empty');
  const listEl = document.getElementById('missions-list');
  const statusEl = document.getElementById('missions-status');
  const subEl = document.getElementById('missions-page-sub');

  if (!r || !r.missions) {
    // No review done yet — show empty state, hide missions
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (listEl) listEl.classList.add('hidden');
    if (statusEl) statusEl.style.display = 'none';
    if (subEl) subEl.textContent = 'Complete a review to get your plan';
    return;
  }

  // Has data — show missions, hide empty
  if (emptyEl) emptyEl.classList.add('hidden');
  if (listEl) listEl.classList.remove('hidden');
  if (statusEl) statusEl.style.display = '';
  if (subEl) subEl.textContent = 'Based on yesterday\'s weakest signals';

  const m = r.missions;

  // Core 1
  if (m.core && m.core[0]) {
    setEl('mission-execution-task', m.core[0].task);
    setEl('mission-execution-why', m.core[0].why);
    const pillarTag = document.querySelector('#mission-execution .mission-pillar');
    if (pillarTag) {
      pillarTag.className = 'mission-pillar ' + m.core[0].pillar + '-tag';
      pillarTag.textContent = capitalize(m.core[0].pillar);
    }
    const timeEl = document.querySelector('#mission-execution .mission-time');
    if (timeEl) timeEl.textContent = m.core[0].time || '~30 min';
    document.getElementById('mission-execution').dataset.pillar = m.core[0].pillar;
  }

  // Core 2
  if (m.core && m.core[1]) {
    setEl('mission-reasoning-task', m.core[1].task);
    setEl('mission-reasoning-why', m.core[1].why);
    const pillarTag = document.querySelector('#mission-reasoning .mission-pillar');
    if (pillarTag) {
      pillarTag.className = 'mission-pillar ' + m.core[1].pillar + '-tag';
      pillarTag.textContent = capitalize(m.core[1].pillar);
    }
    const timeEl = document.querySelector('#mission-reasoning .mission-time');
    if (timeEl) timeEl.textContent = m.core[1].time || '~15 min';
    document.getElementById('mission-reasoning').dataset.pillar = m.core[1].pillar;
  }

  // Stretch
  if (m.stretch) {
    setEl('mission-focus-task', m.stretch.task);
    setEl('mission-focus-why', m.stretch.why);
    const pillarTag = document.querySelector('#mission-focus .mission-pillar');
    if (pillarTag) {
      pillarTag.className = 'mission-pillar ' + m.stretch.pillar + '-tag';
      pillarTag.textContent = capitalize(m.stretch.pillar);
    }
    const timeEl = document.querySelector('#mission-focus .mission-time');
    if (timeEl) timeEl.textContent = m.stretch.time || '~60 min';
    document.getElementById('mission-focus').dataset.pillar = m.stretch.pillar;
  }

  // Restore check states
  ['execution','reasoning','focus'].forEach(k => {
    const check = document.getElementById('check-' + k);
    const item = document.getElementById('mission-' + k);
    if (STATE.missionsDone[k]) {
      if (check) check.classList.add('checked');
      if (item) item.classList.add('completed');
    } else {
      if (check) check.classList.remove('checked');
      if (item) item.classList.remove('completed');
    }
  });

  updateMissionsStatus();
}

function completeMission(key) {
  if (STATE.missionsDone[key]) return;
  STATE.missionsDone[key] = true;
  STATE.totalMissionsCompleted = (STATE.totalMissionsCompleted || 0) + 1;
  saveState();

  const check = document.getElementById('check-' + key);
  const item = document.getElementById('mission-' + key);
  if (check) check.classList.add('checked');
  if (item) item.classList.add('completed');

  updateMissionsStatus();
}

function updateMissionsStatus() {
  const done = Object.values(STATE.missionsDone).filter(Boolean).length;
  const total = Object.keys(STATE.missionsDone).length;
  setEl('missions-status-text', `${done} of ${total} completed`);
}


/* ═══════════════════════════════════════════════
   PROGRESS — Natural language insights
   ═══════════════════════════════════════════════ */

function initProgress() {
  // Stats
  document.getElementById('prog-streak').textContent = STATE.streak;
  document.getElementById('prog-avg').textContent = calcWeeklyAvg();
  document.getElementById('prog-missions').textContent = STATE.totalMissionsCompleted || 0;

  // Natural language summary
  generateProgressSummary();

  // Pillar breakdown
  setPillarBreakdownProgress();

  // Chart
  drawScoreChart();
}

function generateProgressSummary() {
  const el = document.getElementById('progress-summary-text');
  if (!el) return;

  const scores = STATE.weeklyScores;
  const validScores = scores.filter(s => s > 0);

  if (validScores.length < 2) {
    el.textContent = 'Complete a few reviews to see your weekly summary here.';
    return;
  }

  const avg = Math.round(validScores.reduce((a,b) => a+b, 0) / validScores.length);
  const latest = validScores[validScores.length - 1];
  const previous = validScores[validScores.length - 2];
  const trend = latest - previous;

  // Find best and worst pillars
  const pillars = STATE.pillars;
  const sorted = Object.entries(pillars).sort((a,b) => b[1] - a[1]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  let summary = '';

  if (trend > 5) {
    summary += `Your score improved by ${trend} points. `;
  } else if (trend < -5) {
    summary += `Your score dropped ${Math.abs(trend)} points from last session. `;
  } else {
    summary += `Your score has been consistent around ${avg}. `;
  }

  if (best && worst && best[0] !== worst[0]) {
    summary += `${capitalize(best[0])} is your strongest signal at ${best[1]}, while ${capitalize(worst[0])} at ${worst[1]} has the most room for growth. `;
  }

  if (STATE.streak >= 3) {
    summary += `You're on a ${STATE.streak}-day streak — consistency is your edge.`;
  } else if (STATE.streak === 0) {
    summary += `Start a streak today to build momentum.`;
  }

  el.textContent = summary;
}

function setPillarBreakdownProgress() {
  ['execution','reasoning','focus','financial'].forEach(p => {
    const bar = document.getElementById('pb-' + p);
    const val = document.getElementById('pb-' + p + '-val');
    const score = STATE.pillars[p] || 0;
    if (bar) setTimeout(() => { bar.style.width = score + '%'; }, 200);
    if (val) val.textContent = score;
  });
}

function drawScoreChart() {
  const canvas = document.getElementById('score-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy existing
  if (canvas._chart) canvas._chart.destroy();

  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const data = STATE.weeklyScores;

  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data,
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, .1)',
        fill: true,
        tension: .4,
        pointRadius: 3,
        pointBackgroundColor: '#60a5fa',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(148,163,184,.06)' },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          min: 0, max: 100,
          grid: { color: 'rgba(148,163,184,.06)' },
          ticks: { color: '#64748b', font: { size: 11 }, stepSize: 25 }
        }
      }
    }
  });
}


/* ═══════════════════════════════════════════════
   PROFILE / SETTINGS
   ═══════════════════════════════════════════════ */

function initProfile() {
  const typeMap = {
    student: 'Student',
    founder: 'Founder / Builder',
    sales: 'Sales / Closer',
    creator: 'Creator'
  };
  const goalMap = {
    money: 'Stop Wasting Money',
    discipline: 'Consistent Routine',
    focus: 'Deep Focus',
    decisions: 'Better Decisions'
  };

  setEl('profile-user-type', typeMap[STATE.userType] || 'Imperium User');
  setEl('profile-user-goal', 'Goal: ' + (goalMap[STATE.userGoal] || '—'));
  setEl('profile-streak-badge', STATE.streak + ' day streak');
  setEl('setting-email', STATE.userEmail || 'Not signed in');
}

function exportData() {
  const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `imperium-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetApp() {
  if (!confirm('This will permanently delete all your data. Are you sure?')) return;
  if (!confirm('This cannot be undone. Proceed?')) return;
  localStorage.removeItem('imperium_state');
  localStorage.removeItem('imperium_guest_start');
  location.reload();
}


/* ═══════════════════════════════════════════════
   PRO MODAL
   ═══════════════════════════════════════════════ */

function showProModal() {
  document.getElementById('pro-modal').classList.remove('hidden');
}
function closeProModal() {
  document.getElementById('pro-modal').classList.add('hidden');
}


/* ═══════════════════════════════════════════════
   GUEST MODE
   ═══════════════════════════════════════════════ */

function initGuestMode() {
  if (STATE.userName !== 'Guest') return;
  const banner = document.getElementById('guest-banner');
  if (!banner) return;

  const start = parseInt(localStorage.getItem('imperium_guest_start') || Date.now());
  const elapsed = Math.floor((Date.now() - start) / 86400000);
  const remaining = Math.max(0, 3 - elapsed);

  document.getElementById('guest-days-left').textContent = remaining + ' day' + (remaining !== 1 ? 's' : '');
  banner.classList.remove('hidden');

  if (remaining <= 0) {
    banner.querySelector('span').textContent = 'Guest mode expired';
    banner.querySelector('.guest-banner-btn').textContent = 'Create Free Account →';
  }
}


/* ═══════════════════════════════════════════════
   INSIGHT WIDGET
   ═══════════════════════════════════════════════ */

function showInsightWidget() {
  const widget = document.getElementById('insight-widget');
  const text = document.getElementById('insight-text');
  if (!widget || !text) return;

  if (!STATE.lastReviewDate) {
    widget.classList.add('hidden');
    return;
  }

  let msg = '';
  if (STATE.streak >= 7) msg = `${STATE.streak}-day streak! Consistency is the most underrated superpower. Keep it going.`;
  else if (STATE.streak >= 3) msg = `${STATE.streak} days in a row. You're building real momentum.`;
  else if (STATE.todayScore >= 80) msg = `Strong day — ${STATE.todayScore}/100. Focus on maintaining this level.`;
  else if (STATE.todayScore < 40) msg = `${STATE.todayScore}/100 — rough day. Tomorrow is a reset. Focus on one win.`;
  else {
    const weak = getBottomPillar(STATE.analysisResult || { executionScore:50, reasoningScore:50, focusScore:50, financialScore:50 });
    msg = `Your ${weak.name} signal (${weak.score}) could use attention. Today's plan targets this.`;
  }

  if (msg) {
    text.textContent = msg;
    widget.classList.remove('hidden');
  }
}


/* ═══════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════ */

function setEl(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt || '';
}

function animateNumber(el, from, to, dur) {
  if (!el) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Enter key for chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'chat-text-field') {
    e.preventDefault();
    sendTextAnswer();
  }
});


/* ═══════════════════════════════════════════════
   BEAMS CANVAS
   ═══════════════════════════════════════════════ */

(function initBeams() {
  const canvas = document.getElementById('beams-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const beams = Array.from({ length: 6 }, () => ({
    x: Math.random() * canvas.width,
    speed: .3 + Math.random() * .5,
    width: 1 + Math.random() * 2,
    opacity: .03 + Math.random() * .05,
    hue: 210 + Math.random() * 40
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    beams.forEach(b => {
      ctx.beginPath();
      ctx.moveTo(b.x, 0);
      ctx.lineTo(b.x + 30, canvas.height);
      ctx.strokeStyle = `hsla(${b.hue}, 60%, 70%, ${b.opacity})`;
      ctx.lineWidth = b.width;
      ctx.stroke();
      b.x += b.speed;
      if (b.x > canvas.width + 50) b.x = -50;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();


/* ═══════════════════════════════════════════════
   PARTICLES
   ═══════════════════════════════════════════════ */

(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - .5) * .3,
    vy: (Math.random() - .5) * .3,
    r: 1 + Math.random(),
    o: .1 + Math.random() * .3
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148, 163, 184, ${p.o})`;
      ctx.fill();
    });

    // Connect nearby
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(148, 163, 184, ${.05 * (1 - dist/80)})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }
  draw();
})();


/* ═══════════════════════════════════════════════
   VIRTUAL KEYBOARD HANDLER (iOS/Android)
   ═══════════════════════════════════════════════ */

(function() {
  if (!window.visualViewport) return;

  const chatWrap = document.getElementById('chat-input-wrap');
  if (!chatWrap) return;

  window.visualViewport.addEventListener('resize', () => {
    const diff = window.innerHeight - window.visualViewport.height;
    if (diff > 100) {
      chatWrap.style.transform = `translateY(-${diff}px)`;
    } else {
      chatWrap.style.transform = '';
    }
  });
})();
