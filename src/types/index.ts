export type Role = 'student' | 'founder' | 'sales' | 'creator';
export type Outcome =
  | 'stop_wasting_money'
  | 'consistent_routine'
  | 'deep_focus'
  | 'better_decisions';
export type ReviewPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Pillar {
  id: 'execution' | 'reasoning' | 'focus' | 'financial';
  label: string;
  score: number;
  trend: 'up' | 'down' | 'flat';
  note: string;
}

export interface DailyReview {
  date: string;
  period: ReviewPeriod;
  answers: Record<string, string>;
  timestamp: string;
  score?: number;
  pillars?: Record<string, number>;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  pillar: 'execution' | 'reasoning' | 'focus' | 'financial';
  difficulty: 'easy' | 'medium' | 'hard';
  timeHours: number;
  completed: boolean;
  createdAt: string;
  dueDate: string;
}

export interface AnalysisResult {
  operatingScore: number;
  pillars: Pillar[];
  biggestMistake: string;
  thinkingPattern: string;
  moneyImpact: string;
  missedOpportunity: string;
  fixForTomorrow: string;
  missionSuggestions: string[];
  generatedAt: string;
}

export interface AppState {
  user: { name: string; email: string } | null;
  isGuest: boolean;
  onboarded: boolean;
  role: Role | null;
  outcome: Outcome | null;
  reviews: DailyReview[];
  missions: Mission[];
  analysis: AnalysisResult | null;
  streak: number;
  lastReviewDate: string | null;
  xp: number;
  level: number;
  currency: string;
}
