import type { Mission } from '../../types';

interface MissionCardProps {
  mission: Mission;
  onToggle?: (id: string) => void;
}

const DIFFICULTY_COLOR = {
  easy: 'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  hard: 'text-red-400 bg-red-400/10',
} as const;

const PILLAR_COLOR = {
  execution: 'text-blue-400 bg-blue-400/10',
  reasoning: 'text-purple-400 bg-purple-400/10',
  focus: 'text-emerald-400 bg-emerald-400/10',
  financial: 'text-amber-400 bg-amber-400/10',
} as const;

export function MissionCard({ mission, onToggle }: MissionCardProps) {
  return (
    <div
      className={`glass p-4 transition-opacity duration-300 ${mission.completed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle?.(mission.id)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all duration-200 flex items-center justify-center ${
            mission.completed
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-white/30 hover:border-emerald-400'
          }`}
          aria-label={mission.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {mission.completed && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${PILLAR_COLOR[mission.pillar]}`}
            >
              {mission.pillar}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[mission.difficulty]}`}
            >
              {mission.difficulty}
            </span>
            {mission.timeHours > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full text-white/40 bg-white/5">
                {mission.timeHours}h
              </span>
            )}
          </div>
          <p
            className={`text-sm font-semibold leading-snug ${mission.completed ? 'line-through text-white/40' : 'text-white/90'}`}
          >
            {mission.title}
          </p>
          {!mission.completed && (
            <p className="text-xs text-white/45 mt-1 leading-relaxed">{mission.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
