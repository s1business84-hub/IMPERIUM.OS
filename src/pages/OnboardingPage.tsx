import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import type { Role, Outcome } from '../types';

interface RoleOption {
  id: Role;
  emoji: string;
  title: string;
  subtitle: string;
}

interface OutcomeOption {
  id: Outcome;
  emoji: string;
  title: string;
  subtitle: string;
}

const ROLES: RoleOption[] = [
  { id: 'student', emoji: '📚', title: 'Student', subtitle: 'Exams, projects, self-improvement' },
  { id: 'founder', emoji: '🚀', title: 'Founder', subtitle: 'Building, deciding, shipping' },
  { id: 'sales', emoji: '🎯', title: 'Sales', subtitle: 'Pipeline, outreach, closing' },
  { id: 'creator', emoji: '✏️', title: 'Creator', subtitle: 'Content, audience, consistency' },
];

const OUTCOMES: OutcomeOption[] = [
  { id: 'stop_wasting_money', emoji: '💸', title: 'Stop Wasting Money', subtitle: 'Track every dollar' },
  { id: 'consistent_routine', emoji: '⚡', title: 'Consistent Routine', subtitle: 'Daily discipline' },
  { id: 'deep_focus', emoji: '🎯', title: 'Deep Focus', subtitle: 'Block distraction' },
  { id: 'better_decisions', emoji: '🧠', title: 'Better Decisions', subtitle: 'Think sharper' },
];

function SelectionPill<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { id: T; emoji: string; title: string; subtitle: string }[];
  selected: T | null;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 ${
            selected === opt.id
              ? 'gradient-border'
              : ''
          }`}
          style={
            selected === opt.id
              ? undefined
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          <span className="text-2xl">{opt.emoji}</span>
          <div>
            <p
              className={`text-sm font-semibold ${selected === opt.id ? 'gradient-text' : 'text-white/80'}`}
            >
              {opt.title}
            </p>
            <p className="text-xs text-white/40 mt-0.5">{opt.subtitle}</p>
          </div>
          {selected === opt.id && (
            <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { state, updateState } = useAppState();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(state.role);
  const [outcome, setOutcome] = useState<Outcome | null>(state.outcome);

  const handleStep1 = () => {
    if (!role) return;
    setStep(2);
  };

  const handleActivate = () => {
    if (!outcome) return;
    updateState({ role, outcome, onboarded: true });
    navigate('/home', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col px-5 py-8" style={{ background: '#050a1a' }}>
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`rounded-full transition-all duration-300 ${
              s === step ? 'w-6 h-2' : 'w-2 h-2'
            }`}
            style={{
              background:
                s === step
                  ? 'linear-gradient(90deg, #10b981, #3b82f6)'
                  : s < step
                    ? 'rgba(16,185,129,0.4)'
                    : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              What's your operating context?
            </h2>
            <p className="text-sm text-white/50 mt-2">
              Imperium calibrates everything to your role.
            </p>
          </div>
          <SelectionPill options={ROLES} selected={role} onSelect={setRole} />
          <button
            onClick={handleStep1}
            disabled={!role}
            className="btn-primary disabled:opacity-40 mt-2"
          >
            Continue →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-white/40 mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-white leading-tight">
              What's your primary objective?
            </h2>
            <p className="text-sm text-white/50 mt-2">Your answer shapes your daily directive.</p>
          </div>
          <SelectionPill options={OUTCOMES} selected={outcome} onSelect={setOutcome} />
          <button
            onClick={handleActivate}
            disabled={!outcome}
            className="btn-primary disabled:opacity-40 mt-2"
          >
            Activate Imperium →
          </button>
        </div>
      )}
    </div>
  );
}
