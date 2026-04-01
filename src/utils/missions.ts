import type { Mission, Role, Outcome, Pillar } from '../types';

export function generateMissions(
  pillars: Pillar[],
  role: Role | null,
  outcome: Outcome | null,
  date: string,
): Mission[] {
  const weakPillars = [...pillars].sort((a, b) => a.score - b.score).slice(0, 2);
  const missions: Mission[] = [];
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString().split('T')[0]!;

  weakPillars.forEach((pillar, i) => {
    const mission = getMissionForPillar(pillar.id, role, outcome, i, dueDate);
    if (mission) missions.push(mission);
  });

  // Always include at least one mission
  if (missions.length === 0) {
    const mission = getMissionForPillar('execution', role, outcome, 0, dueDate);
    if (mission) missions.push(mission);
  }

  return missions;
}

function getMissionForPillar(
  pillarId: string,
  role: Role | null,
  _outcome: Outcome | null,
  index: number,
  dueDate: string,
): Mission | null {
  const id = `${pillarId}-${Date.now()}-${index}`;
  const base = MISSION_TEMPLATES[pillarId as keyof typeof MISSION_TEMPLATES];
  if (!base) return null;

  const roleKey = role ?? 'default';
  const template =
    (base as Record<string, MissionTemplate>)[roleKey] ??
    (base as Record<string, MissionTemplate>)['default'];
  if (!template) return null;

  return {
    id,
    title: template.title,
    description: template.description,
    pillar: pillarId as Mission['pillar'],
    difficulty: template.difficulty,
    timeHours: template.timeHours,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate,
  };
}

interface MissionTemplate {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeHours: number;
}

const MISSION_TEMPLATES = {
  execution: {
    default: {
      title: 'Block 90 minutes of deep work',
      description: 'Close all tabs except one task. No phone. No interruptions. Ship something.',
      difficulty: 'medium' as const,
      timeHours: 1.5,
    },
    student: {
      title: 'Complete your #1 study task',
      description: "One topic, one session, full focus. No scrolling until it's done.",
      difficulty: 'medium' as const,
      timeHours: 1.5,
    },
    founder: {
      title: 'Ship one product decision today',
      description: "Pick the one decision you've been delaying. Make the call. Document it.",
      difficulty: 'medium' as const,
      timeHours: 1,
    },
    sales: {
      title: 'Make 5 outreach attempts before noon',
      description: 'Cold calls, emails, or DMs. 5 attempts. Log each one.',
      difficulty: 'medium' as const,
      timeHours: 2,
    },
    creator: {
      title: 'Publish one piece of content',
      description: 'Write, record, or post. Distribution beats perfection.',
      difficulty: 'medium' as const,
      timeHours: 2,
    },
  },
  focus: {
    default: {
      title: 'Single-task for 2 hours',
      description: 'One browser tab. One task. Phone face-down. No task-switching.',
      difficulty: 'hard' as const,
      timeHours: 2,
    },
    student: {
      title: 'Study without your phone for 90 minutes',
      description: 'Phone in another room. 90-minute Pomodoro. No exceptions.',
      difficulty: 'hard' as const,
      timeHours: 1.5,
    },
    founder: {
      title: 'Eliminate one recurring distraction today',
      description: 'Identify what pulls your attention. Block it. Measure the difference.',
      difficulty: 'easy' as const,
      timeHours: 0.5,
    },
    sales: {
      title: 'No social media until after 3pm',
      description: 'Revenue activities first. Entertainment after results.',
      difficulty: 'medium' as const,
      timeHours: 0,
    },
    creator: {
      title: 'Create before you consume today',
      description: "No YouTube, no feeds, no podcasts until you've produced something.",
      difficulty: 'medium' as const,
      timeHours: 0,
    },
  },
  reasoning: {
    default: {
      title: 'Write a 10-minute decision log',
      description:
        "Write down the biggest decision you're facing. List 3 options and their trade-offs.",
      difficulty: 'easy' as const,
      timeHours: 0.2,
    },
    founder: {
      title: 'Run a pre-mortem on your biggest bet',
      description: 'Assume it fails. What broke it? Fix that now.',
      difficulty: 'medium' as const,
      timeHours: 0.5,
    },
    student: {
      title: 'Challenge one assumption today',
      description: 'Find one thing you believe without evidence. Test it.',
      difficulty: 'medium' as const,
      timeHours: 0.5,
    },
    sales: {
      title: 'Analyse your last 3 lost deals',
      description: 'One pattern. One fix. Write it down before noon.',
      difficulty: 'medium' as const,
      timeHours: 0.5,
    },
    creator: {
      title: 'Map your content feedback loop',
      description: "What posts performed? What flopped? Find the pattern — don't guess.",
      difficulty: 'easy' as const,
      timeHours: 0.3,
    },
  },
  financial: {
    default: {
      title: 'Audit one subscription today',
      description:
        'Pull up your bank app. Find one charge you forgot about. Cancel or justify it.',
      difficulty: 'easy' as const,
      timeHours: 0.2,
    },
    founder: {
      title: 'Calculate your cash runway',
      description: 'Know your burn rate. Know how many months you have. Write it down.',
      difficulty: 'medium' as const,
      timeHours: 0.5,
    },
    sales: {
      title: 'Track every dollar spent today',
      description: "Log it in real-time. Not end of day — real-time.",
      difficulty: 'easy' as const,
      timeHours: 0,
    },
    student: {
      title: 'Set a weekly spending limit',
      description: 'Pick a realistic number. Write it on paper. Review it Friday.',
      difficulty: 'easy' as const,
      timeHours: 0.2,
    },
    creator: {
      title: 'Calculate your revenue per hour this week',
      description: "Time is your inventory. Know what it's worth.",
      difficulty: 'easy' as const,
      timeHours: 0.3,
    },
  },
} as const;
