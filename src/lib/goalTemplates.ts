import {
  BookOpen, Book, Clock, DollarSign, CreditCard, PiggyBank, TrendingUp,
  HeartHandshake, Sparkles, Sun, Utensils, GraduationCap, Languages, PenTool,
  Droplet, Dumbbell, Footprints, Brain, Bed, Notebook,
  type LucideIcon,
} from "lucide-react";
import { GoalType, FrequencyPeriod } from "@/hooks/useAnnualGoals";

export interface GoalTemplate {
  id: string;
  icon: LucideIcon;
  category: TemplateCategory;
  goalType: GoalType;
  /** i18n key suffix: annual_goals.templates.items.{i18nKey}.{title|desc} */
  i18nKey: string;
  defaultTitle: string; // fallback if i18n missing
  defaultDesc?: string;
  defaultTarget: number;
  unit?: string;
  /** translation key for the unit (annual_goals.templates.units.{unitKey}) */
  unitKey?: string;
  frequency?: FrequencyPeriod;
  /** When true, opens a book picker (specific book + pages) */
  bookPicker?: boolean;
  /** When true, opens currency picker for finance goals */
  currencyPicker?: boolean;
}

export type TemplateCategory =
  | "reading" | "finance" | "spirituality" | "study" | "health" | "habits";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; icon: LucideIcon }[] = [
  { id: "reading", icon: BookOpen },
  { id: "finance", icon: DollarSign },
  { id: "spirituality", icon: Sparkles },
  { id: "study", icon: GraduationCap },
  { id: "health", icon: Dumbbell },
  { id: "habits", icon: Notebook },
];

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Reading
  { id: "read_specific_book", icon: Book, category: "reading", goalType: "progress",
    i18nKey: "read_specific_book", defaultTitle: "Ler um livro", defaultTarget: 300,
    unit: "pages", unitKey: "pages", bookPicker: true },
  { id: "read_n_books", icon: BookOpen, category: "reading", goalType: "progress",
    i18nKey: "read_n_books", defaultTitle: "Ler livros este ano", defaultTarget: 12,
    unit: "books", unitKey: "books" },
  { id: "read_daily", icon: Clock, category: "reading", goalType: "habit",
    i18nKey: "read_daily", defaultTitle: "Ler 30 min por dia", defaultTarget: 7,
    frequency: "weekly" },

  // Finance
  { id: "save_money", icon: PiggyBank, category: "finance", goalType: "progress",
    i18nKey: "save_money", defaultTitle: "Economizar", defaultTarget: 10000,
    unit: "$", currencyPicker: true },
  { id: "pay_debt", icon: CreditCard, category: "finance", goalType: "progress",
    i18nKey: "pay_debt", defaultTitle: "Quitar dívida", defaultTarget: 5000,
    unit: "$", currencyPicker: true },
  { id: "invest_monthly", icon: TrendingUp, category: "finance", goalType: "habit",
    i18nKey: "invest_monthly", defaultTitle: "Investir todo mês", defaultTarget: 1,
    frequency: "monthly" },

  // Spirituality
  { id: "read_bible", icon: BookOpen, category: "spirituality", goalType: "progress",
    i18nKey: "read_bible", defaultTitle: "Ler a Bíblia em 1 ano",
    defaultTarget: 1189, unit: "chapters", unitKey: "chapters" },
  { id: "pray_daily", icon: HeartHandshake, category: "spirituality", goalType: "habit",
    i18nKey: "pray_daily", defaultTitle: "Orar todos os dias", defaultTarget: 7,
    frequency: "weekly" },
  { id: "devotional_daily", icon: Sun, category: "spirituality", goalType: "habit",
    i18nKey: "devotional_daily", defaultTitle: "Devocional diário", defaultTarget: 7,
    frequency: "weekly" },
  { id: "fasting_weekly", icon: Utensils, category: "spirituality", goalType: "habit",
    i18nKey: "fasting_weekly", defaultTitle: "Jejuar 1x por semana", defaultTarget: 1,
    frequency: "weekly" },

  // Study
  { id: "study_hours", icon: GraduationCap, category: "study", goalType: "progress",
    i18nKey: "study_hours", defaultTitle: "Estudar horas este ano",
    defaultTarget: 200, unit: "hours", unitKey: "hours" },
  { id: "learn_language", icon: Languages, category: "study", goalType: "habit",
    i18nKey: "learn_language", defaultTitle: "Praticar idioma diariamente",
    defaultTarget: 7, frequency: "weekly" },
  { id: "finish_course", icon: PenTool, category: "study", goalType: "simple",
    i18nKey: "finish_course", defaultTitle: "Concluir um curso", defaultTarget: 1 },

  // Health
  { id: "drink_water", icon: Droplet, category: "health", goalType: "habit",
    i18nKey: "drink_water", defaultTitle: "Beber 2L de água por dia",
    defaultTarget: 7, frequency: "weekly" },
  { id: "workout", icon: Dumbbell, category: "health", goalType: "habit",
    i18nKey: "workout", defaultTitle: "Treinar 4x por semana", defaultTarget: 4,
    frequency: "weekly" },
  { id: "run_km", icon: Footprints, category: "health", goalType: "progress",
    i18nKey: "run_km", defaultTitle: "Correr km este ano", defaultTarget: 100,
    unit: "km", unitKey: "km" },
  { id: "meditate", icon: Brain, category: "health", goalType: "habit",
    i18nKey: "meditate", defaultTitle: "Meditar diariamente", defaultTarget: 7,
    frequency: "weekly" },

  // Habits
  { id: "journal", icon: Notebook, category: "habits", goalType: "habit",
    i18nKey: "journal", defaultTitle: "Escrever no diário",
    defaultTarget: 7, frequency: "weekly" },
  { id: "sleep_8h", icon: Bed, category: "habits", goalType: "habit",
    i18nKey: "sleep_8h", defaultTitle: "Dormir 8h por noite", defaultTarget: 7,
    frequency: "weekly" },
];

