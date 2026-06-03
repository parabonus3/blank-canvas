// Per-language SEO metadata for public, indexable pages.
// Keep titles ≤60 chars and descriptions ≤160 chars.
// Keywords are tuned to the strongest low-difficulty terms in each market
// (see .lovable/plan.md for Semrush data).

export type SeoPageKey = "landing" | "pricing" | "auth";

export interface SeoCopy {
  title: string;
  description: string;
}

type SeoMap = Record<SeoPageKey, Record<string, SeoCopy>>;

export const SEO_COPY: SeoMap = {
  landing: {
    "pt-BR": {
      title: "TimeZoni — Cronômetro de estudo, Pomodoro e salas online",
      description: "App grátis de foco: cronômetro de estudo, timer Pomodoro, salas de estudo online, metas, conquistas e sons ambientes para estudar melhor.",
    },
    "en-US": {
      title: "TimeZoni — Study with me app, virtual study rooms & Pomodoro",
      description: "Free focus app: study with me rooms, Pomodoro timer, goals, achievements and ambient sounds. Study together online and stay motivated.",
    },
    "es-ES": {
      title: "TimeZoni — App para estudiar con temporizador Pomodoro y salas",
      description: "App gratis para estudiar: temporizador Pomodoro, salas de estudio online, técnica Pomodoro, metas y sonidos ambientes para concentrarte.",
    },
    "fr-FR": {
      title: "TimeZoni — Minuteur Pomodoro, salles d'étude et application concentration",
      description: "Application concentration gratuite : minuteur Pomodoro, salles d'étude en ligne, objectifs et sons d'ambiance pour mieux étudier.",
    },
    "de-DE": {
      title: "TimeZoni — Fokus App, Pomodoro Timer & virtueller Lernraum",
      description: "Kostenlose Fokus App mit Pomodoro Timer, virtuellen Lernräumen, Zielen und Hintergrundgeräuschen. Lerne online gemeinsam und bleib konzentriert.",
    },
    "it-IT": {
      title: "TimeZoni — Timer Pomodoro, sala studio online e app concentrazione",
      description: "App gratis per studiare: timer Pomodoro, sala studio online, app concentrazione, obiettivi e suoni ambientali per studiare meglio.",
    },
    "ja-JP": {
      title: "TimeZoni — オンライン自習室・勉強タイマー・ポモドーロアプリ",
      description: "無料の勉強アプリ。オンライン自習室、ポモドーロタイマー、勉強タイマー、目標、環境音で集中して勉強できます。",
    },
    "ko-KR": {
      title: "TimeZoni — 스터디 윗미, 공부 타이머, 뽀모도로 앱",
      description: "무료 집중 앱. 온라인 스터디룸, 공부 타이머, 뽀모도로 타이머, 목표 관리, 백색소음으로 함께 공부하세요.",
    },
    "zh-CN": {
      title: "TimeZoni — 番茄钟、学习计时器和在线自习室",
      description: "免费学习软件：番茄钟、学习计时器、在线自习室、目标管理和白噪音，帮助你专注高效学习。",
    },
    "ru-RU": {
      title: "TimeZoni — Помодоро таймер, комната для учёбы онлайн",
      description: "Бесплатное приложение для концентрации: помодоро таймер, онлайн-комнаты для учёбы, цели и фоновые звуки для эффективной учёбы.",
    },
    "ar-SA": {
      title: "TimeZoni — تطبيق التركيز وغرف الدراسة وتايمر بومودورو",
      description: "تطبيق مجاني للتركيز: تايمر بومودورو، غرف دراسة جماعية أونلاين، أهداف وأصوات محيطة لتذاكر بتركيز أفضل.",
    },
    "id-ID": {
      title: "TimeZoni — Aplikasi fokus, Pomodoro & ruang belajar online",
      description: "Aplikasi gratis untuk fokus belajar: timer Pomodoro, ruang belajar online, target, dan suara latar agar belajar lebih produktif.",
    },
  },
  pricing: {
    "pt-BR": { title: "Planos e preços — TimeZoni", description: "Compare Free, Pro e Premium do TimeZoni. Cronômetro, Pomodoro, salas online e mais. Comece grátis." },
    "en-US": { title: "Pricing & plans — TimeZoni", description: "Compare Free, Pro and Premium plans. Pomodoro, study rooms, goals and ambient sounds. Start free." },
    "es-ES": { title: "Planes y precios — TimeZoni", description: "Compara los planes Free, Pro y Premium. Pomodoro, salas de estudio online y metas. Empieza gratis." },
    "fr-FR": { title: "Tarifs et plans — TimeZoni", description: "Comparez Free, Pro et Premium. Pomodoro, salles d'étude en ligne et objectifs. Commencez gratuitement." },
    "de-DE": { title: "Preise & Pläne — TimeZoni", description: "Vergleiche Free, Pro und Premium. Pomodoro, Lernräume online und Ziele. Kostenlos starten." },
    "it-IT": { title: "Prezzi e piani — TimeZoni", description: "Confronta i piani Free, Pro e Premium. Pomodoro, sala studio online e obiettivi. Inizia gratis." },
    "ja-JP": { title: "料金プラン — TimeZoni", description: "Free・Pro・Premiumプランを比較。ポモドーロ、オンライン自習室、目標管理。無料で始められます。" },
    "ko-KR": { title: "요금제 — TimeZoni", description: "Free, Pro, Premium 요금제 비교. 뽀모도로, 온라인 스터디룸, 목표 관리. 무료로 시작하세요." },
    "zh-CN": { title: "套餐与价格 — TimeZoni", description: "对比 Free、Pro 和 Premium 套餐。番茄钟、在线自习室和目标管理。免费开始使用。" },
    "ru-RU": { title: "Тарифы — TimeZoni", description: "Сравните тарифы Free, Pro и Premium. Помодоро, комнаты для учёбы онлайн и цели. Начните бесплатно." },
    "ar-SA": { title: "الأسعار والخطط — TimeZoni", description: "قارن خطط Free و Pro و Premium. بومودورو وغرف دراسة أونلاين وأهداف. ابدأ مجاناً." },
    "id-ID": { title: "Harga & paket — TimeZoni", description: "Bandingkan paket Free, Pro, dan Premium. Pomodoro, ruang belajar online, dan target. Mulai gratis." },
  },
  auth: {
    "pt-BR": { title: "Entrar ou criar conta — TimeZoni", description: "Acesse sua conta TimeZoni para usar cronômetro, Pomodoro, salas de estudo online e acompanhar seu progresso." },
    "en-US": { title: "Sign in or create an account — TimeZoni", description: "Sign in to TimeZoni to use the Pomodoro timer, study rooms and track your focus progress." },
    "es-ES": { title: "Iniciar sesión o crear cuenta — TimeZoni", description: "Accede a tu cuenta TimeZoni para usar el temporizador Pomodoro, salas de estudio y ver tu progreso." },
    "fr-FR": { title: "Connexion ou inscription — TimeZoni", description: "Connectez-vous à TimeZoni pour utiliser le minuteur Pomodoro, les salles d'étude et suivre votre progression." },
    "de-DE": { title: "Anmelden oder Konto erstellen — TimeZoni", description: "Melde dich bei TimeZoni an, um den Pomodoro Timer, Lernräume und deinen Fortschritt zu nutzen." },
    "it-IT": { title: "Accedi o crea un account — TimeZoni", description: "Accedi a TimeZoni per usare il timer Pomodoro, le sale studio online e monitorare i tuoi progressi." },
    "ja-JP": { title: "ログインまたは新規登録 — TimeZoni", description: "TimeZoniにログインしてポモドーロタイマー、自習室、学習記録を活用しましょう。" },
    "ko-KR": { title: "로그인 또는 회원가입 — TimeZoni", description: "TimeZoni에 로그인하여 뽀모도로 타이머, 스터디룸, 학습 기록을 이용하세요." },
    "zh-CN": { title: "登录或注册 — TimeZoni", description: "登录 TimeZoni 使用番茄钟、在线自习室并追踪学习进度。" },
    "ru-RU": { title: "Вход или регистрация — TimeZoni", description: "Войдите в TimeZoni, чтобы использовать помодоро таймер, комнаты для учёбы и отслеживать прогресс." },
    "ar-SA": { title: "تسجيل الدخول أو إنشاء حساب — TimeZoni", description: "سجّل دخولك إلى TimeZoni لاستخدام تايمر بومودورو وغرف الدراسة وتتبّع تقدمك." },
    "id-ID": { title: "Masuk atau buat akun — TimeZoni", description: "Masuk ke TimeZoni untuk menggunakan timer Pomodoro, ruang belajar, dan pantau progresmu." },
  },
};

export function getSeoCopy(page: SeoPageKey, langCode: string): SeoCopy {
  return SEO_COPY[page][langCode] ?? SEO_COPY[page]["pt-BR"];
}
