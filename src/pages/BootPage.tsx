import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';

export function BootPage() {
  const navigate = useNavigate();
  const { state } = useAppState();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.user || state.isGuest) {
        if (state.onboarded) {
          navigate('/home', { replace: true });
        } else {
          navigate('/onboard', { replace: true });
        }
      } else {
        navigate('/auth', { replace: true });
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigate, state]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#050a1a' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        {/* Orb */}
        <div className="relative w-20 h-20 animate-glow-pulse">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              opacity: 0.15,
              filter: 'blur(16px)',
            }}
          />
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <svg
              className="w-9 h-9"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 4 L30 11 L30 25 L18 32 L6 25 L6 11 Z"
                stroke="url(#bootGrad)"
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
              />
              <path
                d="M18 10 L24 14 L24 22 L18 26 L12 22 L12 14 Z"
                fill="url(#bootGrad)"
                fillOpacity="0.3"
              />
              <defs>
                <linearGradient id="bootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Brand */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-[0.25em] uppercase gradient-text"
            style={{ letterSpacing: '0.3em' }}
          >
            IMPERIUM
          </h1>
          <p className="text-xs tracking-[0.4em] text-white/30 mt-1 uppercase">Operating System</p>
        </div>

        {/* Loading bar */}
        <div className="w-48 mt-2">
          <div className="h-px bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full animate-boot-bar rounded-full"
              style={{ background: 'linear-gradient(90deg, #10b981, #3b82f6)' }}
            />
          </div>
          <p className="text-center text-xs tracking-[0.3em] text-white/25 mt-3 uppercase animate-boot-pulse">
            Initialising
          </p>
        </div>
      </div>
    </div>
  );
}
