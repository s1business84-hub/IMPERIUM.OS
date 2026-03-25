/* ═══════════════════════════════════════════════════════════
   IMPERIUM v4 — Make & Manage Money with AI
   System: "Make money quickly from simple ideas. Manage money intelligently."
═══════════════════════════════════════════════════════════ */

/* ─── STATE ──────────────────────────────────────────────── */
let STATE = {
  user:         null,          // { name, email }
  isGuest:      false,
  onboarded:    false,
  situation:    '',            // idea / side-hustle / business / job
  goal:         '',            // first-payment / replace-job / scale / control
  approxIncome: 5000,
  monthlyBudget: 0,
  transactions:  [],           // { id, type, amount, category, note, date, receiptB64 }
  streak:        0,
  lastOpenDate:  null,
  currency:      '$',
  genCount:      0,            // free tier generations used
};

const FREE_GEN_LIMIT = 3;
const STORE_KEY = 'imperium_v4';

/* ─── CATEGORY ICONS ─────────────────────────────────────── */
const CAT_ICONS = {
  food:'🍔', coffee:'☕', transport:'🚗', shopping:'🛍️', groceries:'🛒',
  bills:'📄', entertainment:'🎬', health:'💊', subscription:'🔄', tools:'🛠️',
  ads:'📢', other:'📌', freelance:'💻', client:'🤝', product:'📦',
  salary:'🏦', investment:'📈',
};

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initParticles();
  initBeams();
  updateStreak();

  if (STATE.onboarded) {
    showApp();
  }
});

function showApp() {
  showScreen('screen-home');
  document.getElementById('bottom-nav').classList.remove('hidden');
  initHome();
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
}
function togglePw(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  STATE.user = { name: email.split('@')[0], email };
  STATE.isGuest = false;
  saveState();
  goOnboardingOrHome();
}
function handleSignup(e) {
  e.preventDefault();
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  STATE.user = { name, email };
  STATE.isGuest = false;
  saveState();
  goOnboardingOrHome();
}
function continueAsGuest() {
  STATE.user = { name: 'Guest', email: '' };
  STATE.isGuest = true;
  saveState();
  goOnboardingOrHome();
}
function goOnboardingOrHome() {
  if (STATE.onboarded) {
    showApp();
  } else {
    showScreen('screen-onboarding');
  }
}
function setAuthMsg(msg, isErr = true) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.style.color = isErr ? 'var(--red)' : 'var(--green2)';
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════════════ */
let _obStep = 1;

function pickSituation(btn) {
  document.querySelectorAll('#ob-1 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.situation = btn.dataset.v;
  setTimeout(() => goObStep(2), 320);
}
function pickGoal(btn) {
  document.querySelectorAll('#ob-2 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.goal = btn.dataset.v;
  setTimeout(() => goObStep(3), 320);
}
function pickIncome(btn) {
  document.querySelectorAll('#ob-3 .ob-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  STATE.approxIncome = parseInt(btn.dataset.v) || 0;
}
function goObStep(n) {
  _obStep = n;
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-' + n).classList.add('active');
  document.getElementById('ob-fill').style.width = (n * 33.3) + '%';
}
function finishOnboarding() {
  STATE.onboarded = true;
  saveState();
  showApp();
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
const NAV_MAP = {
  'screen-home':     'nb-home',
  'screen-make':     'nb-make',
  'screen-track':    'nb-track',
  'screen-insights': 'nb-insights',
  'screen-calendar': null,
  'screen-settings': 'nb-settings',
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = document.getElementById(id);
  if (s) s.classList.add('active');
}

function navigateTo(id) {
  showScreen(id);
  // update nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = NAV_MAP[id];
  if (nb) document.getElementById(nb).classList.add('active');
  // screen-specific init
  if (id === 'screen-home')     initHome();
  if (id === 'screen-insights') initInsights();
  if (id === 'screen-calendar') initCalendar();
  if (id === 'screen-settings') initSettings();
  if (id === 'screen-track')    renderTxFull();
}

/* ═══════════════════════════════════════════════════════════
   HOME
═══════════════════════════════════════════════════════════ */
function initHome() {
  setGreeting();
  setDate();
  renderSnapshotCards();
  renderAIPrompt();
  renderTxHome();
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = STATE.user?.name || 'there';
  document.getElementById('greeting').textContent = g + ', ' + name.split(' ')[0] + ' 👋';
}

function setDate() {
  const d = new Date();
  document.getElementById('top-date').innerHTML =
    d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) +
    '<br>' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}

function renderSnapshotCards() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let income = 0, spent = 0;
  STATE.transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (d.getFullYear() === y && d.getMonth() === m) {
      if (tx.type === 'income')  income += tx.amount;
      if (tx.type === 'expense') spent  += tx.amount;
    }
  });
  const profit = income - spent;
  const runway = spent > 0 && income > 0 ? (income / (spent / 30)) : null;

  document.getElementById('snap-income').textContent = fmt(income);
  document.getElementById('snap-spent').textContent  = fmt(spent);
  document.getElementById('snap-profit').textContent = fmt(profit);
  document.getElementById('snap-runway').textContent = runway ? Math.round(runway) + ' days' : '—';
}

