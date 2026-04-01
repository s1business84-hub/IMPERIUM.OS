import type { DailyReview, Pillar } from '../types';

export function computeOperatingScore(reviews: DailyReview[]): number {
  if (reviews.length === 0) return 0;
  const recent = reviews.slice(-7);
  const avg = recent.reduce((sum, r) => sum + (r.score ?? 0), 0) / recent.length;
  return Math.round(avg);
}

export function computePillars(reviews: DailyReview[]): Pillar[] {
  const pillars: Pillar[] = [
    { id: 'execution', label: 'Execution', score: 0, trend: 'flat', note: 'No data yet' },
    { id: 'reasoning', label: 'Reasoning', score: 0, trend: 'flat', note: 'No data yet' },
    { id: 'focus', label: 'Focus', score: 0, trend: 'flat', note: 'No data yet' },
    { id: 'financial', label: 'Financial', score: 0, trend: 'flat', note: 'No data yet' },
  ];

  if (reviews.length === 0) return pillars;

  const recent = reviews.slice(-7);

  pillars.forEach((p) => {
    const scores = recent
      .map((r) => r.pillars?.[p.id] ?? 0)
      .filter((s) => s > 0);
    if (scores.length > 0) {
      p.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const mid = Math.floor(scores.length / 2);
      const older = scores.slice(0, mid);
      const newer = scores.slice(mid);
      const oldAvg = older.length ? older.reduce((a, b) => a + b, 0) / older.length : 0;
      const newAvg = newer.length ? newer.reduce((a, b) => a + b, 0) / newer.length : 0;
      p.trend = newAvg > oldAvg + 5 ? 'up' : newAvg < oldAvg - 5 ? 'down' : 'flat';
      p.note =
        p.score >= 70
          ? 'On track'
          : p.score >= 50
            ? 'Needs attention'
            : 'Critical — address first';
    }
  });

  return pillars;
}

export function scoreReview(
  answers: Record<string, string>,
  period: string,
): { score: number; pillars: Record<string, number> } {
  let score = 60;
  const pillars: Record<string, number> = {
    execution: 60,
    reasoning: 60,
    focus: 60,
    financial: 60,
  };

  if (period === 'morning') {
    const energy = answers.energy ?? '';
    const sleep = answers.sleep ?? '';
    if (sleep.includes('7+') || sleep.includes('Solid')) {
      score += 10;
      pillars.execution += 10;
      pillars.focus += 10;
    }
    if (sleep.includes('Poor') || sleep.includes('under 5')) {
      score -= 10;
      pillars.execution -= 10;
      pillars.focus -= 15;
    }
    if (energy.includes('High') || energy.includes("let's go")) {
      score += 10;
      pillars.execution += 10;
    }
    if (energy.includes('Low')) {
      score -= 5;
      pillars.focus -= 10;
    }
  }

  if (period === 'afternoon') {
    const progress = answers.progress ?? '';
    if (progress.includes("Yes") || progress.includes("done")) {
      score += 15;
      pillars.execution += 20;
      pillars.focus += 15;
    }
    if (progress.includes('Partial')) {
      score += 5;
      pillars.execution += 5;
    }
    if (progress.includes("Didn't") || progress.includes("No")) {
      score -= 10;
      pillars.execution -= 15;
      pillars.focus -= 10;
    }
    if (answers.spend && answers.spend.trim() !== '') {
      pillars.financial += 10;
    }
  }

  if (period === 'evening') {
    const rating = answers.rating ?? '';
    if (rating.includes('Exceptional')) {
      score += 15;
      pillars.execution += 10;
    }
    if (rating.includes('Solid')) {
      score += 8;
      pillars.execution += 5;
    }
    if (rating.includes('Average')) {
      score -= 3;
    }
    if (rating.includes('Below')) {
      score -= 10;
      pillars.execution -= 8;
    }
    if (answers.idea && answers.idea.trim() !== '') {
      pillars.reasoning += 8;
    }
  }

  if (period === 'night') {
    score += 5;
    pillars.reasoning += 10;
    const screen = answers.screen ?? '';
    if (screen.includes('Under control')) {
      pillars.focus += 10;
    }
    if (screen.includes('Way too')) {
      pillars.focus -= 15;
      score -= 5;
    }
  }

  Object.keys(pillars).forEach((k) => {
    pillars[k] = Math.max(0, Math.min(100, pillars[k]!));
  });
  score = Math.max(0, Math.min(100, score));

  return { score, pillars };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeStreak(reviews: DailyReview[], lastReviewDate: string | null): number {
  if (!lastReviewDate) return 0;
  const today = new Date().toISOString().split('T')[0]!;
  const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().split('T')[0]!;
  if (lastReviewDate !== today && lastReviewDate !== yesterday) return 0;

  const dates = [...new Set(reviews.map((r) => r.date))].sort().reverse();
  let streak = 0;
  let current = new Date(today);

  for (const date of dates) {
    const d = current.toISOString().split('T')[0]!;
    if (date === d) {
      streak++;
      current = new Date(current.getTime() - MS_PER_DAY);
    } else {
      break;
    }
  }
  return streak;
}

export function getLevelFromXP(xp: number): number {
  const thresholds = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= (thresholds[i] ?? 0)) return i + 1;
  }
  return 1;
}
