import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../components/ui/Toast';

type Tab = 'login' | 'signup';

interface StoredUser {
  name: string;
  email: string;
  passwordHash: string;
}

async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem('imperium_users') ?? '[]') as StoredUser[];
  } catch {
    return [];
  }
}

function saveUser(user: StoredUser) {
  const users = getStoredUsers();
  users.push(user);
  localStorage.setItem('imperium_users', JSON.stringify(users));
}

export function AuthPage() {
  const navigate = useNavigate();
  const { updateState } = useAppState();
  const { showToast, ToastComponent } = useToast();

  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showToast('Fill in all fields', 'error'); return; }
    setLoading(true);
    const hash = await hashPassword(password);
    setTimeout(() => {
      const users = getStoredUsers();
      const user = users.find((u) => u.email === email && u.passwordHash === hash);
      if (!user) { showToast('Invalid email or password', 'error'); setLoading(false); return; }
      updateState({ user: { name: user.name, email: user.email }, isGuest: false });
      navigate('/home', { replace: true });
    }, 600);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { showToast('Fill in all fields', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    const users = getStoredUsers();
    if (users.find((u) => u.email === email)) { showToast('Email already registered — log in', 'error'); return; }
    setLoading(true);
    const hash = await hashPassword(password);
    setTimeout(() => {
      saveUser({ name, email, passwordHash: hash });
      updateState({ user: { name, email }, isGuest: false });
      navigate('/onboard', { replace: true });
    }, 600);
  };

  const handleGuest = () => {
    updateState({ isGuest: true, user: null });
    navigate('/onboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col px-5 py-8" style={{ background: '#050a1a' }}>
      {ToastComponent}

      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Logo */}
      <div className="flex flex-col items-center pt-8 pb-6 animate-fade-in">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L20 7V17L12 22L4 17V7Z"
              stroke="url(#authGrad)"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M12 7L16 9.5V14.5L12 17L8 14.5V9.5Z" fill="url(#authGrad)" fillOpacity="0.4" />
            <defs>
              <linearGradient id="authGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-xl font-bold gradient-text">ImperiumOS</h1>
        <p className="text-sm text-white/50 mt-1">Your daily operating system.</p>
        <span
          className="mt-3 px-3 py-1 rounded-full text-xs text-white/60"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          3 questions · 4 check-ins · AI handles the rest
        </span>
      </div>

      {/* Tab switcher */}
      <div
        className="flex rounded-xl p-1 mb-5"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {(['login', 'signup'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t
                ? 'text-white'
                : 'text-white/40'
            }`}
            style={
              tab === t
                ? { background: 'linear-gradient(135deg, #10b981, #3b82f6)' }
                : undefined
            }
          >
            {t === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={tab === 'login' ? handleLogin : handleSignup}
        className="flex flex-col gap-3 animate-fade-in"
      >
        {tab === 'signup' && (
          <div>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-emerald-500/50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-emerald-500/50"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-emerald-500/50"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-1 disabled:opacity-60"
        >
          {loading ? 'Loading…' : tab === 'login' ? 'Log In →' : 'Create Account →'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-white/30">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button onClick={handleGuest} className="btn-ghost">
        Enter as Guest →
      </button>

      <p className="text-center text-xs text-white/25 mt-6 leading-relaxed">
        Private by design. Your data stays on your device.
      </p>
    </div>
  );
}