function renderAIPrompt() {
  const txCount = STATE.transactions.length;
  const messages = buildAIBriefing();
  const msg = messages[Math.floor(Math.random() * messages.length)];
  document.getElementById('ai-prompt-text').textContent = msg.text;
  const actionsEl = document.getElementById('ai-prompt-actions');
  actionsEl.innerHTML = '';
  msg.actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'ai-prompt-action';
    btn.textContent = a.label;
    btn.onclick = a.fn;
    actionsEl.appendChild(btn);
  });
}

function buildAIBriefing() {
  const { situation, goal, approxIncome, transactions } = STATE;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let income = 0, spent = 0;
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (d.getFullYear()===y && d.getMonth()===m) {
      if (tx.type==='income')  income += tx.amount;
      if (tx.type==='expense') spent  += tx.amount;
    }
  });

  const msgs = [];

  if (transactions.length === 0) {
    msgs.push({ text: "Welcome to Imperium. Start by logging your first transaction or generating an offer. The AI learns from your money data.", actions: [{ label: '⚡ Make Money', fn: () => navigateTo('screen-make') }, { label: '➕ Log Transaction', fn: () => navigateTo('screen-track') }] });
    msgs.push({ text: "Let's build your money system. First: log what you earn and spend. I'll show you where to focus.", actions: [{ label: '➕ Log Income', fn: () => navigateTo('screen-track') }] });
  } else if (spent > income && income > 0) {
    msgs.push({ text: `⚠️ You're spending ${fmt(spent - income)} more than you're earning this month. Time to make more or cut costs.`, actions: [{ label: '⚡ Generate an offer', fn: () => navigateTo('screen-make') }, { label: '🧠 Get advice', fn: () => navigateTo('screen-insights') }] });
  } else if (income > 0) {
    const margin = Math.round(((income - spent) / income) * 100);
    msgs.push({ text: `Profit margin this month: ${margin}%. ${margin > 30 ? 'Strong. Keep it up.' : 'Room to improve — cut one expense today.'}`, actions: [{ label: '📈 See breakdown', fn: () => navigateTo('screen-insights') }] });
  }

  if (goal === 'first-payment' && income === 0) {
    msgs.push({ text: "Your goal is to get your first payment. Generate an offer now and send 10 outreach messages today.", actions: [{ label: '💡 Generate Offer', fn: () => { navigateTo('screen-make'); switchMakeTab('offer'); } }, { label: '📩 Get Scripts', fn: () => { navigateTo('screen-make'); switchMakeTab('outreach'); } }] });
  }
  if (goal === 'scale') {
    msgs.push({ text: "To scale, create content consistently. One post per day is enough. Use the Content Generator.", actions: [{ label: '📣 Generate Content', fn: () => { navigateTo('screen-make'); switchMakeTab('content'); } }] });
  }
  if (situation === 'idea') {
    msgs.push({ text: "You have an idea — that's step one. Step two: turn it into a clear offer. Takes 2 minutes.", actions: [{ label: '💡 Build My Offer', fn: () => navigateTo('screen-make') }] });
  }

  // always have at least one
  if (msgs.length === 0) {
    msgs.push({ text: "Money is a skill. You're building it. Log every pound, generate income, cut the fat.", actions: [{ label: '➕ Log', fn: () => navigateTo('screen-track') }, { label: '🧠 Insights', fn: () => navigateTo('screen-insights') }] });
  }
  return msgs;
}

function renderTxHome() {
  const feed = document.getElementById('tx-feed-home');
  const recent = [...STATE.transactions].reverse().slice(0, 5);
  if (recent.length === 0) {
    feed.innerHTML = '<div class="tx-empty">No transactions yet. Tap <strong>Log Transaction</strong> to start.</div>';
    return;
  }
  feed.innerHTML = recent.map(tx => buildTxHTML(tx)).join('');
}

/* ═══════════════════════════════════════════════════════════
   TRACK — TRANSACTIONS
═══════════════════════════════════════════════════════════ */
let _logType = 'expense';
let _logCat  = 'food';
let _receiptB64 = null;

function switchLogType(btn) {
  _logType = btn.dataset.t;
  document.querySelectorAll('.log-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cat-grid-wrap').classList.toggle('hidden', _logType !== 'expense');
  document.getElementById('income-source-wrap').classList.toggle('hidden', _logType !== 'income');
  _logCat = _logType === 'expense' ? 'food' : 'freelance';
  // reset selection
  const grid = _logType === 'expense'
    ? document.querySelectorAll('#cat-grid-wrap .cat-btn')
    : document.querySelectorAll('#income-source-wrap .cat-btn');
  grid.forEach((b, i) => b.classList.toggle('selected', i === 0));
}

