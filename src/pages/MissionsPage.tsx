import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { computePillars } from '../utils/scoring';
import { generateMissions } from '../utils/missions';
import { MissionCard } from '../components/ui/MissionCard';

export function MissionsPage() {
  const navigate = useNavigate();
  const { state, updateState } = useAppState();

  const today = new Date().toISOString().split('T')[0]!;

  const activeMissions = state.missions.filter((m) => !m.completed && m.dueDate >= today);
  const completedToday = state.missions.filter((m) => m.completed && m.dueDate === today);

  const handleToggle = (id: string) => {
    const updated = state.missions.map((m) =>
      m.id === id ? { ...m, completed: !m.completed } : m,
    );
    const wasCompleted = state.missions.find((m) => m.id === id)?.completed ?? false;
    updateState({
      missions: updated,
      xp: wasCompleted ? state.xp - 50 : state.xp + 50,
    });
  };

  const handleGenerate = () => {
    if (state.reviews.length === 0) return;
    const pillars = computePillars(state.reviews);
    const newMissions = generateMissions(pillars, state.role, state.outcome, today);
    // Avoid duplicates by checking titles
    const existingTitles = new Set(state.missions.map((m) => m.title));
    const fresh = newMissions.filter((m) => !existingTitles.has(m.title));
    if (fresh.length > 0) {
      updateState({ missions: [...state.missions, ...fresh] });
    }
  };

  const pendingCount = useMemo(
    () => state.missions.filter((m) => !m.completed).length,
    [state.missions],
  );

  return (
    <div className="px-4 pt-6 pb-2 flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Active Missions</h1>
          <p className="text-xs text-white/40 mt-0.5">{pendingCount} pending</p>
        </div>
        {state.reviews.length > 0 && (
          <button
            onClick={handleGenerate}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 transition-colors"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            + Generate
          </button>
        )}
      </div>

      {/* Active missions */}
      {activeMissions.length === 0 && completedToday.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-4xl">⚡</div>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            {state.reviews.length === 0
              ? 'Complete a review to generate your first missions.'
              : 'All missions complete. Generate new ones or run a review.'}
          </p>
          <button onClick={() => navigate('/review')} className="btn-primary mt-2 max-w-xs">
            Start a Review →
          </button>
        </div>
      ) : (
        <>
          {activeMissions.length > 0 && (
            <div className="flex flex-col gap-3">
              {activeMissions.map((m) => (
                <MissionCard key={m.id} mission={m} onToggle={handleToggle} />
              ))}
            </div>
          )}

          {completedToday.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase text-white/25 mt-2">
                Completed Today
              </p>
              <div className="flex flex-col gap-3">
                {completedToday.map((m) => (
                  <MissionCard key={m.id} mission={m} onToggle={handleToggle} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Generate CTA at bottom if there are missions */}
      {state.reviews.length > 0 && (activeMissions.length > 0 || completedToday.length > 0) && (
        <button onClick={handleGenerate} className="btn-ghost mt-2">
          Generate New Missions
        </button>
      )}
    </div>
  );
}
