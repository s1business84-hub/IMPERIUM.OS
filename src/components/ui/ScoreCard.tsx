interface ScoreCardProps {
  score: number;
  label?: string;
  subtitle?: string;
  size?: 'sm' | 'lg';
}

function gradeText(score: number): string {
  if (score === 0) return 'System cold. Activate with first review.';
  if (score >= 85) return 'Elite operator. Compounding daily.';
  if (score >= 70) return 'Above baseline. Keep the momentum.';
  if (score >= 55) return 'Functional. Room to sharpen.';
  if (score >= 40) return 'Degraded performance. Attention needed.';
  return 'Critical. Immediate recalibration required.';
}

function scoreGradient(score: number): string {
  if (score === 0) return 'from-white/10 to-white/5';
  if (score >= 70) return 'from-emerald-500 to-blue-500';
  if (score >= 40) return 'from-amber-500 to-orange-500';
  return 'from-red-500 to-orange-600';
}

export function ScoreCard({ score, label = 'Operating Score', subtitle, size = 'lg' }: ScoreCardProps) {
  const isEmpty = score === 0;

  return (
    <div className="gradient-border rounded-2xl p-5">
      <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-3">{label}</p>

      <div className="flex items-end gap-3 mb-3">
        <span
          className={`font-bold leading-none ${
            size === 'lg' ? 'text-6xl' : 'text-4xl'
          } ${isEmpty ? 'text-white/20' : 'gradient-text'}`}
        >
          {isEmpty ? '—' : score}
        </span>
        {!isEmpty && <span className="text-white/40 text-sm mb-2">/100</span>}
      </div>

      {/* Bar */}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${scoreGradient(score)} transition-all duration-1000`}
          style={{ width: isEmpty ? '2%' : `${score}%` }}
        />
      </div>

      <p className="text-sm text-white/55 leading-snug">
        {subtitle ?? gradeText(score)}
      </p>
    </div>
  );
}
