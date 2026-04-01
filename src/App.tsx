import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { BootPage } from './pages/BootPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { ReviewPage } from './pages/ReviewPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { MissionsPage } from './pages/MissionsPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProPage } from './pages/ProPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Boot */}
        <Route path="/" element={<BootPage />} />

        {/* Auth + onboarding (no shell) */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboard" element={<OnboardingPage />} />
        <Route path="/pro" element={<ProPage />} />

        {/* Main app (with shell + nav) */}
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
