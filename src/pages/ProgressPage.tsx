import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { computePillars, computeOperatingScore } from '../utils/scoring';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ProgressPage() {
  const navigate = useNavigate();
  const { state } = useAppState();

  const pillars = useMemo(() => computePillars(state.reviews), [state.reviews]);

  const today = new Date().toISOString().split('T')[0]!;
  const thisWeekReviews = state.reviews.filter((r) => {
    const d = new Date(r.date);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return d >= weekAgo;
  });

  const completedMissions = state.missions.filter((m) => m.completed).length;
  const totalMissions = state.missions.length;
  const missionRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]!;
    const dayReviews = state.reviews.filter((r) => r.date === d);
    const avgScore =
      dayReviews.length > 0
        ? dayReviews.reduce((sum, r) => sum + (r.score ?? 0), 0) / dayReviews.length
        : 0;
    return { date: d, score: Math.round(avgScore), hasData: dayReviews.length > 0 };
  });

  const operatingScore = computeOperatingScore(state.reviews);

  const hasData = state.reviews.length > 0;

  return (
    <div className="px-4 pt-6 pb-2 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Your Progress</h1>
        <p className="text-xs text-white/40 mt-0.5">Pattern builds with each review</p>
      </div>

      {/* Streak */}
      <div className="glass p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
          Consistency
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-3xl font-bold gradient-text">{state.streak}</span>
            <span className="text-xs text-white/40 mt-0.5">Current Streak</span>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-white/60">
              {thisWeekReviews.length}
            </span>
            <span className="text-xs text-white/40 mt-0.5">Reviews This Week</span>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-white/60">{state.reviews.length}</span>
            <span className="text-xs text-white/40 mt-0.5">Total Reviews</span>
          </div>
        </div>
        {state.streak === 0 && (
          <p className="text-xs text-white/30 mt-3 border-t border-white/8 pt-3">
            Start your streak today — complete one review to begin.
          </p>
        )}
      </div>

      {/* Weekly score trend */}
      <div className="glass p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
            7-Day Score Trend
          </p>
          {operatingScore > 0 && (
            <span className="text-sm font-bold gradient-text">{operatingScore} avg</span>
          )}
        </div>
        <div className="flex items-end justify-between gap-1 h-16">
          {last7Days.map((d, i) => {
            const heightPct = d.hasData ? Math.max(8, (d.score / 100) * 100) : 4;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className="w-full rounded-t-md transition-all duration-500 relative group"
                  style={{
                    height: `${heightPct}%`,
                    background: d.hasData
                      ? d.date === today
                        ? 'linear-gradient(180deg, #10b981, #3b82f6)'
                        : 'rgba(16,185,129,0.5)'
                      : 'rgba(255,255,255,0.08)',
                    minHeight: '4px',
                  }}
                >
                  {d.hasData && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-white/60 font-semibold whitespace-nowrap">
                      {d.score}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] ${d.date === today ? 'text-emerald-400' : 'text-white/25'}`}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
        {!hasData && (
          <p className="text-xs text-white/25 mt-3 text-center">
            Your trend builds after 3 reviews. Check in daily.
          </p>
        )}
      </div>

      {/* Pillar averages */}
      <div className="glass p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
          Pillar Averages
        </p>
        {pillars.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">{p.label}</span>
              <span
                className={`font-semibold ${
                  p.score >= 70
                    ? 'text-emerald-400'
                    : p.score >= 40
                      ? 'text-amber-400'
                      : p.score === 0
                        ? 'text-white/25'
                        : 'text-red-400'
                }`}
              >
                {p.score > 0 ? p.score : '—'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${p.score}%`,
                  background:
                    p.score >= 70
                      ? '#10b981'
                      : p.score >= 40
                        ? '#f59e0b'
                        : p.score > 0
                          ? '#ef4444'
                          : 'transparent',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mission stats */}
      <div className="glass p-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
          Mission Completion
        </p>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="absolute inset-0 -rotate-90" width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(missionRate / 100) * 163} 163`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold gradient-text">
              {missionRate}%
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-white/80">
              {completedMissions} of {totalMissions} missions done
            </p>
            <p className="text-xs text-white/40">
              {missionRate >= 80
                ? 'Elite execution. Maintain this.'
                : missionRate >= 50
                  ? 'Good momentum. Push the last gap.'
                  : totalMissions === 0
                    ? 'Complete a review to unlock missions.'
                    : 'Execution needs attention. Simpler tasks first.'}
            </p>
          </div>
        </div>
      </div>

      {/* Empty state copy */}
      {!hasData && (
        <div
          className="p-4 rounded-2xl text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-sm text-white/40 leading-relaxed">
            Your pattern library builds after 3 reviews. Check in daily — the data tells the story.
          </p>
          <button onClick={() => navigate('/review')} className="btn-primary mt-4 max-w-xs mx-auto block">
            Start First Review →
          </button>
        </div>
      )}
    </div>
  );
}
