import type { Pillar } from '../../types';

interface PillarCardProps {
  pillar: Pillar;
  className?: string;
}

const TREND_ICON = { up: '↑', down: '↓', flat: '→' } as const;
const TREND_COLOR = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  flat: 'text-blue-400',
} as const;

function scoreColor(score: number): string {
  if (score === 0) return 'text-white/30';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function barColor(score: number): string {
  if (score === 0) return 'bg-white/10';
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function PillarCard({ pillar, className = '' }: PillarCardProps) {
  const isEmpty = pillar.score === 0;

  return (
    <div className={`glass p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase text-white/40">
          {pillar.label}
        </span>
        {!isEmpty && (
          <span className={`text-xs font-bold ${TREND_COLOR[pillar.trend]}`}>
            {TREND_ICON[pillar.trend]}
          </span>
        )}
      </div>

      <div className={`text-2xl font-bold ${scoreColor(pillar.score)}`}>
        {isEmpty ? '—' : pillar.score}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor(pillar.score)}`}
          style={{ width: isEmpty ? '0%' : `${pillar.score}%` }}
        />
      </div>

      <p className="text-xs text-white/40 leading-tight">
        {isEmpty ? 'System cold' : pillar.note}
      </p>
    </div>
  );
}
