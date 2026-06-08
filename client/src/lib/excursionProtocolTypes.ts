export type ExcursionActivity = {
  content: string;
  imageDataUrl?: string;
  /** 1–5: Stimmung / Vibe zu dieser Aktivität */
  activityRating?: number;
};

/** Spielerische Kurzbewertung pro Aktivität */
export const ACTIVITY_VIBE_OPTIONS = [
  { score: 5, emoji: '🤩', label: 'Mega!' },
  { score: 4, emoji: '🔥', label: 'Spannend' },
  { score: 3, emoji: '😊', label: 'Ganz okay' },
  { score: 2, emoji: '🤔', label: 'Na ja…' },
  { score: 1, emoji: '😴', label: 'Eher müde' },
] as const;

export const ACTIVITY_RATING_PROMPTS = [
  'Wie war diese Station?',
  'Dein Vibe hier?',
  'Spannungsgefühl?',
  'Nochmal machen?',
  'Überraschungsfaktor?',
] as const;

export const activityVibeLabel = (score: number | undefined): string => {
  const hit = ACTIVITY_VIBE_OPTIONS.find((o) => o.score === score);
  return hit ? `${hit.emoji} ${hit.label}` : '—';
};

export type ExcursionReflection = {
  learned: string;
  highlight: string;
  openQuestion: string;
};

export type ExcursionRating = {
  criterion: string;
  score: number;
};

export type ExcursionProtocolSubmission = {
  studentId: string;
  studentName: string;
  activities: ExcursionActivity[];
  reflection: ExcursionReflection;
  ratings: ExcursionRating[];
  submittedAt: string;
};

export type ExcursionSession = {
  id?: string;
  title: string;
  date: string;
  publishedAt?: string | null;
  groupIds?: string[];
  reflectionQuestions: [string, string, string];
  ratingCriteria: string[];
  submissions?: ExcursionProtocolSubmission[];
};

export type ExcursionTeacherGroup = {
  id: string;
  name: string;
  studentCount: number;
};

export type ExcursionListItem = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  groupNames: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ratingCriteria: string[];
  reflectionQuestions: [string, string, string];
  submissionCount: number;
  totalStudents: number;
  isPublished: boolean;
};

export type ExcursionAvailableSession = {
  id: string;
  title: string;
  date: string;
  publishedAt: string | null;
  teacherId: string;
  teacherName: string;
  groupId: string;
  groupName: string;
  lessonPath: string;
  reflectionQuestions: [string, string, string];
  ratingCriteria: string[];
};

export const DEFAULT_REFLECTION_QUESTIONS: [string, string, string] = [
  'Was habe ich heute gelernt oder neu kennengelernt?',
  'Was hat mir besonders gut gefallen – und warum?',
  'Was würde ich beim nächsten Mal anders machen oder noch genauer wissen wollen?',
];

export const DEFAULT_RATING_CRITERIA = [
  'Organisation',
  'Inhalte & Lernangebot',
  'Gruppenstimmung',
  'Betreuung',
  'Gesamteindruck',
];

export const EXCURSION_PROTOCOL_STEPS = [
  { id: 'activities', label: 'Aktivitäten', short: '1' },
  { id: 'images', label: 'Bilder', short: '2' },
  { id: 'reflection', label: '3 Fragen', short: '3' },
  { id: 'rating', label: 'Bewertung', short: '4' },
] as const;

export type ExcursionProtocolStepId = (typeof EXCURSION_PROTOCOL_STEPS)[number]['id'];

export type ExcursionStudentRosterEntry = {
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  submitted: boolean;
  submittedAt: string | null;
  submission: ExcursionProtocolSubmission | null;
};
