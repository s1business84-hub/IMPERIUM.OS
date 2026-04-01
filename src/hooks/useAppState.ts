import { useLocalStorage } from './useLocalStorage';
import type { AppState } from '../types';

const INITIAL_STATE: AppState = {
  user: null,
  isGuest: false,
  onboarded: false,
  role: null,
  outcome: null,
  reviews: [],
  missions: [],
  analysis: null,
  streak: 0,
  lastReviewDate: null,
  xp: 0,
  level: 1,
  currency: '$',
};

export function useAppState() {
  const [state, setState] = useLocalStorage<AppState>('imperium_v2', INITIAL_STATE);

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  return { state, updateState };
}
