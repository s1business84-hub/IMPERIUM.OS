import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { computeOperatingScore, computePillars, getLevelFromXP } from '../utils/scoring';
import { generateAnalysis } from '../utils/analysis';
import { PillarCard } from '../components/ui/PillarCard';
import { ScoreCard } from '../components/ui/ScoreCard';
import { MissionCard } from '../components/ui/MissionCard';
import type { ReviewPeriod } from '../types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function getCurrentPeriod(): ReviewPeriod {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

function getDirective(period: ReviewPeriod, role: string | null, hasReviewed: boolean): string {
  if (hasReviewed) {
    return "Review logged. Your system is running. Check your missions for today's execution directive.";
  }
  const directives: Record<ReviewPeriod, Record<string, string>> = {
    morning: {
      founder: "Window's open. 3 questions on what you're shipping today. 90 seconds.",
      sales: 'Set your outreach target before the noise starts. Review opens now.',
      creator: 'Create window is open. Log your intention before the feed hijacks your brain.',
      student: 'First block starts here. Log your study intent — 90 seconds.',
      default: 'Your review window is open. 3 questions. It takes 90 seconds. Go.',
    },
    afternoon: {
      founder: "Mid-day pulse check. Did you ship your priority? Be honest.",
      sales: 'Pipeline check. How many attempts since this morning? Log it.',
      creator: 'Created anything yet? Log your afternoon block now.',
      student: 'Study session check-in. How far through your priority task?',
      default: 'Afternoon check-in. 3 questions. Tells you if the day is salvageable.',
    },
    evening: {
      founder: "Day's done. What moved? What didn't? Evening review takes 90 seconds.",
      sales: 'Final count. Log your results before the day resets.',
      creator: 'Log what you shipped. Even imperfect work counts.',
      student: 'Study recap. What actually landed today?',
      default: 'Evening wrap. 3 questions. Turns a vague day into usable data.',
    },
    night: {
      founder: "Before you sleep — one honest reflection. What would you redo?",
      sales: "Night review. Set tomorrow's outreach intention now.",
      creator: "Night log. What did you consume vs create today?",
      student: "Night recap. Sleep review locked in — your pattern builds here.",
      default: 'Night review. 3 questions. Sets up tomorrow before you sleep.',
    },
  };
  const roleKey = role ?? 'default';
  return (
    directives[period][roleKey] ?? directives[period]['default']!
  );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HomePage() {
  const navigate = useNavigate();
  const { state, updateState } = useAppState();

  const today = new Date().toISOString().split('T')[0]!;
  const period = getCurrentPeriod();

  const todayReviews = state.reviews.filter((r) => r.date === today);
  const hasReviewedToday = todayReviews.some((r) => r.period === period);
  const totalTodayReviews = todayReviews.length;

  const score = useMemo(() => computeOperatingScore(state.reviews), [state.reviews]);
  const pillars = useMemo(() => computePillars(state.reviews), [state.reviews]);

  const analysis = useMemo(() => {
    if (state.reviews.length > 0) {
      return generateAnalysis(state.reviews, state.role, state.outcome);
    }
    return null;
  }, [state.reviews, state.role, state.outcome]);

  const level = getLevelFromXP(state.xp);
  const userName = state.user?.name ?? 'Operator';
  const firstName = userName.split(' ')[0]!;

  const activeMission = state.missions.find((m) => !m.completed && m.dueDate >= today);

  const handleToggleMission = (id: string) => {
    const updated = state.missions.map((m) =>
      m.id === id ? { ...m, completed: !m.completed } : m,
    );
    updateState({ missions: updated, xp: state.xp + 50 });
  };

  // 7-day trend dots
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]!;
    const dayReviews = state.reviews.filter((r) => r.date === d);
    const avgScore =
      dayReviews.length > 0
        ? dayReviews.reduce((sum, r) => sum + (r.score ?? 0), 0) / dayReviews.length
        : 0;
    return { date: d, score: avgScore, hasData: dayReviews.length > 0 };
  });

  const directive = getDirective(period, state.role, hasReviewedToday);

  return (
    <div className="px-4 pt-6 pb-2 flex flex-col gap-4 animate-fade-in">
      {/* Top identity bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <h1 className="text-lg font-bold text-white mt-0.5">
            {getGreeting()}, {firstName}
          </h1>
        </div>
        <div
          className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <span className="text-xs font-bold gradient-text">LVL {level}</span>
          <span className="text-xs text-white/40">{state.xp} XP</span>
        </div>
      </div>

      {/* Streak / day status banner */}
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {state.streak > 0 ? (
          <>
            <span className="text-sm font-semibold text-white">
              🔥 {state.streak}-day streak
            </span>
            <span className="text-xs text-white/40">
              {totalTodayReviews} of 4 today
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-white/60">Start your streak today</span>
            <span className="text-xs text-white/30">Day 0</span>
          </>
        )}
      </div>

      {/* Operating Score */}
      <ScoreCard score={score} />

      {/* Pillar grid */}
      <div className="grid grid-cols-2 gap-3">
        {pillars.map((p) => (
          <PillarCard key={p.id} pillar={p} />
        ))}
      </div>

      {/* Today's Directive */}
      <div
        className="p-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))',
          border: '1px solid rgba(16,185,129,0.15)',
        }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400/70 mb-2">
          {period.toUpperCase()} DIRECTIVE
        </p>
        <p className="text-sm text-white/80 leading-relaxed">{directive}</p>
      </div>

      {/* CTA — Start / Continue Review */}
      <button
        onClick={() => navigate('/review')}
        className="btn-primary text-base"
        style={{ padding: '16px 24px' }}
      >
        {hasReviewedToday
          ? `${period.charAt(0).toUpperCase() + period.slice(1)} review done ✓`
          : `Start ${period.charAt(0).toUpperCase() + period.slice(1)} Review →`}
      </button>

      {/* Insights preview */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
          Intelligence Signals
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Strongest */}
          <div
            className="p-3 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <p className="text-xs text-emerald-400/70 font-semibold mb-1">Strongest</p>
            <p className="text-sm font-bold text-white">
              {analysis
                ? [...analysis.pillars].sort((a, b) => b.score - a.score)[0]?.label ?? '—'
                : '—'}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {analysis ? `${[...analysis.pillars].sort((a, b) => b.score - a.score)[0]?.score ?? 0}/100` : 'Run first review'}
            </p>
          </div>
          {/* Biggest leak */}
          <div
            className="p-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <p className="text-xs text-red-400/70 font-semibold mb-1">Biggest Leak</p>
            <p className="text-sm font-bold text-white">
              {analysis
                ? [...analysis.pillars].sort((a, b) => a.score - b.score)[0]?.label ?? '—'
                : '—'}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {analysis ? `${[...analysis.pillars].sort((a, b) => a.score - b.score)[0]?.score ?? 0}/100` : 'No baseline yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Mission */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
            Active Mission
          </p>
          <button
            onClick={() => navigate('/missions')}
            className="text-xs text-emerald-400/70"
          >
            All missions →
          </button>
        </div>
        {activeMission ? (
          <MissionCard mission={activeMission} onToggle={handleToggleMission} />
        ) : (
          <div
            className="p-4 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm text-white/40">
              {state.reviews.length === 0
                ? 'Complete your first review to generate missions.'
                : 'All missions complete. Run a review to generate new ones.'}
            </p>
          </div>
        )}
      </div>

      {/* 7-day momentum */}
      <div className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
            7-Day Momentum
          </p>
        </div>
        {last7Days.every((d) => !d.hasData) ? (
          <div
            className="p-3 rounded-xl text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex justify-between items-end px-2 mb-2 h-8">
              {last7Days.map((_, i) => (
                <div key={i} className="w-6 h-2 rounded-full bg-white/8" />
              ))}
            </div>
            <p className="text-xs text-white/30">Your trend builds here — check in daily.</p>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-1">
            {last7Days.map((d, i) => {
              const h = d.hasData ? Math.max(6, (d.score / 100) * 40) : 4;
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${h}px`,
                      background: d.hasData
                        ? `linear-gradient(180deg, #10b981, #3b82f6)`
                        : 'rgba(255,255,255,0.08)',
                    }}
                  />
                  <span className="text-[9px] text-white/25">{DAY_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
