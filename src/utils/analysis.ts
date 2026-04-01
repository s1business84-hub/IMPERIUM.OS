import type { DailyReview, AnalysisResult, Pillar, Role, Outcome } from '../types';
import { computePillars } from './scoring';

export function generateAnalysis(
  reviews: DailyReview[],
  role: Role | null,
  _outcome: Outcome | null,
): AnalysisResult {
  const pillars = computePillars(reviews);
  const operatingScore = Math.round(pillars.reduce((sum, p) => sum + p.score, 0) / 4);

  const weakest = [...pillars].sort((a, b) => a.score - b.score)[0]!;
  const strongest = [...pillars].sort((a, b) => b.score - a.score)[0]!;

  const recentReviews = reviews.slice(-3);

  const biggestMistake = deriveBiggestMistake(recentReviews, weakest);
  const thinkingPattern = deriveThinkingPattern(recentReviews, role);
  const moneyImpact = deriveMoneyImpact(recentReviews);
  const missedOpportunity = deriveMissedOpportunity(role, strongest);
  const fixForTomorrow = deriveFixForTomorrow(weakest, role);
  const missionSuggestions = [
    `Improve your ${weakest.label} score by 10 points`,
    `Run a 90-minute deep work block`,
    `Log all spending for 24 hours`,
  ];

  return {
    operatingScore,
    pillars,
    biggestMistake,
    thinkingPattern,
    moneyImpact,
    missedOpportunity,
    fixForTomorrow,
    missionSuggestions,
    generatedAt: new Date().toISOString(),
  };
}

function deriveBiggestMistake(reviews: DailyReview[], weakest: Pillar): string {
  const noExecution = reviews.some(
    (r) => r.answers.progress === "Didn't touch it",
  );
  const lowEnergy = reviews.some((r) => r.answers.energy?.includes('Low'));
  const badSleep = reviews.some(
    (r) => r.answers.sleep?.includes('Poor') || r.answers.sleep?.includes('under 5'),
  );

  if (noExecution)
    return "You skipped your priority task at least once this week. That's not a time problem — it's a commitment problem.";
  if (badSleep && lowEnergy)
    return "Poor sleep is compounding into low-energy days. You're running on a deficit and calling it normal.";
  if (weakest.id === 'financial')
    return "Untracked spending is your leak. What you don't measure, you can't control.";
  return `Your ${weakest.label} score (${weakest.score}) is dragging your operating score down. Address this first.`;
}

function deriveThinkingPattern(reviews: DailyReview[], _role: Role | null): string {
  const delayed = reviews.some(
    (r) =>
      r.answers.change?.toLowerCase().includes('decided') ||
      r.answers.change?.toLowerCase().includes('waited'),
  );
  if (delayed)
    return 'You tend to delay decisions under uncertainty. This pattern costs you more time than the wrong decision would.';
  const lowProgress = reviews.filter((r) => r.answers.progress?.includes("Didn't")).length;
  if (lowProgress >= 2)
    return 'Strong starts, weak follow-through. Your gap is in the afternoon execution block.';
  return "Your consistency is building. The next unlock is compressing decision time — bias toward action over analysis.";
}

function deriveMoneyImpact(reviews: DailyReview[]): string {
  const spendAnswers = reviews.flatMap((r) => (r.answers.spend ? [r.answers.spend] : []));
  if (spendAnswers.length === 0)
    return 'No spending data logged this week. Flying blind on your cash.';
  return `You logged spending ${spendAnswers.length} time(s) this week. Pattern: untracked purchases appear on low-energy afternoons.`;
}

function deriveMissedOpportunity(role: Role | null, strongest: Pillar): string {
  if (role === 'founder')
    return `Your ${strongest.label} is your edge right now. You're not leveraging it hard enough on revenue activities.`;
  if (role === 'sales')
    return 'Your best outreach hours (10am–12pm) are being burned on internal tasks. Reverse that.';
  if (role === 'creator')
    return `Your ${strongest.label} is peaking but your distribution cadence is inconsistent. Consistency > quality right now.`;
  return `Your ${strongest.label} is at ${strongest.score} — but you're not using it as a lever. That's an opportunity you're leaving on the table.`;
}

function deriveFixForTomorrow(weakest: Pillar, _role: Role | null): string {
  const fixes: Record<string, string> = {
    execution:
      "Schedule your #1 task for 9am. Block 90 minutes. Do not check your phone until it's done.",
    focus: 'Remove one digital distraction before bed tonight. Tomorrow starts tonight.',
    reasoning:
      'Before making any decision tomorrow, write it down with 3 options. Pick the one that maximises long-term value.',
    financial: 'Open your bank app right now. Find one charge you can eliminate this week.',
  };
  return (
    fixes[weakest.id] ?? 'Run your daily review tomorrow without skipping. Consistency compounds.'
  );
}
