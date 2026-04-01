import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { label: 'Daily reviews (4/day)', free: true, pro: true },
  { label: 'Operating score', free: true, pro: true },
  { label: 'Pillar tracking', free: true, pro: true },
  { label: 'Mission generation', free: '3/day', pro: 'Unlimited' },
  { label: 'AI analysis engine', free: 'Basic', pro: '✦ Deep' },
  { label: 'Pattern detection', free: false, pro: true },
  { label: 'Weekly intelligence report', free: false, pro: true },
  { label: 'Export reports (PDF)', free: false, pro: true },
  { label: 'Behavioral forecasting', free: false, pro: true },
  { label: 'Priority support', free: false, pro: true },
];

export function ProPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col px-5 py-6" style={{ background: '#050a1a' }}>
      {/* Close */}
      <button
        onClick={() => navigate(-1)}
        className="self-end text-white/40 text-sm mb-4 p-2"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Hero */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#10b981',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          First 100 users · Currently free
        </div>
        <h1 className="text-3xl font-bold text-white leading-tight mb-2">
          Unlock Full{' '}
          <span className="gradient-text">Imperium</span>
        </h1>
        <p className="text-sm text-white/55">AI-powered behavioural intelligence for operators who execute.</p>
      </div>

      {/* Feature comparison */}
      <div className="glass mb-6 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-3 px-4 py-2 border-b border-white/8">
          <span className="text-xs text-white/30">Feature</span>
          <span className="text-xs text-white/30 text-center">Free</span>
          <span className="text-xs font-semibold text-emerald-400 text-center">Pro</span>
        </div>

        {FEATURES.map((f, i) => (
          <div
            key={i}
            className={`grid grid-cols-3 px-4 py-3 ${i < FEATURES.length - 1 ? 'border-b border-white/5' : ''}`}
          >
            <span className="text-xs text-white/65 pr-2">{f.label}</span>
            <span className="text-xs text-white/35 text-center">
              {f.free === true ? '✓' : f.free === false ? '—' : String(f.free)}
            </span>
            <span className="text-xs font-semibold text-emerald-400 text-center">
              {f.pro === true ? '✓' : f.pro === false ? '—' : String(f.pro)}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3">
        <button
          className="btn-primary text-base"
          style={{ padding: '16px 24px' }}
          onClick={() =>
            window.open(
              'mailto:hello@imperiumos.app?subject=Imperium Pro Waitlist',
              '_blank',
            )
          }
        >
          Join Waitlist — Launching Soon →
        </button>
        <p className="text-center text-xs text-white/25">No credit card. No spam.</p>
      </div>
    </div>
  );
}
