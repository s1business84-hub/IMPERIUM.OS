import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { generateAnalysis } from '../utils/analysis';
import { InsightCard } from '../components/ui/InsightCard';

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <p className="text-4xl font-bold gradient-text">{score > 0 ? score : '—'}</p>
        <p className="text-xs text-white/40 mt-0.5">/ 100</p>
      </div>
    </div>
  );
}

export function AnalysisPage() {
  const navigate = useNavigate();
  const { state } = useAppState();

  const analysis = useMemo(() => {
    if (state.reviews.length === 0) return null;
    return generateAnalysis(state.reviews, state.role, state.outcome);
  }, [state.reviews, state.role, state.outcome]);

  if (!analysis) {
    return (
      <div className="px-4 pt-6 pb-2 flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Intelligence Report</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-4xl">🧠</div>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Complete your first review to generate your intelligence report.
          </p>
          <button onClick={() => navigate('/review')} className="btn-primary mt-2">
            Start Your First Review →
          </button>
        </div>
      </div>
    );
  }

  const sortedDate = new Date(analysis.generatedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="px-4 pt-6 pb-2 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Intelligence Report</h1>
          <p className="text-xs text-white/40 mt-0.5">{sortedDate}</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          {state.reviews.length} reviews
        </span>
      </div>

      {/* Score ring */}
      <div className="glass py-6">
        <ScoreRing score={analysis.operatingScore} />
        <p className="text-center text-xs text-white/40 mt-3">Operating Score</p>
      </div>

      {/* Pillar bars */}
      <div className="glass p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30">
          Pillar Breakdown
        </p>
        {analysis.pillars.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/60">{p.label}</span>
              <span className="font-semibold text-white/80">{p.score > 0 ? p.score : '—'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${p.score}%`,
                  background:
                    p.score >= 70
                      ? 'linear-gradient(90deg, #10b981, #3b82f6)'
                      : p.score >= 40
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Insight cards */}
      <InsightCard
        label="Biggest Mistake"
        value={analysis.biggestMistake}
        borderColor="border-red-500/40"
        icon="⚠️"
      />
      <InsightCard
        label="Thinking Pattern"
        value={analysis.thinkingPattern}
        borderColor="border-blue-500/40"
        icon="🧠"
      />
      <InsightCard
        label="Money Impact"
        value={analysis.moneyImpact}
        borderColor="border-amber-500/40"
        icon="💸"
      />
      <InsightCard
        label="Missed Opportunity"
        value={analysis.missedOpportunity}
        borderColor="border-purple-500/40"
        icon="🎯"
      />

      {/* Fix for tomorrow — prominent */}
      <div
        className="p-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.07))',
          border: '1px solid rgba(16,185,129,0.25)',
        }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400/70 mb-2">
          Fix for Tomorrow
        </p>
        <p className="text-sm text-white/85 leading-relaxed">{analysis.fixForTomorrow}</p>
      </div>

      {/* Mission suggestions */}
      <div className="glass p-4 flex flex-col gap-2 pb-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-1">
          Suggested Actions
        </p>
        {analysis.missionSuggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-emerald-400 text-sm mt-0.5">→</span>
            <p className="text-sm text-white/65 leading-snug">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