function pickCat(btn) {
  const parent = btn.closest('.cat-grid');
  parent.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _logCat = btn.dataset.c;
}

function handleReceipt(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _receiptB64 = ev.target.result;
    document.getElementById('receipt-img').src = _receiptB64;
    document.getElementById('receipt-thumb').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}
function rmReceipt() {
  _receiptB64 = null;
  document.getElementById('receipt-thumb').classList.add('hidden');
  document.getElementById('receipt-file').value = '';
}

function saveTransaction() {
  const amtEl = document.getElementById('tx-amount');
  const amt = parseFloat(amtEl.value);
  if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
  const tx = {
    id:         Date.now(),
    type:       _logType,
    amount:     amt,
    category:   _logCat,
    note:       document.getElementById('tx-note').value.trim(),
    date:       new Date().toISOString(),
    receiptB64: _receiptB64,
  };
  STATE.transactions.push(tx);
  saveState();
  // reset
  amtEl.value = '';
  document.getElementById('tx-note').value = '';
  rmReceipt();
  showToast('Saved! ' + (tx.type === 'income' ? '+' + fmt(amt) : '-' + fmt(amt)), 'success');
  renderTxFull();
}

function renderTxFull() {
  const feed = document.getElementById('tx-feed-full');
  const sorted = [...STATE.transactions].reverse();
  document.getElementById('tx-count').textContent = sorted.length;
  if (sorted.length === 0) {
    feed.innerHTML = '<div class="tx-empty">No transactions yet.</div>';
    return;
  }
  feed.innerHTML = sorted.map(tx => buildTxHTML(tx)).join('');
}

function buildTxHTML(tx) {
  const icon = CAT_ICONS[tx.category] || '📌';
  const d = new Date(tx.date);
  const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  const sign = tx.type === 'income' ? '+' : '-';
  return `<div class="tx-item">
    <div class="tx-icon">${icon}</div>
    <div class="tx-info">
      <div class="tx-cat">${tx.category}</div>
      ${tx.note ? `<div class="tx-note">${tx.note}</div>` : ''}
      <div class="tx-date">${dateStr}</div>
    </div>
    <div class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   INSIGHTS
═══════════════════════════════════════════════════════════ */
let _lineChart = null;
let _pieChart  = null;

function initInsights() {
  renderHealthScore();
  renderAdviceFeed();
  renderCharts();
}

function getMonthTotals() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let income = 0, spent = 0;
  const catTotals = {};
  STATE.transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (d.getFullYear()===y && d.getMonth()===m) {
      if (tx.type==='income')  income += tx.amount;
      if (tx.type==='expense') { spent += tx.amount; catTotals[tx.category] = (catTotals[tx.category]||0) + tx.amount; }
    }
  });
  return { income, spent, catTotals };
}

function renderHealthScore() {
  const { income, spent } = getMonthTotals();
  if (income === 0 && spent === 0) return;

  const margin = income > 0 ? Math.round(((income - spent) / income) * 100) : 0;
  const savingsRate = income > 0 ? Math.round(((income - spent) / income) * 100) : 0;
  const burnRate = spent > 0 ? Math.round(spent / 30) : 0;
  const runwayDays = burnRate > 0 && income > 0 ? Math.round(income / burnRate) : null;

  // score: 0-100
  let score = 50;
  if (margin > 0)  score += 20;
  if (margin > 30) score += 10;
  if (margin > 50) score += 10;
  if (burnRate < 50) score += 5;
  if (income > STATE.approxIncome * 0.8) score += 5;
  score = Math.min(100, Math.max(0, score));

  document.getElementById('health-score').textContent = score;
  const circumference = 263.9;
  const offset = circumference - (score / 100) * circumference;
  document.getElementById('health-ring-fill').style.strokeDashoffset = offset;

  document.getElementById('hb-margin').textContent  = margin + '%';
  document.getElementById('hb-runway').textContent  = runwayDays ? runwayDays + ' days' : '—';
  document.getElementById('hb-burn').textContent    = fmt(burnRate) + '/day';
  document.getElementById('hb-savings').textContent = savingsRate + '%';
}

function renderAdviceFeed() {
  const feed = document.getElementById('advice-feed');
  const { income, spent, catTotals } = getMonthTotals();

  if (income === 0 && spent === 0) {
    feed.innerHTML = '<div class="advice-empty">Log some transactions to get personalised AI advice.</div>';
    return;
  }

  const advice = generateAdvice(income, spent, catTotals);
  feed.innerHTML = advice.map((a, i) => `
    <div class="advice-card" style="animation-delay:${i * 0.08}s">
      <div class="advice-icon">${a.icon}</div>
      <div class="advice-content">
        <div class="advice-tag">${a.tag}</div>
        <div class="advice-text">${a.text}</div>
      </div>
    </div>
  `).join('');
}

function generateAdvice(income, spent, catTotals) {
  const advice = [];
  const profit = income - spent;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  if (profit < 0) {
    advice.push({ icon: '🚨', tag: 'CRITICAL', text: `You are losing ${fmt(Math.abs(profit))} this month. Cut your highest expense immediately or raise your prices.` });
  } else if (margin < 20) {
    advice.push({ icon: '⚠️', tag: 'LOW MARGIN', text: `Your profit margin is only ${Math.round(margin)}%. Aim for 30%+. Either raise prices 20% or cut one recurring cost.` });
  } else {
    advice.push({ icon: '✅', tag: 'HEALTHY', text: `Profit margin: ${Math.round(margin)}%. You're in the green. Now focus on scaling income, not cutting costs.` });
  }

  // biggest expense category
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
  if (topCat) {
    const pct = Math.round((topCat[1] / spent) * 100);
    advice.push({ icon: '💡', tag: 'TOP EXPENSE', text: `${topCat[0].charAt(0).toUpperCase() + topCat[0].slice(1)} is ${pct}% of your spending (${fmt(topCat[1])}). Is every pound here essential?` });
  }

  if (income > 0 && income < 1000) {
    advice.push({ icon: '⚡', tag: 'INCOME BOOST', text: `You earned ${fmt(income)} this month. To reach $1K, you need ${fmt(1000 - income)} more. Send 5 more outreach messages today.` });
  } else if (income >= 1000 && income < 5000) {
    advice.push({ icon: '📈', tag: 'SCALE UP', text: `You're at ${fmt(income)}/month. To hit $5K, focus on raising your prices 20% — not finding new clients.` });
  }

  const subSpend = catTotals['subscription'] || 0;
  if (subSpend > 50) {
    advice.push({ icon: '🔄', tag: 'SUBSCRIPTIONS', text: `You're spending ${fmt(subSpend)} on subscriptions. Audit each one. Cancel anything you haven't used in 2 weeks.` });
  }

  advice.push({ icon: '🎯', tag: 'NEXT ACTION', text: buildNextAction() });
  return advice;
}

