import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { scoreReview, computeStreak, getLevelFromXP } from '../utils/scoring';
import { generateMissions } from '../utils/missions';
import { computePillars } from '../utils/scoring';
import type { ReviewPeriod, DailyReview } from '../types';

function getCurrentPeriod(): ReviewPeriod {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

interface Question {
  key: string;
  text: string;
  type: 'options' | 'text';
  options?: string[];
  placeholder?: string;
}

const QUESTIONS: Record<ReviewPeriod, Question[]> = {
  morning: [
    {
      key: 'priority',
      text: "What's your #1 priority today?",
      type: 'text',
      placeholder: 'The one thing that must happen…',
    },
    {
      key: 'sleep',
      text: 'How did you sleep?',
      type: 'options',
      options: ['Solid 7+ hours', 'OK, 5-6 hours', 'Poor, under 5 hours'],
    },
    {
      key: 'energy',
      text: 'Your energy right now?',
      type: 'options',
      options: ["High — let's go", 'Medium — manageable', 'Low — need warmup'],
    },
  ],
  afternoon: [
    {
      key: 'progress',
      text: 'Did you execute on your priority?',
      type: 'options',
      options: ["Yes, it's done", 'Partially done', "Didn't touch it"],
    },
    {
      key: 'distraction',
      text: 'What pulled your attention?',
      type: 'text',
      placeholder: 'Social media, meetings, people…',
    },
    {
      key: 'spend',
      text: 'Any money spent today?',
      type: 'text',
      placeholder: '$0 or amount + what on…',
    },
  ],
  evening: [
    {
      key: 'accomplished',
      text: 'What did you actually accomplish?',
      type: 'text',
      placeholder: 'Be specific, not vague…',
    },
    {
      key: 'idea',
      text: 'One idea worth keeping?',
      type: 'text',
      placeholder: 'Insight, observation, or leave blank…',
    },
    {
      key: 'rating',
      text: 'Rate this day',
      type: 'options',
      options: ['🔥 Exceptional', '✅ Solid', '😐 Average', '📉 Below par'],
    },
  ],
  night: [
    {
      key: 'change',
      text: 'What would you do differently?',
      type: 'text',
      placeholder: 'One honest answer…',
    },
    {
      key: 'screen',
      text: 'Screen time today?',
      type: 'options',
      options: ['Under control', 'Too much', 'Way too much'],
    },
    {
      key: 'intention',
      text: "Tomorrow's #1 intention?",
      type: 'text',
      placeholder: 'What you will execute on…',
    },
  ],
};

export function ReviewPage() {
  const navigate = useNavigate();
  const { state, updateState } = useAppState();

  const period = getCurrentPeriod();
  const questions = QUESTIONS[period];
  const today = new Date().toISOString().split('T')[0]!;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textInput, setTextInput] = useState('');
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState<{ score: number; pillars: Record<string, number> } | null>(null);

  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;

  const saveAnswer = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      const newAnswers = { ...answers, [currentQuestion.key]: value };
      setAnswers(newAnswers);

      if (isLastStep) {
        const scored = scoreReview(newAnswers, period);
        setResult(scored);

        const review: DailyReview = {
          date: today,
          period,
          answers: newAnswers,
          timestamp: new Date().toISOString(),
          score: scored.score,
          pillars: scored.pillars,
        };

        const updatedReviews = [...state.reviews, review];
        const newXP = state.xp + 25;
        const newStreak = computeStreak(updatedReviews, today);
        const newLevel = getLevelFromXP(newXP);

        // Generate missions from weak pillars
        const pillars = computePillars(updatedReviews);
        const existingMissionIds = new Set(state.missions.map((m) => m.id));
        const newMissions = generateMissions(pillars, state.role, state.outcome, today).filter(
          (m) => !existingMissionIds.has(m.id),
        );

        updateState({
          reviews: updatedReviews,
          xp: newXP,
          level: newLevel,
          streak: newStreak,
          lastReviewDate: today,
          missions: [...state.missions, ...newMissions],
        });
        setComplete(true);
      } else {
        setStep((s) => s + 1);
        setTextInput('');
      }
    },
    [currentQuestion, answers, isLastStep, period, today, state, updateState],
  );

  const handleNext = () => {
    if (!currentQuestion) return;
    if (currentQuestion.type === 'text') {
      saveAnswer(textInput);
    }
  };

  const handleSkip = () => {
    if (!currentQuestion) return;
    saveAnswer('');
    if (!isLastStep) {
      setStep((s) => s + 1);
      setTextInput('');
    }
  };

  if (complete && result) {
    const topPillars = Object.entries(result.pillars)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8 animate-fade-in">
        {/* Checkmark */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
            border: '2px solid rgba(16,185,129,0.4)',
          }}
        >
          <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
            <path
              d="M10 20l7 7 13-14"
              stroke="url(#checkGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              strokeDashoffset="0"
            />
            <defs>
              <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Review Complete</h2>
        <p className="text-sm text-white/50 mb-6">{period} check-in logged</p>

        {/* Score */}
        <div className="gradient-border rounded-2xl px-10 py-5 text-center mb-5">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Score</p>
          <p className="text-5xl font-bold gradient-text">{result.score}</p>
        </div>

        {/* Pillar tags */}
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          {topPillars.map(([pillar, score]) => (
            <span
              key={pillar}
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
            >
              {pillar} {score}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate('/analysis')}
            className="btn-primary"
          >
            See Analysis →
          </button>
          <button
            onClick={() => navigate('/home')}
            className="btn-ghost"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col px-5 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/home')} className="text-white/40 text-sm">
          ✕
        </button>
        <span className="text-xs text-white/40 uppercase tracking-widest">
          {period} review
        </span>
        <span className="text-xs text-white/40">
          {step + 1}/{questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-8">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((step + 1) / questions.length) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #3b82f6)',
          }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-white leading-tight mb-8 animate-fade-in">
          {currentQuestion.text}
        </h2>

        {currentQuestion.type === 'options' && (
          <div className="flex flex-col gap-3 animate-fade-in">
            {currentQuestion.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => saveAnswer(opt)}
                className="text-left px-5 py-4 rounded-2xl text-sm font-medium text-white/80 transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'text' && (
          <div className="animate-fade-in">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={3}
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              autoFocus
            />
            <button
              onClick={handleNext}
              className="btn-primary mt-4"
            >
              {isLastStep ? 'Complete Review →' : 'Next →'}
            </button>
          </div>
        )}
      </div>

      {/* Skip */}
      <button onClick={handleSkip} className="text-center text-xs text-white/25 py-4 mt-4">
        skip
      </button>
    </div>
  );
}
