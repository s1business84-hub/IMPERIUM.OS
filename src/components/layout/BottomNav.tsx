import { useLocation, useNavigate } from 'react-router-dom';

interface Tab {
  path: string;
  label: string;
  icon: React.ReactNode;
}

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function MissionsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs: Tab[] = [
    { path: '/home', label: 'Home', icon: <HomeIcon /> },
    { path: '/review', label: 'Review', icon: <ReviewIcon /> },
    { path: '/missions', label: 'Missions', icon: <MissionsIcon /> },
    { path: '/progress', label: 'Progress', icon: <ProgressIcon /> },
    { path: '/profile', label: 'Profile', icon: <ProfileIcon /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="w-full max-w-[480px] pointer-events-auto">
        <div
          className="flex items-stretch"
          style={{
            background: 'rgba(5,10,26,0.92)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 ${
                  active ? 'text-emerald-400' : 'text-white/30 active:text-white/60'
                }`}
              >
                {tab.icon}
                <span
                  className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                    active ? 'text-emerald-400' : 'text-white/30'
                  }`}
                >
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