/** Popular books with real page counts (titles in original language, kept as-is). */
export interface BookOption { id: string; title: string; author?: string; pages: number }
export const POPULAR_BOOKS: BookOption[] = [
  { id: "bible", title: "Bíblia Sagrada", pages: 1189 },
  { id: "atomic-habits", title: "Atomic Habits", author: "James Clear", pages: 320 },
  { id: "deep-work", title: "Deep Work", author: "Cal Newport", pages: 304 },
  { id: "psychology-money", title: "The Psychology of Money", author: "Morgan Housel", pages: 256 },
  { id: "sapiens", title: "Sapiens", author: "Yuval Noah Harari", pages: 443 },
  { id: "thinking-fast-slow", title: "Thinking, Fast and Slow", author: "Daniel Kahneman", pages: 499 },
  { id: "48-laws-power", title: "The 48 Laws of Power", author: "Robert Greene", pages: 452 },
  { id: "rich-dad", title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", pages: 336 },
  { id: "subtle-art", title: "The Subtle Art of Not Giving a F*ck", author: "Mark Manson", pages: 224 },
  { id: "ego-enemy", title: "Ego is the Enemy", author: "Ryan Holiday", pages: 256 },
  { id: "12-rules", title: "12 Rules for Life", author: "Jordan Peterson", pages: 409 },
  { id: "can-t-hurt-me", title: "Can't Hurt Me", author: "David Goggins", pages: 366 },
  { id: "dom-casmurro", title: "Dom Casmurro", author: "Machado de Assis", pages: 256 },
  { id: "pequeno-principe", title: "O Pequeno Príncipe", author: "Antoine de Saint-Exupéry", pages: 96 },
  { id: "harry-potter-1", title: "Harry Potter e a Pedra Filosofal", author: "J.K. Rowling", pages: 264 },
  { id: "lord-rings-1", title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", pages: 423 },
  { id: "1984", title: "1984", author: "George Orwell", pages: 328 },
  { id: "alchemist", title: "O Alquimista", author: "Paulo Coelho", pages: 208 },
];

export const CURRENCIES = [
  { code: "BRL", symbol: "R$" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
  { code: "ARS", symbol: "$" },
  { code: "MXN", symbol: "$" },
];
