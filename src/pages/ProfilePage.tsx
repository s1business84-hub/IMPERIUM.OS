import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { getLevelFromXP } from '../utils/scoring';
import { useToast } from '../components/ui/Toast';
import type { Role, Outcome } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  student: '📚 Student',
  founder: '🚀 Founder',
  sales: '🎯 Sales',
  creator: '✏️ Creator',
};

const OUTCOME_LABELS: Record<Outcome, string> = {
  stop_wasting_money: '💸 Stop Wasting Money',
  consistent_routine: '⚡ Consistent Routine',
  deep_focus: '🎯 Deep Focus',
  better_decisions: '🧠 Better Decisions',
};

const CURRENCIES = ['$', '£', '€', '₹', '¥', 'A$', 'CAD'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { state, updateState } = useAppState();
  const { showToast, ToastComponent } = useToast();

  const level = getLevelFromXP(state.xp);
  const displayName = state.user?.name ?? (state.isGuest ? 'Guest Operator' : 'Operator');
  const initials = getInitials(displayName);

  const completedMissions = state.missions.filter((m) => m.completed).length;

  const handleExport = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imperium-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  const handleReset = () => {
    if (!window.confirm('Reset all your data? This cannot be undone.')) return;
    localStorage.removeItem('imperium_v2');
    window.location.href = '/';
  };

  const handleLogout = () => {
    updateState({ user: null, isGuest: false, onboarded: false });
    navigate('/auth', { replace: true });
  };

  return (
    <div className="px-4 pt-6 pb-2 flex flex-col gap-5 animate-fade-in">
      {ToastComponent}

      {/* Avatar + info */}
      <div className="flex flex-col items-center gap-3 py-4">
        {/* Avatar ring */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
            border: '2px solid rgba(16,185,129,0.3)',
          }}
        >
          {initials}
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">{displayName}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            {state.role && (
              <span
                className="px-2 py-0.5 rounded-full text-xs text-white/60"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {ROLE_LABELS[state.role]}
              </span>
            )}
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold gradient-text"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              Level {level}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="glass p-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Streak', value: state.streak },
          { label: 'Reviews', value: state.reviews.length },
          { label: 'Missions', value: completedMissions },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-2xl font-bold gradient-text">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="glass p-4 flex flex-col gap-0 divide-y divide-white/8">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
          Settings
        </p>

        {/* Role */}
        <SettingRow
          label="Role"
          value={state.role ? ROLE_LABELS[state.role] : 'Not set'}
          onClick={() => navigate('/onboard')}
        />

        {/* Outcome */}
        <SettingRow
          label="Primary Objective"
          value={state.outcome ? OUTCOME_LABELS[state.outcome] : 'Not set'}
          onClick={() => navigate('/onboard')}
        />

        {/* Currency */}
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-white/70">Currency</span>
          <select
            value={state.currency}
            onChange={(e) => updateState({ currency: e.target.value })}
            className="text-sm text-white/80 bg-transparent border-none outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} style={{ background: '#050a1a' }}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="glass p-4 flex flex-col gap-0 divide-y divide-white/8">
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3">
          Data
        </p>
        <SettingRow label="Export Data" value="JSON download" onClick={handleExport} />
        <SettingRow
          label="Reset Everything"
          value="Permanent — cannot undo"
          onClick={handleReset}
          danger
        />
      </div>

      {/* Pro card */}
      <button
        onClick={() => navigate('/pro')}
        className="p-4 rounded-2xl text-left transition-all active:scale-[0.99]"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.12))',
          border: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold gradient-text">Unlock Full Imperium</p>
            <p className="text-xs text-white/50 mt-0.5">AI analysis · Deep patterns · PDF reports</p>
          </div>
          <span className="text-white/40 text-lg">→</span>
        </div>
      </button>

      {/* Logout */}
      <button onClick={handleLogout} className="btn-ghost">
        {state.isGuest ? 'Sign In' : 'Log Out'}
      </button>

      <p className="text-center text-xs text-white/20 py-2">
        Data stored locally on this device.
      </p>
    </div>
  );
}

function SettingRow({
  label,
  value,
  onClick,
  danger,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between py-3 w-full text-left"
    >
      <span className={`text-sm ${danger ? 'text-red-400' : 'text-white/70'}`}>{label}</span>
      <div className="flex items-center gap-1.5 text-white/35">
        <span className="text-xs">{value}</span>
        <span className="text-xs">›</span>
      </div>
    </button>
  );
}
