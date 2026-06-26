import {
  BookOpen, Book, Headphones, PenTool, FileText,
  Sparkles, Heart, Sun, Wind, Smile,
  GraduationCap, Brain, Notebook, Repeat, ListChecks,
  PlayCircle, Video, Film,
  Languages, MessageCircle, Globe2,
  Briefcase, Target as TargetIcon, Rocket, Inbox,
  Dumbbell, Footprints, Activity,
  Feather, Music, Palette,
  Coffee, Sparkle,
  type LucideIcon,
} from "lucide-react";

export type ChallengeCategory =
  | "study"
  | "reading"
  | "spirituality"
  | "classes"
  | "language"
  | "work"
  | "fitness"
  | "creative"
  | "mindfulness"
  | "custom";

export interface ChallengeTemplate {
  /** i18n key suffix: rooms.challenges.templates.items.{id}.{title|desc} */
  id: string;
  category: ChallengeCategory;
  emoji: string;
  icon: LucideIcon;
  period: "daily" | "weekly";
  targetMinutes: number;
  durationDays: number | null;
}

export const CHALLENGE_CATEGORIES: { id: ChallengeCategory; icon: LucideIcon; emoji: string }[] = [
  { id: "study",        icon: GraduationCap, emoji: "📚" },
  { id: "reading",      icon: BookOpen,      emoji: "📖" },
  { id: "spirituality", icon: Sparkles,      emoji: "🙏" },
  { id: "classes",      icon: PlayCircle,    emoji: "🎓" },
  { id: "language",     icon: Languages,     emoji: "🗣️" },
  { id: "work",         icon: Briefcase,     emoji: "💼" },
  { id: "fitness",      icon: Dumbbell,      emoji: "🏃" },
  { id: "creative",     icon: Palette,       emoji: "🎨" },
  { id: "mindfulness",  icon: Smile,         emoji: "🧘" },
  { id: "custom",       icon: Sparkle,       emoji: "✨" },
];

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // ── Study ──
  { id: "study_pomodoro_daily", category: "study", emoji: "🍅", icon: Repeat,       period: "daily",  targetMinutes: 50, durationDays: 30 },
  { id: "study_exam_prep",      category: "study", emoji: "📚", icon: GraduationCap, period: "daily",  targetMinutes: 90, durationDays: 30 },
  { id: "study_flashcards",     category: "study", emoji: "🧠", icon: Brain,        period: "daily",  targetMinutes: 20, durationDays: 30 },
  { id: "study_summaries",      category: "study", emoji: "📝", icon: Notebook,     period: "daily",  targetMinutes: 30, durationDays: 30 },
  { id: "study_review_weekly",  category: "study", emoji: "🔁", icon: ListChecks,   period: "weekly", targetMinutes: 180, durationDays: 60 },

  // ── Reading ──
  { id: "reading_pages_daily",  category: "reading", emoji: "📖", icon: Book,        period: "daily",  targetMinutes: 25, durationDays: 30 },
  { id: "reading_finish_book",  category: "reading", emoji: "📕", icon: BookOpen,    period: "weekly", targetMinutes: 210, durationDays: 60 },
  { id: "reading_technical",    category: "reading", emoji: "📘", icon: FileText,    period: "daily",  targetMinutes: 45, durationDays: 30 },
  { id: "reading_audiobook",    category: "reading", emoji: "🎧", icon: Headphones,  period: "daily",  targetMinutes: 30, durationDays: 30 },
  { id: "reading_journaling",   category: "reading", emoji: "✍️", icon: PenTool,     period: "daily",  targetMinutes: 15, durationDays: 30 },

  // ── Spirituality ──
  { id: "spirituality_prayer",     category: "spirituality", emoji: "🙏", icon: Sparkles, period: "daily", targetMinutes: 20, durationDays: 30 },
  { id: "spirituality_bible",      category: "spirituality", emoji: "📖", icon: Book,     period: "daily", targetMinutes: 15, durationDays: 30 },
  { id: "spirituality_meditation", category: "spirituality", emoji: "🕊️", icon: Heart,    period: "daily", targetMinutes: 10, durationDays: 30 },
  { id: "spirituality_gratitude",  category: "spirituality", emoji: "🌅", icon: Sun,      period: "daily", targetMinutes: 5,  durationDays: 30 },
  { id: "spirituality_silence",    category: "spirituality", emoji: "🌿", icon: Wind,     period: "daily", targetMinutes: 15, durationDays: 30 },

  // ── Classes ──
  { id: "classes_one_per_day",   category: "classes", emoji: "🎓", icon: PlayCircle, period: "daily",  targetMinutes: 45, durationDays: 30 },
  { id: "classes_marathon",      category: "classes", emoji: "🎬", icon: Film,       period: "weekly", targetMinutes: 240, durationDays: 60 },
  { id: "classes_rewatch_notes", category: "classes", emoji: "📝", icon: Video,      period: "daily",  targetMinutes: 60, durationDays: 30 },
  { id: "classes_course",        category: "classes", emoji: "💡", icon: GraduationCap, period: "daily", targetMinutes: 30, durationDays: 60 },

  // ── Language ──
  { id: "language_vocabulary",   category: "language", emoji: "🔤", icon: Languages,     period: "daily", targetMinutes: 15, durationDays: 60 },
  { id: "language_conversation", category: "language", emoji: "💬", icon: MessageCircle, period: "daily", targetMinutes: 25, durationDays: 60 },
  { id: "language_immersion",    category: "language", emoji: "🌐", icon: Globe2,        period: "daily", targetMinutes: 30, durationDays: 60 },
  { id: "language_grammar",      category: "language", emoji: "📐", icon: Notebook,      period: "daily", targetMinutes: 20, durationDays: 60 },

  // ── Work ──
  { id: "work_deep_work",     category: "work", emoji: "💼", icon: Briefcase,  period: "daily", targetMinutes: 90, durationDays: 30 },
  { id: "work_side_project",  category: "work", emoji: "🚀", icon: Rocket,     period: "daily", targetMinutes: 60, durationDays: 60 },
  { id: "work_learning_role", category: "work", emoji: "🎯", icon: TargetIcon, period: "daily", targetMinutes: 45, durationDays: 30 },
  { id: "work_inbox_zero",    category: "work", emoji: "📥", icon: Inbox,      period: "daily", targetMinutes: 20, durationDays: 30 },

  // ── Fitness ──
  { id: "fitness_workout",   category: "fitness", emoji: "💪", icon: Dumbbell,   period: "daily",  targetMinutes: 45, durationDays: 30 },
  { id: "fitness_stretch",   category: "fitness", emoji: "🤸", icon: Activity,   period: "daily",  targetMinutes: 10, durationDays: 30 },
  { id: "fitness_run",       category: "fitness", emoji: "🏃", icon: Footprints, period: "weekly", targetMinutes: 120, durationDays: 60 },

  // ── Creative ──
  { id: "creative_writing", category: "creative", emoji: "✍️", icon: Feather, period: "daily", targetMinutes: 30, durationDays: 30 },
  { id: "creative_music",   category: "creative", emoji: "🎵", icon: Music,   period: "daily", targetMinutes: 40, durationDays: 30 },
  { id: "creative_drawing", category: "creative", emoji: "🎨", icon: Palette, period: "daily", targetMinutes: 25, durationDays: 30 },

  // ── Mindfulness ──
  { id: "mindfulness_meditation", category: "mindfulness", emoji: "🧘", icon: Smile,   period: "daily", targetMinutes: 10, durationDays: 30 },
  { id: "mindfulness_breathing",  category: "mindfulness", emoji: "🌬️", icon: Wind,    period: "daily", targetMinutes: 5,  durationDays: 30 },
  { id: "mindfulness_pause",      category: "mindfulness", emoji: "☕", icon: Coffee,  period: "daily", targetMinutes: 10, durationDays: 30 },
];

export function getTemplatesByCategory(cat: ChallengeCategory): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter((t) => t.category === cat);
}