function buildNextAction() {
  const { goal, situation } = STATE;
  if (goal === 'first-payment') return 'Send your offer to 10 people today. No pitch, just "I can help you with X. Want to know how?" That's it.';
  if (goal === 'replace-job')   return 'Calculate your monthly expenses. That is your freedom number. Build a plan to hit it in 6 months.';
  if (goal === 'scale')         return 'Raise your prices by 20% for the next new client. Most people say yes.';
  if (goal === 'control')       return 'Track every transaction for 7 days. Awareness beats willpower every time.';
  return 'Log your income and expenses daily. 5 minutes. It compounds.';
}

function askAI() {
  const q = document.getElementById('ask-input').value.trim();
  if (!q) return;
  const res = document.getElementById('ask-result');
  res.classList.remove('hidden');
  res.textContent = '...';
  setTimeout(() => {
    res.textContent = generateAIAnswer(q);
  }, 600);
}

function generateAIAnswer(q) {
  const ql = q.toLowerCase();
  const { income, spent } = getMonthTotals();
  const profit = income - spent;

  if (ql.includes('profit') || ql.includes('increase income') || ql.includes('make more')) {
    return profit > 0
      ? `You have ${fmt(profit)} profit this month. To increase it: (1) Raise prices 10-20% for new clients. (2) Add one upsell to existing clients. (3) Cut your lowest-ROI expense.`
      : `You're currently at a loss of ${fmt(Math.abs(profit))}. Priority: generate revenue before cutting costs. Use the Make Money tab to build an offer today.`;
  }
  if (ql.includes('save') || ql.includes('cut') || ql.includes('spending')) {
    return `This month you spent ${fmt(spent)}. Start by cutting subscriptions and "convenience" expenses like daily coffee. Even ${fmt(5)}/day = ${fmt(150)}/month saved.`;
  }
  if (ql.includes('runway') || ql.includes('how long')) {
    const burn = spent / 30;
    const days = burn > 0 && income > 0 ? Math.round(income / burn) : null;
    return days ? `At your current burn rate of ${fmt(Math.round(burn))}/day, your monthly income supports ${days} days of expenses. Build 3 months of runway as a safety net.` : 'Log your income and expenses first to calculate your runway.';
  }
  if (ql.includes('first client') || ql.includes('first sale') || ql.includes('first payment')) {
    return 'Formula: (1) Identify one specific person who has the problem you solve. (2) Reach out with a simple message offering to help. (3) Charge $100-$500 to start. Speed beats perfection.';
  }
  if (ql.includes('price') || ql.includes('charge')) {
    return 'Charge 2-3x what you think is fair. You will attract better clients and work less. Most people underprice out of fear. Test a higher price — the worst they say is no.';
  }
  return `Based on your current data: Income ${fmt(income)}, Expenses ${fmt(spent)}, Profit ${fmt(profit)}. Focus on: ${profit < 0 ? 'generating revenue first' : 'scaling what is already working'}. Use the Make Money tab for AI-generated offers and scripts.`;
}

