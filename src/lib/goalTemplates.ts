import {
  BookOpen, Book, Clock, DollarSign, CreditCard, PiggyBank, TrendingUp,
  HeartHandshake, Sparkles, Sun, Utensils, GraduationCap, Languages, PenTool,
  Droplet, Dumbbell, Footprints, Brain, Bed, Notebook,
  Heart, Briefcase, Palette, Plane, Smile, Target,
  Phone, Users, Baby, BadgeCheck, LineChart, Network, Rocket,
  Music, Camera, ChefHat, Feather, Mountain, Tent, Globe2,
  Inbox, CalendarCheck, Timer, Coffee, ShieldCheck, Headphones,
  Quote, MessageCircle, Flame, Wind, Smartphone, ListChecks,
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
  defaultTitle: string;
  defaultDesc?: string;
  defaultTarget: number;
  unit?: string;
  unitKey?: string;
  frequency?: FrequencyPeriod;
  bookPicker?: boolean;
  currencyPicker?: boolean;
}

export type TemplateCategory =
  | "reading" | "finance" | "spirituality" | "study" | "health" | "habits"
  | "family" | "career" | "hobbies" | "travel" | "mindfulness" | "productivity";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; icon: LucideIcon }[] = [
  { id: "reading", icon: BookOpen },
  { id: "spirituality", icon: Sparkles },
  { id: "finance", icon: DollarSign },
  { id: "study", icon: GraduationCap },
  { id: "health", icon: Dumbbell },
  { id: "habits", icon: Notebook },
  { id: "family", icon: Heart },
  { id: "career", icon: Briefcase },
  { id: "hobbies", icon: Palette },
  { id: "travel", icon: Plane },
  { id: "mindfulness", icon: Smile },
  { id: "productivity", icon: Target },
];

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // ───── Reading ─────
  { id: "read_specific_book", icon: Book, category: "reading", goalType: "progress",
    i18nKey: "read_specific_book", defaultTitle: "Read a specific book", defaultTarget: 300,
    unit: "pages", unitKey: "pages", bookPicker: true },
  { id: "read_n_books", icon: BookOpen, category: "reading", goalType: "progress",
    i18nKey: "read_n_books", defaultTitle: "Read N books this year", defaultTarget: 12,
    unit: "books", unitKey: "books" },
  { id: "read_daily", icon: Clock, category: "reading", goalType: "habit",
    i18nKey: "read_daily", defaultTitle: "Read 30 min/day", defaultTarget: 7,
    frequency: "weekly" },
  { id: "audiobook_yearly", icon: Headphones, category: "reading", goalType: "progress",
    i18nKey: "audiobook_yearly", defaultTitle: "Listen to N audiobooks", defaultTarget: 6,
    unit: "books", unitKey: "books" },
  { id: "book_reviews", icon: PenTool, category: "reading", goalType: "progress",
    i18nKey: "book_reviews", defaultTitle: "Write book reviews", defaultTarget: 12,
    unit: "reviews", unitKey: "reviews" },
  { id: "screen_to_book", icon: BookOpen, category: "reading", goalType: "habit",
    i18nKey: "screen_to_book", defaultTitle: "Trade screen time for reading", defaultTarget: 7,
    frequency: "weekly" },

  // ───── Finance ─────
  { id: "save_money", icon: PiggyBank, category: "finance", goalType: "progress",
    i18nKey: "save_money", defaultTitle: "Save money", defaultTarget: 10000,
    unit: "$", currencyPicker: true },
  { id: "pay_debt", icon: CreditCard, category: "finance", goalType: "progress",
    i18nKey: "pay_debt", defaultTitle: "Pay off debt", defaultTarget: 5000,
    unit: "$", currencyPicker: true },
  { id: "invest_monthly", icon: TrendingUp, category: "finance", goalType: "habit",
    i18nKey: "invest_monthly", defaultTitle: "Invest monthly", defaultTarget: 1,
    frequency: "monthly" },
  { id: "emergency_fund", icon: ShieldCheck, category: "finance", goalType: "progress",
    i18nKey: "emergency_fund", defaultTitle: "Build 6-month emergency fund", defaultTarget: 30000,
    unit: "$", currencyPicker: true },
  { id: "out_of_red", icon: BadgeCheck, category: "finance", goalType: "simple",
    i18nKey: "out_of_red", defaultTitle: "Get out of the red", defaultTarget: 1 },
  { id: "learn_finance_skill", icon: LineChart, category: "finance", goalType: "simple",
    i18nKey: "learn_finance_skill", defaultTitle: "Learn a new finance skill", defaultTarget: 1 },
  { id: "cut_expenses", icon: PiggyBank, category: "finance", goalType: "habit",
    i18nKey: "cut_expenses", defaultTitle: "Cut unnecessary expenses", defaultTarget: 1,
    frequency: "monthly" },
  { id: "tithe_monthly", icon: HeartHandshake, category: "finance", goalType: "habit",
    i18nKey: "tithe_monthly", defaultTitle: "Donate / tithe monthly", defaultTarget: 1,
    frequency: "monthly" },

  // ───── Spirituality ─────
  { id: "read_bible", icon: BookOpen, category: "spirituality", goalType: "progress",
    i18nKey: "read_bible", defaultTitle: "Read the Bible in 1 year",
    defaultTarget: 1189, unit: "chapters", unitKey: "chapters" },
  { id: "bible_audio_year", icon: Headphones, category: "spirituality", goalType: "habit",
    i18nKey: "bible_audio_year", defaultTitle: "Listen to the Bible (audio)", defaultTarget: 7,
    frequency: "weekly" },
  { id: "pray_daily", icon: HeartHandshake, category: "spirituality", goalType: "habit",
    i18nKey: "pray_daily", defaultTitle: "Pray daily", defaultTarget: 7,
    frequency: "weekly" },
  { id: "devotional_daily", icon: Sun, category: "spirituality", goalType: "habit",
    i18nKey: "devotional_daily", defaultTitle: "Daily devotional", defaultTarget: 7,
    frequency: "weekly" },
  { id: "fasting_weekly", icon: Utensils, category: "spirituality", goalType: "habit",
    i18nKey: "fasting_weekly", defaultTitle: "Fast 1x/week", defaultTarget: 1,
    frequency: "weekly" },
  { id: "proverbs_daily", icon: Book, category: "spirituality", goalType: "habit",
    i18nKey: "proverbs_daily", defaultTitle: "Read 1 chapter of Proverbs/day", defaultTarget: 7,
    frequency: "weekly" },
  { id: "memorize_verses", icon: Quote, category: "spirituality", goalType: "progress",
    i18nKey: "memorize_verses", defaultTitle: "Memorize Bible verses", defaultTarget: 52,
    unit: "verses", unitKey: "verses" },
  { id: "small_group", icon: Users, category: "spirituality", goalType: "habit",
    i18nKey: "small_group", defaultTitle: "Attend small group weekly", defaultTarget: 1,
    frequency: "weekly" },
  { id: "evangelize", icon: MessageCircle, category: "spirituality", goalType: "habit",
    i18nKey: "evangelize", defaultTitle: "Share faith with 1 person/month", defaultTarget: 1,
    frequency: "monthly" },
  { id: "spiritual_retreat", icon: Mountain, category: "spirituality", goalType: "simple",
    i18nKey: "spiritual_retreat", defaultTitle: "Go on a spiritual retreat", defaultTarget: 1 },

  // ───── Study ─────
  { id: "study_hours", icon: GraduationCap, category: "study", goalType: "progress",
    i18nKey: "study_hours", defaultTitle: "Study X hours this year",
    defaultTarget: 200, unit: "hours", unitKey: "hours" },
  { id: "learn_language", icon: Languages, category: "study", goalType: "habit",
    i18nKey: "learn_language", defaultTitle: "Practice language daily",
    defaultTarget: 7, frequency: "weekly" },
  { id: "finish_course", icon: PenTool, category: "study", goalType: "simple",
    i18nKey: "finish_course", defaultTitle: "Finish a course", defaultTarget: 1 },
  { id: "get_certification", icon: BadgeCheck, category: "study", goalType: "simple",
    i18nKey: "get_certification", defaultTitle: "Get a certification", defaultTarget: 1 },
  { id: "weekly_article", icon: Notebook, category: "study", goalType: "habit",
    i18nKey: "weekly_article", defaultTitle: "Read 1 technical article/week", defaultTarget: 1,
    frequency: "weekly" },
  { id: "private_lessons", icon: GraduationCap, category: "study", goalType: "habit",
    i18nKey: "private_lessons", defaultTitle: "Private lessons (weekly)", defaultTarget: 1,
    frequency: "weekly" },
  { id: "solve_problems", icon: ListChecks, category: "study", goalType: "habit",
    i18nKey: "solve_problems", defaultTitle: "Solve N problems/week", defaultTarget: 5,
    frequency: "weekly" },

  // ───── Health ─────
  { id: "drink_water", icon: Droplet, category: "health", goalType: "habit",
    i18nKey: "drink_water", defaultTitle: "Drink 2L of water/day",
    defaultTarget: 7, frequency: "weekly" },
  { id: "workout", icon: Dumbbell, category: "health", goalType: "habit",
    i18nKey: "workout", defaultTitle: "Workout 4x/week", defaultTarget: 4,
    frequency: "weekly" },
  { id: "run_km", icon: Footprints, category: "health", goalType: "progress",
    i18nKey: "run_km", defaultTitle: "Run X km this year", defaultTarget: 100,
    unit: "km", unitKey: "km" },
  { id: "meditate", icon: Brain, category: "health", goalType: "habit",
    i18nKey: "meditate", defaultTitle: "Meditate daily", defaultTarget: 7,
    frequency: "weekly" },
  { id: "weight_target", icon: LineChart, category: "health", goalType: "progress",
    i18nKey: "weight_target", defaultTitle: "Reach target weight (kg lost/gained)", defaultTarget: 10,
    unit: "kg", unitKey: "kg" },
  { id: "daily_steps", icon: Footprints, category: "health", goalType: "habit",
    i18nKey: "daily_steps", defaultTitle: "10,000 steps/day", defaultTarget: 7,
    frequency: "weekly" },
  { id: "no_alcohol_soda", icon: ShieldCheck, category: "health", goalType: "habit",
    i18nKey: "no_alcohol_soda", defaultTitle: "No alcohol / soda", defaultTarget: 7,
    frequency: "weekly" },
  { id: "annual_checkup", icon: Heart, category: "health", goalType: "simple",
    i18nKey: "annual_checkup", defaultTitle: "Annual health checkup", defaultTarget: 1 },
  { id: "yoga_stretch", icon: Wind, category: "health", goalType: "habit",
    i18nKey: "yoga_stretch", defaultTitle: "Yoga / stretching", defaultTarget: 3,
    frequency: "weekly" },

  // ───── Habits ─────
  { id: "journal", icon: Notebook, category: "habits", goalType: "habit",
    i18nKey: "journal", defaultTitle: "Write in journal",
    defaultTarget: 7, frequency: "weekly" },
  { id: "sleep_8h", icon: Bed, category: "habits", goalType: "habit",
    i18nKey: "sleep_8h", defaultTitle: "Sleep 8h/night", defaultTarget: 7,
    frequency: "weekly" },
  { id: "wake_up_early", icon: Sun, category: "habits", goalType: "habit",
    i18nKey: "wake_up_early", defaultTitle: "Wake up early", defaultTarget: 7,
    frequency: "weekly" },
  { id: "no_phone_morning", icon: Smartphone, category: "habits", goalType: "habit",
    i18nKey: "no_phone_morning", defaultTitle: "No phone in the first hour", defaultTarget: 7,
    frequency: "weekly" },
  { id: "gratitude", icon: Heart, category: "habits", goalType: "habit",
    i18nKey: "gratitude", defaultTitle: "List 3 gratitudes/day", defaultTarget: 7,
    frequency: "weekly" },

  // ───── Family & Relationships ─────
  { id: "weekly_date", icon: Heart, category: "family", goalType: "habit",
    i18nKey: "weekly_date", defaultTitle: "Weekly date with partner", defaultTarget: 1,
    frequency: "weekly" },
  { id: "call_parents", icon: Phone, category: "family", goalType: "habit",
    i18nKey: "call_parents", defaultTitle: "Call parents weekly", defaultTarget: 1,
    frequency: "weekly" },
  { id: "play_with_kids", icon: Baby, category: "family", goalType: "habit",
    i18nKey: "play_with_kids", defaultTitle: "Play with kids 30 min/day", defaultTarget: 7,
    frequency: "weekly" },
  { id: "reconnect_friends", icon: Users, category: "family", goalType: "progress",
    i18nKey: "reconnect_friends", defaultTitle: "Reconnect with 5 friends", defaultTarget: 5,
    unit: "friends", unitKey: "friends" },
  { id: "family_dinner", icon: Utensils, category: "family", goalType: "habit",
    i18nKey: "family_dinner", defaultTitle: "Family dinner together", defaultTarget: 5,
    frequency: "weekly" },

  // ───── Career ─────
  { id: "get_promotion", icon: Rocket, category: "career", goalType: "simple",
    i18nKey: "get_promotion", defaultTitle: "Get a promotion / new job", defaultTarget: 1 },
  { id: "salary_raise", icon: TrendingUp, category: "career", goalType: "progress",
    i18nKey: "salary_raise", defaultTitle: "Raise income by X%", defaultTarget: 20,
    unit: "%", unitKey: "percent" },
  { id: "update_portfolio", icon: BadgeCheck, category: "career", goalType: "simple",
    i18nKey: "update_portfolio", defaultTitle: "Update portfolio / LinkedIn", defaultTarget: 1 },
  { id: "networking_weekly", icon: Network, category: "career", goalType: "habit",
    i18nKey: "networking_weekly", defaultTitle: "Networking weekly", defaultTarget: 1,
    frequency: "weekly" },
  { id: "launch_side_project", icon: Rocket, category: "career", goalType: "simple",
    i18nKey: "launch_side_project", defaultTitle: "Launch a side project", defaultTarget: 1 },

  // ───── Hobbies & Creativity ─────
  { id: "learn_instrument", icon: Music, category: "hobbies", goalType: "progress",
    i18nKey: "learn_instrument", defaultTitle: "Learn instrument (hours)", defaultTarget: 100,
    unit: "hours", unitKey: "hours" },
  { id: "paint_draw", icon: Palette, category: "hobbies", goalType: "progress",
    i18nKey: "paint_draw", defaultTitle: "Paint / draw N artworks", defaultTarget: 12,
    unit: "artworks", unitKey: "artworks" },
  { id: "play_music", icon: Music, category: "hobbies", goalType: "habit",
    i18nKey: "play_music", defaultTitle: "Play music", defaultTarget: 3,
    frequency: "weekly" },
  { id: "write_book", icon: Feather, category: "hobbies", goalType: "simple",
    i18nKey: "write_book", defaultTitle: "Write a book / short story", defaultTarget: 1 },
  { id: "new_recipe", icon: ChefHat, category: "hobbies", goalType: "habit",
    i18nKey: "new_recipe", defaultTitle: "Cook a new recipe", defaultTarget: 1,
    frequency: "weekly" },
  { id: "photography", icon: Camera, category: "hobbies", goalType: "progress",
    i18nKey: "photography", defaultTitle: "Take N photos this year", defaultTarget: 100,
    unit: "photos", unitKey: "photos" },

  // ───── Travel & Adventure ─────
  { id: "new_cities", icon: Globe2, category: "travel", goalType: "progress",
    i18nKey: "new_cities", defaultTitle: "Visit N new cities", defaultTarget: 5,
    unit: "cities", unitKey: "cities" },
  { id: "international_trip", icon: Plane, category: "travel", goalType: "simple",
    i18nKey: "international_trip", defaultTitle: "One international trip", defaultTarget: 1 },
  { id: "hike_mountain", icon: Mountain, category: "travel", goalType: "progress",
    i18nKey: "hike_mountain", defaultTitle: "Hikes / mountains", defaultTarget: 4,
    unit: "hikes", unitKey: "hikes" },
  { id: "camping", icon: Tent, category: "travel", goalType: "habit",
    i18nKey: "camping", defaultTitle: "Camping trip", defaultTarget: 1,
    frequency: "monthly" },

  // ───── Mindfulness & Wellbeing ─────
  { id: "therapy_weekly", icon: HeartHandshake, category: "mindfulness", goalType: "habit",
    i18nKey: "therapy_weekly", defaultTitle: "Weekly therapy session", defaultTarget: 1,
    frequency: "weekly" },
  { id: "breath_daily", icon: Wind, category: "mindfulness", goalType: "habit",
    i18nKey: "breath_daily", defaultTitle: "Daily breathing session", defaultTarget: 7,
    frequency: "weekly" },
  { id: "digital_detox", icon: Smartphone, category: "mindfulness", goalType: "habit",
    i18nKey: "digital_detox", defaultTitle: "Monthly digital detox", defaultTarget: 1,
    frequency: "monthly" },
  { id: "nature_walk", icon: Footprints, category: "mindfulness", goalType: "habit",
    i18nKey: "nature_walk", defaultTitle: "Walk in nature", defaultTarget: 2,
    frequency: "weekly" },

  // ───── Productivity ─────
  { id: "weekly_pomodoros", icon: Timer, category: "productivity", goalType: "habit",
    i18nKey: "weekly_pomodoros", defaultTitle: "Complete N pomodoros/week", defaultTarget: 20,
    frequency: "weekly" },
  { id: "inbox_zero", icon: Inbox, category: "productivity", goalType: "habit",
    i18nKey: "inbox_zero", defaultTitle: "Daily inbox zero", defaultTarget: 7,
    frequency: "weekly" },
  { id: "weekly_planning", icon: CalendarCheck, category: "productivity", goalType: "habit",
    i18nKey: "weekly_planning", defaultTitle: "Sunday weekly planning", defaultTarget: 1,
    frequency: "weekly" },
  { id: "deep_work", icon: Flame, category: "productivity", goalType: "habit",
    i18nKey: "deep_work", defaultTitle: "Deep work block daily", defaultTarget: 5,
    frequency: "weekly" },
];

