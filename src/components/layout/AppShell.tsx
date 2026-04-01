import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

const PAGES_WITH_NAV = ['/home', '/review', '/missions', '/progress', '/profile', '/analysis'];

export function AppShell() {
  const location = useLocation();
  const showNav = PAGES_WITH_NAV.some((p) => location.pathname.startsWith(p));

  return (
    <div className="flex justify-center min-h-screen" style={{ background: '#050a1a' }}>
      <div
        className="relative w-full max-w-[480px] min-h-screen flex flex-col"
        style={{ background: '#050a1a' }}
      >
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: showNav ? '72px' : 0 }}
        >
          <Outlet />
        </main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