function renderCharts() {
  renderLineChart();
  renderPieChart();
}

function renderLineChart() {
  const ctx = document.getElementById('income-chart');
  if (!ctx) return;
  if (_lineChart) _lineChart.destroy();

  const days = 7;
  const labels = [], incomeData = [], expenseData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { weekday:'short' });
    labels.push(label);
    let inc = 0, exp = 0;
    STATE.transactions.forEach(tx => {
      const td = new Date(tx.date);
      if (td.toDateString() === d.toDateString()) {
        if (tx.type === 'income')  inc += tx.amount;
        if (tx.type === 'expense') exp += tx.amount;
      }
    });
    incomeData.push(inc); expenseData.push(exp);
  }

  _lineChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',  data: incomeData,  backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 6 },
        { label: 'Expense', data: expenseData, backgroundColor: 'rgba(245,158,11,.7)', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } },
      scales: {
        x: { ticks: { color: '#475569' }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#475569', callback: v => '$' + v }, grid: { color: 'rgba(255,255,255,.04)' } },
      },
    },
  });
}

function renderPieChart() {
  const ctx = document.getElementById('cat-chart');
  if (!ctx) return;
  if (_pieChart) _pieChart.destroy();
  const { catTotals } = getMonthTotals();
  const labels = Object.keys(catTotals);
  const data   = Object.values(catTotals);
  if (data.length === 0) return;

  const colors = ['#10b981','#3b82f6','#f59e0b','#a855f7','#ef4444','#06b6d4','#84cc16','#f97316','#ec4899','#8b5cf6','#14b8a6','#64748b'];

  _pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderWidth: 2, borderColor: '#080b14' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 12 }, padding: 12 } } },
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   CALENDAR
═══════════════════════════════════════════════════════════ */
let _calDate = new Date();
let _selDay  = null;

function initCalendar() {
  renderCalendar();
}
function changeMonth(dir) {
  _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + dir, 1);
  renderCalendar();
}

function renderCalendar() {
  const y = _calDate.getFullYear(), m = _calDate.getMonth();
  document.getElementById('cal-month').textContent =
    _calDate.toLocaleString('en-US', { month:'long', year:'numeric' });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // empty cells
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty-day';
    grid.appendChild(el);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(y, m, day);
    const hasTx = STATE.transactions.some(tx => {
      const d = new Date(tx.date);
      return d.getFullYear()===y && d.getMonth()===m && d.getDate()===day;
    });
    const isToday = today.getFullYear()===y && today.getMonth()===m && today.getDate()===day;
    const isSel   = _selDay === day;

    const el = document.createElement('div');
    el.className = 'cal-day' + (isToday ? ' today' : '') + (isSel ? ' selected' : '') + (hasTx ? ' has-tx' : '');
    el.innerHTML = `<span class="day-num">${day}</span><div class="day-dot"></div>`;
    el.onclick = () => selectCalDay(day);
    grid.appendChild(el);
  }

  renderMonthStats(y, m);
  if (_selDay) selectCalDay(_selDay);
}

function selectCalDay(day) {
  _selDay = day;
  const y = _calDate.getFullYear(), m = _calDate.getMonth();
  const d = new Date(y, m, day);
  document.getElementById('cal-detail-head').textContent =
    d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  const txs = STATE.transactions.filter(tx => {
    const td = new Date(tx.date);
    return td.getFullYear()===y && td.getMonth()===m && td.getDate()===day;
  });

  if (txs.length === 0) {
    document.getElementById('cal-detail-total').textContent = 'No activity';
    document.getElementById('cal-detail-list').innerHTML = '<p class="cal-empty-msg">No transactions this day</p>';
  } else {
    let inc = 0, exp = 0;
    txs.forEach(tx => { if (tx.type==='income') inc+=tx.amount; else exp+=tx.amount; });
    document.getElementById('cal-detail-total').textContent =
      `Income: ${fmt(inc)} · Spent: ${fmt(exp)} · Net: ${fmt(inc-exp)}`;
    document.getElementById('cal-detail-list').innerHTML = txs.map(tx => buildTxHTML(tx)).join('');
  }
  renderCalendar(); // re-render to update selection
}