/** Popular books with real page counts (titles in original language). */
export type BookGenre =
  | "christian" | "fantasy" | "classic" | "personal" | "business" | "history";

export interface BookOption {
  id: string;
  title: string;
  author?: string;
  pages: number;
  genre: BookGenre;
}

export const BOOK_GENRES: { id: BookGenre; icon: LucideIcon }[] = [
  { id: "christian", icon: HeartHandshake },
  { id: "fantasy", icon: Sparkles },
  { id: "classic", icon: Feather },
  { id: "personal", icon: Brain },
  { id: "business", icon: TrendingUp },
  { id: "history", icon: Globe2 },
];

export const POPULAR_BOOKS: BookOption[] = [
  // Christian / Spiritual
  { id: "bible", title: "Bíblia Sagrada", pages: 1189, genre: "christian" },
  { id: "pilgrim-progress", title: "O Peregrino", author: "John Bunyan", pages: 320, genre: "christian" },
  { id: "wwjd", title: "Em Seus Passos o Que Faria Jesus?", author: "Charles M. Sheldon", pages: 192, genre: "christian" },
  { id: "most-important-happened", title: "O Mais Importante Aconteceu", author: "Heber Campos Jr.", pages: 224, genre: "christian" },
  { id: "the-shack", title: "A Cabana", author: "William P. Young", pages: 256, genre: "christian" },
  { id: "mere-christianity", title: "Mero Cristianismo", author: "C.S. Lewis", pages: 224, genre: "christian" },
  { id: "screwtape", title: "Cartas de um Diabo a seu Aprendiz", author: "C.S. Lewis", pages: 172, genre: "christian" },
  { id: "jesus-calling", title: "Jesus Calling", author: "Sarah Young", pages: 400, genre: "christian" },
  { id: "knowledge-holy", title: "O Conhecimento do Santo", author: "A.W. Tozer", pages: 144, genre: "christian" },
  { id: "purpose-driven", title: "Uma Vida com Propósitos", author: "Rick Warren", pages: 336, genre: "christian" },

  // Fantasy / Fiction
  { id: "narnia", title: "As Crônicas de Nárnia (volume único)", author: "C.S. Lewis", pages: 768, genre: "fantasy" },
  { id: "hobbit", title: "O Hobbit", author: "J.R.R. Tolkien", pages: 310, genre: "fantasy" },
  { id: "lotr", title: "O Senhor dos Anéis (volume único)", author: "J.R.R. Tolkien", pages: 1216, genre: "fantasy" },
  { id: "lord-rings-1", title: "A Sociedade do Anel", author: "J.R.R. Tolkien", pages: 423, genre: "fantasy" },
  { id: "harry-potter-1", title: "Harry Potter e a Pedra Filosofal", author: "J.K. Rowling", pages: 264, genre: "fantasy" },
  { id: "percy-jackson-1", title: "Percy Jackson: O Ladrão de Raios", author: "Rick Riordan", pages: 377, genre: "fantasy" },
  { id: "twilight", title: "Crepúsculo", author: "Stephenie Meyer", pages: 498, genre: "fantasy" },
  { id: "hunger-games", title: "Jogos Vorazes", author: "Suzanne Collins", pages: 374, genre: "fantasy" },
  { id: "eragon", title: "Eragon", author: "Christopher Paolini", pages: 509, genre: "fantasy" },
  { id: "dune", title: "Duna", author: "Frank Herbert", pages: 688, genre: "fantasy" },
  { id: "wheel-time-1", title: "A Roda do Tempo: O Olho do Mundo", author: "Robert Jordan", pages: 782, genre: "fantasy" },

  // Classics
  { id: "les-miserables", title: "Os Miseráveis", author: "Victor Hugo", pages: 1488, genre: "classic" },
  { id: "crime-punishment", title: "Crime e Castigo", author: "Dostoiévski", pages: 671, genre: "classic" },
  { id: "anna-karenina", title: "Anna Karenina", author: "Liev Tolstói", pages: 864, genre: "classic" },
  { id: "pride-prejudice", title: "Orgulho e Preconceito", author: "Jane Austen", pages: 432, genre: "classic" },
  { id: "monte-cristo", title: "O Conde de Monte Cristo", author: "Alexandre Dumas", pages: 1276, genre: "classic" },
  { id: "cem-anos", title: "Cem Anos de Solidão", author: "Gabriel García Márquez", pages: 417, genre: "classic" },
  { id: "bras-cubas", title: "Memórias Póstumas de Brás Cubas", author: "Machado de Assis", pages: 256, genre: "classic" },
  { id: "dom-casmurro", title: "Dom Casmurro", author: "Machado de Assis", pages: 256, genre: "classic" },
  { id: "cortico", title: "O Cortiço", author: "Aluísio Azevedo", pages: 304, genre: "classic" },
  { id: "vidas-secas", title: "Vidas Secas", author: "Graciliano Ramos", pages: 176, genre: "classic" },
  { id: "1984", title: "1984", author: "George Orwell", pages: 328, genre: "classic" },
  { id: "alchemist", title: "O Alquimista", author: "Paulo Coelho", pages: 208, genre: "classic" },
  { id: "pequeno-principe", title: "O Pequeno Príncipe", author: "Antoine de Saint-Exupéry", pages: 96, genre: "classic" },

  // Personal development
  { id: "atomic-habits", title: "Atomic Habits", author: "James Clear", pages: 320, genre: "personal" },
  { id: "7-habits", title: "Os 7 Hábitos das Pessoas Altamente Eficazes", author: "Stephen R. Covey", pages: 432, genre: "personal" },
  { id: "mindset", title: "Mindset", author: "Carol S. Dweck", pages: 312, genre: "personal" },
  { id: "essentialism", title: "Essencialismo", author: "Greg McKeown", pages: 272, genre: "personal" },
  { id: "power-of-habit", title: "O Poder do Hábito", author: "Charles Duhigg", pages: 408, genre: "personal" },
  { id: "how-to-win-friends", title: "Como Fazer Amigos e Influenciar Pessoas", author: "Dale Carnegie", pages: 256, genre: "personal" },
  { id: "deep-work", title: "Deep Work", author: "Cal Newport", pages: 304, genre: "personal" },
  { id: "focus-goleman", title: "Foco", author: "Daniel Goleman", pages: 320, genre: "personal" },
  { id: "start-with-why", title: "Comece pelo Porquê", author: "Simon Sinek", pages: 256, genre: "personal" },
  { id: "subtle-art", title: "A Sutil Arte de Ligar o F*da-se", author: "Mark Manson", pages: 224, genre: "personal" },
  { id: "ego-enemy", title: "Ego é Seu Inimigo", author: "Ryan Holiday", pages: 256, genre: "personal" },
  { id: "12-rules", title: "12 Regras para a Vida", author: "Jordan Peterson", pages: 409, genre: "personal" },
  { id: "cant-hurt-me", title: "Can't Hurt Me", author: "David Goggins", pages: 366, genre: "personal" },

  // Business / Finance
  { id: "rich-dad", title: "Pai Rico, Pai Pobre", author: "Robert Kiyosaki", pages: 336, genre: "business" },
  { id: "psychology-money", title: "A Psicologia Financeira", author: "Morgan Housel", pages: 256, genre: "business" },
  { id: "millionaire-mind", title: "Os Segredos da Mente Milionária", author: "T. Harv Eker", pages: 240, genre: "business" },
  { id: "intelligent-investor", title: "O Investidor Inteligente", author: "Benjamin Graham", pages: 656, genre: "business" },
  { id: "principles-dalio", title: "Princípios", author: "Ray Dalio", pages: 592, genre: "business" },
  { id: "mil-ao-milhao", title: "Do Mil ao Milhão", author: "Thiago Nigro", pages: 288, genre: "business" },
  { id: "zurich-axioms", title: "Os Axiomas de Zurique", author: "Max Gunther", pages: 208, genre: "business" },
  { id: "48-laws-power", title: "As 48 Leis do Poder", author: "Robert Greene", pages: 452, genre: "business" },

  // History / Non-fiction
  { id: "sapiens", title: "Sapiens", author: "Yuval Noah Harari", pages: 443, genre: "history" },
  { id: "homo-deus", title: "Homo Deus", author: "Yuval Noah Harari", pages: 448, genre: "history" },
  { id: "21-lessons", title: "21 Lições para o Século 21", author: "Yuval Noah Harari", pages: 432, genre: "history" },
  { id: "why-nations-fail", title: "Por que as Nações Fracassam", author: "Daron Acemoglu & James Robinson", pages: 560, genre: "history" },
  { id: "guns-germs", title: "Armas, Germes e Aço", author: "Jared Diamond", pages: 480, genre: "history" },
  { id: "brief-history-time", title: "Uma Breve História do Tempo", author: "Stephen Hawking", pages: 256, genre: "history" },
  { id: "thinking-fast-slow", title: "Rápido e Devagar", author: "Daniel Kahneman", pages: 499, genre: "history" },
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