function renderMonthStats(y, m) {
  let inc = 0, exp = 0;
  STATE.transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (d.getFullYear()===y && d.getMonth()===m) {
      if (tx.type==='income')  inc += tx.amount;
      if (tx.type==='expense') exp += tx.amount;
    }
  });
  document.getElementById('ms-income').textContent = fmt(inc);
  document.getElementById('ms-spent').textContent  = fmt(exp);
  document.getElementById('ms-profit').textContent = fmt(inc - exp);
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════ */
function initSettings() {
  const name = STATE.user?.name || 'User';
  document.getElementById('p-name').textContent = name;
  document.getElementById('pav-icon').textContent = name.charAt(0).toUpperCase() || '👤';
  const goalLabels = { 'first-payment':'Get first payment', 'replace-job':'Replace salary', 'scale':'Scale revenue', 'control':'Control spending' };
  document.getElementById('p-sub').textContent = 'Goal: ' + (goalLabels[STATE.goal] || '—');
  document.getElementById('p-streak').textContent = STATE.streak + ' day streak 🔥';
  document.getElementById('s-budget').textContent = STATE.monthlyBudget > 0 ? fmt(STATE.monthlyBudget) : 'Not set';
}

function openBudgetModal() {
  document.getElementById('budget-val').value = STATE.monthlyBudget || '';
  document.getElementById('modal-budget').classList.remove('hidden');
}
function closeBudgetModal() { document.getElementById('modal-budget').classList.add('hidden'); }
function saveBudget() {
  const v = parseFloat(document.getElementById('budget-val').value);
  if (!isNaN(v) && v >= 0) { STATE.monthlyBudget = v; saveState(); showToast('Budget saved'); }
  closeBudgetModal();
  initSettings();
}

function openProModal()  { document.getElementById('modal-pro').classList.remove('hidden'); }
function closeProModal() { document.getElementById('modal-pro').classList.add('hidden'); }
function openCurrencyModal() { showToast('Currency selector coming soon', 'success'); }

function exportData() {
  const json = JSON.stringify(STATE, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'imperium-data.json';
  a.click();
  showToast('Data exported!', 'success');
}

function resetApp() {
  if (!confirm('Delete all data? This cannot be undone.')) return;
  localStorage.removeItem(STORE_KEY);
  location.reload();
}

/* ═══════════════════════════════════════════════════════════
   MAKE MONEY — AI GENERATORS
═══════════════════════════════════════════════════════════ */
let _selPlatform = 'instagram';
let _selOutreachType = 'dm';

function switchMakeTab(tab) {
  document.querySelectorAll('.make-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('mtab-' + tab).classList.add('active');
  document.querySelectorAll('.make-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
}

function selectPlatform(btn) {
  document.querySelectorAll('.platform-pills .pill[data-p]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _selPlatform = btn.dataset.p;
}

function selectOutreachType(btn) {
  document.querySelectorAll('.platform-pills .pill[data-o]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  _selOutreachType = btn.dataset.o;
}

function checkGenLimit(onAllowed) {
  if (STATE.genCount >= FREE_GEN_LIMIT) {
    openProModal();
    return;
  }
  STATE.genCount++;
  saveState();
  onAllowed();
}

function generateOffer() {
  const input = document.getElementById('offer-input').value.trim();
  if (!input) { showToast('Tell me your skill or idea first', 'error'); return; }
  checkGenLimit(() => {
    const btn = document.querySelector('#panel-offer .btn-primary');
    setLoading(btn, true);
    setTimeout(() => {
      const result = buildOfferOutput(input);
      document.getElementById('offer-result-body').textContent = result;
      document.getElementById('offer-result').classList.remove('hidden');
      setLoading(btn, false);
      document.getElementById('offer-result').scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 900);
  });
}

function buildOfferOutput(input) {
  const inp = input.toLowerCase();
  let service = input;
  let price = '$297';
  let deliverable = 'complete project in 5 business days';
  let outcome = 'results you can see';

  if (inp.includes('video') || inp.includes('edit')) {
    service = 'Professional Video Editing';
    price = '$297 – $597';
    deliverable = '3 polished videos per week with revisions';
    outcome = '3x more watch time and engagement on your content';
  } else if (inp.includes('fitness') || inp.includes('workout') || inp.includes('gym')) {
    service = '12-Week Body Transformation Programme';
    price = '$197 – $497';
    deliverable = 'custom plan + weekly check-in calls';
    outcome = 'lose 5-10kg and build visible muscle in 90 days';
  } else if (inp.includes('social') || inp.includes('instagram') || inp.includes('content')) {
    service = 'Social Media Content Package';
    price = '$497/month';
    deliverable = '30 posts, 15 stories, and a monthly strategy call';
    outcome = '10K+ reach and consistent brand presence';
  } else if (inp.includes('web') || inp.includes('website') || inp.includes('design')) {
    service = 'Professional Website Design & Build';
    price = '$797 – $1,497';
    deliverable = '5-page website, mobile optimised, delivered in 10 days';
    outcome = 'a website that converts visitors to customers';
  } else if (inp.includes('write') || inp.includes('copy') || inp.includes('blog')) {
    service = 'Conversion Copywriting Service';
    price = '$397/month';
    deliverable = '4 blog posts or landing page copy per month';
    outcome = 'more traffic and 20% higher conversion rate';
  } else if (inp.includes('coach') || inp.includes('mentor') || inp.includes('consult')) {
    service = '1-on-1 Coaching Programme';
    price = '$197/month';
    deliverable = '4 weekly 60-min sessions + unlimited WhatsApp support';
    outcome = 'a clear action plan and accountability system';
  }

  return `🎯 YOUR OFFER

Service: "${service}"

The Pitch:
I help [target client] achieve [outcome] without [pain/frustration], in [timeframe].

What They Get:
• ${deliverable}
• Dedicated support throughout
• Revision rounds included
• 100% satisfaction guarantee

Price: ${price}

Why They Should Say Yes Now:
This price is locked for the next 5 clients. After that it increases 30%.

How to Present It:
"I'm working with 5 businesses this month on [service]. I've helped clients achieve [outcome]. Want me to send you the details?"

Next Step:
Send this offer to 10 people today. 1-2 will say yes.`;
}

function refineOffer() {
  const current = document.getElementById('offer-result-body').textContent;
  checkGenLimit(() => {
    const result = current + '\n\n─────────────────\n💡 REFINED VERSION\n\nSimplify your pitch to one sentence:\n"I do [service] for [client type] so they can [outcome]. It costs [price] and takes [time]."\n\nThen add urgency:\n"I only take 3 clients per month. 1 spot left."';
    document.getElementById('offer-result-body').textContent = result;
  });
}

function generateContent() {
  const input = document.getElementById('content-input').value.trim();
  if (!input) { showToast('Describe your offer or topic first', 'error'); return; }
  checkGenLimit(() => {
    const btn = document.querySelector('#panel-content .btn-primary');
    setLoading(btn, true);
    setTimeout(() => {
      const result = buildContentOutput(input, _selPlatform);
      document.getElementById('content-result-body').textContent = result;
      document.getElementById('content-result').classList.remove('hidden');
      setLoading(btn, false);
    }, 800);
  });
}

function buildContentOutput(input, platform) {
  const templates = {
    instagram: `📸 INSTAGRAM POST\n\nHook (first line):\n"I made ${fmt(2000)} in 7 days with just ${input}. Here's exactly how 👇"\n\nCaption:\nMost people overthink this.\n\nHere's the simple version:\n→ Identify one person with one problem\n→ Offer one solution\n→ Charge a fair price\n\nThat's it. No funnel. No ads.\n\nWant to know how?\nComment "YES" and I'll send you the breakdown.\n\nHashtags:\n#freelance #makemoney #${input.toLowerCase().replace(/\s/g,'').slice(0,15)} #entrepreneur #sidehustle`,
    twitter: `🐦 TWITTER/X THREAD\n\nTweet 1 (hook):\nI turned "${input}" into ${fmt(500)} in 48 hours.\n\nThread on exactly how 🧵👇\n\nTweet 2:\nStep 1: Find the problem.\nMost people skip this. Don't.\n\nTweet 3:\nStep 2: Build your offer in 30 minutes.\nNo portfolio needed.\n\nTweet 4:\nStep 3: Reach out to 10 people.\nNot to pitch — to start a conversation.\n\nTweet 5:\nThe result: 2 clients. ${fmt(500)} in 2 days.\nYou can do this too.\n\nRT if this was useful.`,
    linkedin: `�� LINKEDIN POST\n\n3 months ago I was stuck with "${input}".\n\nToday it generates consistent income.\n\nHere's what changed:\n\n1. I stopped waiting to be "ready"\n2. I packaged my skill into a clear offer\n3. I reached out to 5 people per day\n\nNo fancy website. No logo. No portfolio.\n\nJust a clear offer and consistent action.\n\nIf you're sitting on a skill that could earn money — start today.\n\nWhat's stopping you? Drop it in the comments.\n\n#entrepreneurship #freelance #growth`,
    tiktok: `🎵 TIKTOK SCRIPT\n\n[0-2s] Hook:\n"I made money from ${input} and here's the exact method"\n\n[3-15s] Story:\n"A few months ago I was broke and frustrated. I had this skill but no idea how to monetise it. Then I figured out the 3-step method."\n\n[15-35s] Method:\n"Step 1: Write your offer in one sentence. Step 2: Find 10 potential clients on Instagram. Step 3: Send this exact message: [show phone screen]"\n\n[35-45s] CTA:\n"Follow for part 2 where I show the messages that got me clients. Drop 'YES' if you want the template."\n\nText on screen: "From 0 to clients in 48 hours"`,
  };
  return templates[platform] || templates.instagram;
}

function generateOutreach() {
  const input = document.getElementById('outreach-input').value.trim();
  if (!input) { showToast('Describe your target audience first', 'error'); return; }
  checkGenLimit(() => {
    const btn = document.querySelector('#panel-outreach .btn-primary');
    setLoading(btn, true);
    setTimeout(() => {
      const result = buildOutreachOutput(input, _selOutreachType);
      document.getElementById('outreach-result-body').textContent = result;
      document.getElementById('outreach-result').classList.remove('hidden');
      setLoading(btn, false);
    }, 700);
  });
}

function buildOutreachOutput(input, type) {
  const target = input;
  const scripts = {
    dm: `📱 DM SCRIPT\n\n[Message 1 — Cold intro]\n"Hey [Name], I came across your page and noticed you're doing great work with [their niche].\n\nI help ${target} [specific result]. I've got something that might be useful for you.\n\nWould it be weird if I sent you more details?"\n\n[If they reply YES]\n"Perfect. I work with ${target} to [service + outcome]. It takes [time] and the investment is [price].\n\nAre you open to a quick 15-min call this week to see if it's a fit?"\n\n[If no reply after 48h — Follow-up]\n"Hey, just following up on my last message. Still think this could be useful for you. Totally fine if it's not the right time 🙂"\n\n📌 Tips:\n• Send to 20 people per day\n• Personalise the first line\n• Never pitch immediately`,
    email: `📧 EMAIL SCRIPT\n\nSubject: Quick idea for [their business name]\n\nHi [Name],\n\nI'll keep this short.\n\nI work with ${target} to [specific outcome] — usually in [timeframe].\n\nI noticed [specific thing about them] and thought you'd be a strong fit for what I do.\n\nI'm not asking for a big commitment. Just a quick 15-minute call to see if there's a fit.\n\nAre you free this week?\n\n[Your Name]\n\n---\n\nPS: If now isn't the right time, no worries at all.\n\n📌 Tips:\n• Keep subject lines under 7 words\n• Always offer a specific, low-commitment next step\n• Follow up 3 times before giving up`,
    'follow-up': `🔁 FOLLOW-UP SCRIPTS\n\nFollow-up 1 (3 days after):\n"Hey [Name], just checking if you had a chance to see my last message?\n\nCompletely understand if timing isn't right — just didn't want to assume."\n\nFollow-up 2 (5 days after):\n"Hi [Name], one last follow-up — I'm locking in my schedule for the month and had one spot left. Thought of you.\n\nIf you're interested in [service], I'd love to chat. If not, totally fine!"\n\nFollow-up 3 (10 days after — the break-up):\n"Hey [Name], I'll stop reaching out after this one.\n\nIf things change and you need help with [problem], I'm here.\n\nWishing you the best regardless!"\n\n📌 Most deals close on follow-up 2-5. Never give up after one message.`,
  };
  return scripts[type] || scripts.dm;
}

function copyResult(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!', 'success'))
    .catch(() => showToast('Copy failed', 'error'));
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function fmt(n) {
  return STATE.currency + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function showToast(msg, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function setLoading(btn, on) {
  if (!btn) return;
  if (on) {
    btn.dataset.origText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText;
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * 1000, y: Math.random() * 1000,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .5,
      alpha: Math.random() * .5 + .1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(52,211,153,${p.alpha})`;
      ctx.fill();
    });
    // draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(52,211,153,${.06 * (1 - dist/100)})`;
          ctx.lineWidth = .5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════════════════════
   BEAMS
═══════════════════════════════════════════════════════════ */
function initBeams() {
  const canvas = document.getElementById('beams-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const beams = [];
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 4; i++) {
    beams.push({ x: Math.random() * 1000, y: -50, vx: (Math.random()-.5)*.5, vy: Math.random()*.8+.3, angle: Math.random() * Math.PI * 2, len: 100+Math.random()*150 });
  }
  function drawBeams() {
    ctx.clearRect(0, 0, W, H);
    beams.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (b.y > H + 100) { b.y = -50; b.x = Math.random() * W; }
      const grad = ctx.createLinearGradient(b.x, b.y, b.x + Math.cos(b.angle)*b.len, b.y + Math.sin(b.angle)*b.len);
      grad.addColorStop(0, 'rgba(16,185,129,0)');
      grad.addColorStop(.5,'rgba(16,185,129,.15)');
      grad.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(b.angle)*b.len, b.y + Math.sin(b.angle)*b.len);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    requestAnimationFrame(drawBeams);
  }
  drawBeams();
}

/* ═══════════════════════════════════════════════════════════
   STREAK
═══════════════════════════════════════════════════════════ */
function updateStreak() {
  const today = new Date().toDateString();
  if (STATE.lastOpenDate !== today) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (STATE.lastOpenDate === yesterday.toDateString()) {
      STATE.streak += 1;
    } else if (STATE.lastOpenDate && STATE.lastOpenDate !== today) {
      STATE.streak = 1;
    } else {
      STATE.streak = (STATE.streak || 0) + (STATE.streak === 0 ? 1 : 0);
    }
    STATE.lastOpenDate = today;
    saveState();
  }
}

/* ═══════════════════════════════════════════════════════════
   PERSIST
═══════════════════════════════════════════════════════════ */
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(STATE)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { Object.assign(STATE, JSON.parse(raw)); }
  } catch(e) {}
}
