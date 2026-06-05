// Localized landing pages targeting specific high-ROI keywords per market.
// Each entry is a unique-locale page (no hreflang alternates — the page exists
// only in that language). Add new keyword landings here; they're auto-wired
// into the routing (App.tsx) and the sitemap (scripts/generate-sitemap.ts).

export interface Faq {
  q: string;
  a: string;
}

export interface LocalizedLandingConfig {
  /** URL slug under the language prefix (e.g. "jishuushitsu" -> /ja/jishuushitsu). */
  slug: string;
  /** Language code (must match LANGUAGES in i18nRoutes.ts). */
  lang: string;
  /** Target keyword — also the H1. */
  keyword: string;
  /** SEO title (≤60 chars ideal). */
  title: string;
  /** SEO description (≤160 chars ideal). */
  description: string;
  /** Hero subtitle (1-2 sentences under the H1). */
  intro: string;
  /** 3-5 short benefit bullets. */
  bullets: string[];
  /** Longer prose block explaining the concept for that market. */
  body: string;
  /** Primary CTA label. */
  ctaPrimary: string;
  /** Secondary CTA label. */
  ctaSecondary: string;
  /** "Why TimeZoni" section heading. */
  whyHeading: string;
  /** FAQ section heading. */
  faqHeading: string;
  /** 4-6 FAQs — also emitted as FAQPage JSON-LD. */
  faqs: Faq[];
}

export const LOCALIZED_LANDINGS: LocalizedLandingConfig[] = [
  // ── JP ────────────────────────────────────────────────────────────
  {
    slug: "jishuushitsu",
    lang: "ja-JP",
    keyword: "オンライン自習室",
    title: "オンライン自習室 — TimeZoniで一緒に勉強",
    description: "無料のオンライン自習室。仲間と一緒に勉強して集中力アップ。ポモドーロタイマー、目標管理、環境音つき。今すぐ参加。",
    intro: "誰かと一緒なら、集中は続く。世界中の学習者と同じ自習室で勉強できる無料サービス。",
    bullets: [
      "リアルタイムで仲間と一緒に勉強",
      "ポモドーロタイマーで集中をキープ",
      "学習時間と目標を自動で記録",
      "雨音・カフェ音など環境音を内蔵",
      "完全無料で今すぐ始められる",
    ],
    body: "TimeZoniのオンライン自習室は、図書館やカフェのような「誰かが見ている」感覚をオンラインで再現します。入室するだけで集中モードに入り、ポモドーロタイマーが自然なリズムを作ります。勉強時間は自動で記録され、毎日の積み重ねがグラフで可視化されるので、続けるほどモチベーションが上がります。",
    ctaPrimary: "無料で自習室に入る",
    ctaSecondary: "ログイン",
    whyHeading: "なぜTimeZoniが選ばれるのか",
    faqHeading: "よくある質問",
    faqs: [
      { q: "オンライン自習室は本当に無料ですか？", a: "はい。アカウント作成も自習室への参加も完全に無料です。" },
      { q: "カメラやマイクは必要ですか？", a: "いいえ。カメラもマイクも一切不要です。気軽に参加できます。" },
      { q: "ポモドーロタイマーは使えますか？", a: "はい。25分集中＋5分休憩などのポモドーロが内蔵されています。" },
      { q: "勉強時間は記録されますか？", a: "自動で記録され、日別・週別・月別でグラフ表示されます。" },
      { q: "スマホからでも使えますか？", a: "PC・スマホ・タブレットすべてブラウザで動作します。" },
    ],
  },
  {
    slug: "benkyou-timer",
    lang: "ja-JP",
    keyword: "勉強タイマー",
    title: "勉強タイマー — ポモドーロと自習室を無料で",
    description: "集中が続く勉強タイマー。ポモドーロ、学習記録、目標管理、環境音、オンライン自習室を1つに。無料で今すぐ始められます。",
    intro: "シンプルな勉強タイマーから本格的な学習管理まで。あなたの集中を最大化するすべての機能を1つに。",
    bullets: [
      "ポモドーロ（25分＋5分）に完全対応",
      "学習時間を科目・目標ごとに自動記録",
      "雨・カフェ・焚き火など環境音を再生",
      "オンライン自習室で仲間と一緒に",
      "ダークモード・ブラウザだけで動作",
    ],
    body: "勉強タイマーは「測る」だけでは続きません。TimeZoniはタイマーに加えて、毎日の学習時間グラフ、目標の進捗、連続記録（ストリーク）、達成バッジを組み合わせて、勉強を続ける仕組みそのものを作ります。テスト勉強、資格、受験、資格試験のすべてに使えます。",
    ctaPrimary: "勉強タイマーを使う",
    ctaSecondary: "ログイン",
    whyHeading: "ただのタイマーではない",
    faqHeading: "よくある質問",
    faqs: [
      { q: "ポモドーロの時間は変更できますか？", a: "はい。25/5分の標準だけでなく、自由に時間を設定できます。" },
      { q: "アプリのインストールは必要ですか？", a: "不要です。ブラウザから直接使えます。" },
      { q: "学習データはバックアップされますか？", a: "クラウドに自動保存されるので、どの端末からでも続きを確認できます。" },
      { q: "無料プランで何ができますか？", a: "タイマー、学習記録、目標、自習室入室など主要機能を無料で使えます。" },
      { q: "通知音はカスタマイズできますか？", a: "はい。複数の通知音から選択でき、ミュートも可能です。" },
    ],
  },
  // ── KR ────────────────────────────────────────────────────────────
  {
    slug: "study-with-me",
    lang: "ko-KR",
    keyword: "스터디 윗미",
    title: "스터디 윗미 — 함께 공부하는 무료 온라인 스터디룸",
    description: "전 세계 학습자와 함께 공부하는 스터디 윗미 플랫폼. 뽀모도로 타이머, 공부 기록, 목표 관리, 백색소음 모두 무료.",
    intro: "혼자보다 같이. 카메라 없이도 진짜 도서관처럼 집중되는 온라인 스터디룸.",
    bullets: [
      "실시간으로 다른 사람과 함께 공부",
      "뽀모도로 타이머로 집중 유지",
      "공부 시간 자동 기록 및 통계",
      "백색소음・카페 사운드 내장",
      "100% 무료로 지금 시작",
    ],
    body: "스터디 윗미는 단순한 영상 공유가 아닙니다. TimeZoni의 스터디룸은 입장하는 순간 집중 모드로 전환되고, 함께 있는 사람들의 활동이 실시간으로 보입니다. 뽀모도로 타이머가 리듬을 만들고, 매일의 공부 시간이 그래프로 누적되며, 연속 출석(스트릭)이 동기부여를 유지시켜 줍니다.",
    ctaPrimary: "무료로 스터디룸 입장",
    ctaSecondary: "로그인",
    whyHeading: "왜 TimeZoni인가",
    faqHeading: "자주 묻는 질문",
    faqs: [
      { q: "스터디 윗미는 무료인가요?", a: "네. 가입과 스터디룸 입장 모두 완전히 무료입니다." },
      { q: "카메라를 켜야 하나요?", a: "아니요. 카메라도 마이크도 필요 없습니다." },
      { q: "친구와 비공개 스터디룸을 만들 수 있나요?", a: "네. 초대 코드로 친구만 입장할 수 있는 비공개룸 생성이 가능합니다." },
      { q: "공부 시간은 어떻게 기록되나요?", a: "자동으로 일・주・월별 그래프와 누적 시간이 저장됩니다." },
      { q: "모바일에서도 사용 가능한가요?", a: "PC, 태블릿, 모바일 모두 브라우저에서 바로 사용할 수 있습니다." },
    ],
  },
  {
    slug: "gongbu-timer",
    lang: "ko-KR",
    keyword: "공부 타이머",
    title: "공부 타이머 — 뽀모도로 + 스터디룸 무료",
    description: "공부 타이머, 뽀모도로, 공부 시간 기록, 목표 관리, 백색소음, 스터디룸까지 하나로. 무료로 지금 시작하세요.",
    intro: "측정만 하는 타이머는 오래 못 갑니다. TimeZoni는 공부 습관 자체를 만들어 줍니다.",
    bullets: [
      "뽀모도로 25분/5분 자동 사이클",
      "과목별・목표별 공부 시간 기록",
      "백색소음, 빗소리, 카페 소리",
      "온라인 스터디룸 입장 가능",
      "다크모드, 설치 없이 브라우저로",
    ],
    body: "공부 타이머는 단순합니다. 하지만 매일 30분 더 공부하게 만드는 건 타이머가 아니라 시스템입니다. TimeZoni는 뽀모도로 타이머, 일일 목표, 연속 출석 스트릭, 성취 배지, 통계 그래프를 결합해서 스스로 공부하고 싶어지는 환경을 만듭니다.",
    ctaPrimary: "공부 타이머 시작",
    ctaSecondary: "로그인",
    whyHeading: "단순한 타이머가 아닙니다",
    faqHeading: "자주 묻는 질문",
    faqs: [
      { q: "뽀모도로 시간을 변경할 수 있나요?", a: "네. 기본 25/5분 외에 원하는 시간으로 자유롭게 설정할 수 있습니다." },
      { q: "앱을 설치해야 하나요?", a: "아니요. 브라우저에서 바로 사용할 수 있습니다." },
      { q: "공부 기록은 백업되나요?", a: "클라우드에 자동 저장되어 어느 기기에서든 이어서 확인할 수 있습니다." },
      { q: "무료 플랜으로 어디까지 가능한가요?", a: "타이머, 공부 기록, 목표, 스터디룸 입장 등 주요 기능을 무료로 사용할 수 있습니다." },
      { q: "알림 소리를 바꿀 수 있나요?", a: "네. 여러 알림음 중에서 선택하거나 음소거할 수 있습니다." },
    ],
  },
  // ── EN (US/UK) ────────────────────────────────────────────────────
  {
    slug: "study-timer-online",
    lang: "en-US",
    keyword: "Online Study Timer",
    title: "Online Study Timer — Free Pomodoro + Study Rooms",
    description: "Free online study timer with Pomodoro, study rooms, focus stats and ambient sounds. No install. Start studying with focus in seconds.",
    intro: "A free online study timer built for real focus — Pomodoro cycles, study rooms, ambient sounds and automatic tracking, all in your browser.",
    bullets: [
      "Pomodoro 25/5 with fully customizable cycles",
      "Track study time per subject and goal automatically",
      "Join virtual study rooms with learners worldwide",
      "Rain, café and lo-fi ambient sounds built in",
      "Free forever — no download, works on any device",
    ],
    body: "Most online study timers stop at counting minutes. TimeZoni pairs a clean Pomodoro timer with study streaks, daily goals, focus statistics and live study rooms so you actually keep going. Whether you're prepping for exams, learning to code or grinding through a thesis, the system rewards consistency — not just minutes logged.",
    ctaPrimary: "Start studying free",
    ctaSecondary: "Log in",
    whyHeading: "Why students choose TimeZoni",
    faqHeading: "Frequently asked questions",
    faqs: [
      { q: "Is the online study timer really free?", a: "Yes. The Pomodoro timer, study tracking and study rooms are all free, with no time limits." },
      { q: "Do I need to install anything?", a: "No. TimeZoni runs entirely in your browser on desktop, tablet or phone." },
      { q: "Can I change the Pomodoro intervals?", a: "Yes — pick the classic 25/5, 50/10, or any custom split that fits how you study." },
      { q: "Is my study data saved across devices?", a: "Yes. With a free account your sessions, goals and streaks sync everywhere." },
      { q: "Does it work for ADHD or long study blocks?", a: "Both. Use short Pomodoros for focus issues, or extended cycles for deep work." },
    ],
  },
  {
    slug: "pomodoro-study-timer",
    lang: "en-US",
    keyword: "Pomodoro Study Timer",
    title: "Pomodoro Study Timer — Free Online Focus Timer",
    description: "The Pomodoro study timer that helps you actually finish. Customizable cycles, stats, streaks and study rooms — 100% free in your browser.",
    intro: "The Pomodoro technique, upgraded. Focus cycles, streaks, study stats and live rooms — without ads or installs.",
    bullets: [
      "Classic 25/5 Pomodoro plus custom intervals",
      "Daily, weekly and monthly focus statistics",
      "Streaks and achievements that keep you coming back",
      "Live study rooms for accountability",
      "Works offline-friendly in any modern browser",
    ],
    body: "A Pomodoro timer is only useful if you actually use it daily. TimeZoni turns the Pomodoro technique into a habit loop: each completed cycle feeds your streak, fills your tree, unlocks achievements and counts toward your weekly goals. That's why students stick with it where other timers get closed after a week.",
    ctaPrimary: "Start a Pomodoro",
    ctaSecondary: "Log in",
    whyHeading: "Pomodoro, but it sticks",
    faqHeading: "Frequently asked questions",
    faqs: [
      { q: "What is the Pomodoro technique?", a: "A focus method: 25 minutes of deep work, 5 minutes of rest, repeated. After four cycles, take a longer break." },
      { q: "Can I customize the intervals?", a: "Yes — set any work/break length you want, or pick from common presets." },
      { q: "Does it track total study time?", a: "Yes. Every completed Pomodoro adds to your daily, weekly and monthly totals." },
      { q: "Will I get notified when a cycle ends?", a: "Yes. Browser notifications and selectable sounds alert you on breaks." },
      { q: "Is there a free plan?", a: "Yes. The Pomodoro timer and core tracking are free forever." },
    ],
  },
  // ── ES ────────────────────────────────────────────────────────────
  {
    slug: "sala-de-estudio-online",
    lang: "es-ES",
    keyword: "Sala de Estudio Online",
    title: "Sala de Estudio Online — Estudia acompañado gratis",
    description: "Sala de estudio online gratis con temporizador Pomodoro, registro de horas, metas y sonidos ambiente. Únete y estudia con foco.",
    intro: "Una sala de estudio online donde la concentración se contagia. Estudia junto a otras personas, sin cámara, totalmente gratis.",
    bullets: [
      "Estudia en directo con personas de todo el mundo",
      "Temporizador Pomodoro integrado",
      "Registro automático de horas de estudio",
      "Sonidos ambiente: lluvia, cafetería, lo-fi",
      "100% gratis, sin instalar nada",
    ],
    body: "Las salas de estudio online de TimeZoni recrean la sensación de estar en una biblioteca: entras, ves a otros estudiando y tu cerebro se pone en modo concentración. El temporizador Pomodoro marca el ritmo, tus horas quedan registradas y los gráficos diarios y semanales convierten el estudio en un hábito visible.",
    ctaPrimary: "Entrar a una sala gratis",
    ctaSecondary: "Iniciar sesión",
    whyHeading: "Por qué funciona estudiar acompañado",
    faqHeading: "Preguntas frecuentes",
    faqs: [
      { q: "¿La sala de estudio online es gratis?", a: "Sí. Crear cuenta y entrar en salas es completamente gratis." },
      { q: "¿Necesito cámara o micrófono?", a: "No. Puedes estudiar de forma totalmente anónima." },
      { q: "¿Puedo crear una sala privada con amigos?", a: "Sí. Genera un código de invitación y solo entrarán quienes lo tengan." },
      { q: "¿Se guardan mis horas de estudio?", a: "Sí, automáticamente, y puedes verlas por día, semana y mes." },
      { q: "¿Funciona en el móvil?", a: "Sí. Funciona en ordenador, tablet y móvil desde el navegador." },
    ],
  },
  {
    slug: "temporizador-de-estudio",
    lang: "es-ES",
    keyword: "Temporizador de Estudio",
    title: "Temporizador de Estudio — Pomodoro y salas gratis",
    description: "Temporizador de estudio gratis con técnica Pomodoro, registro de horas, metas, sonidos ambiente y salas de estudio online.",
    intro: "Más que contar minutos: un sistema completo para estudiar mejor y con constancia.",
    bullets: [
      "Pomodoro 25/5 o tiempos personalizados",
      "Estadísticas diarias, semanales y mensuales",
      "Rachas y logros para mantener la motivación",
      "Salas de estudio online integradas",
      "Sin instalación, en cualquier navegador",
    ],
    body: "Un temporizador de estudio sirve de poco si lo abandonas en una semana. TimeZoni convierte cada sesión en parte de una racha, un árbol que crece y unas metas diarias. Estudiantes de oposiciones, universidad y bachillerato lo usan para construir el hábito que las apps tradicionales no consiguen mantener.",
    ctaPrimary: "Empezar a estudiar gratis",
    ctaSecondary: "Iniciar sesión",
    whyHeading: "No es solo un temporizador",
    faqHeading: "Preguntas frecuentes",
    faqs: [
      { q: "¿Puedo cambiar los tiempos del Pomodoro?", a: "Sí. Usa los 25/5 clásicos o configura los intervalos que prefieras." },
      { q: "¿Tengo que instalar una app?", a: "No. Funciona directamente en el navegador." },
      { q: "¿Se sincronizan mis datos entre dispositivos?", a: "Sí. Tu progreso se guarda en la nube y se sincroniza automáticamente." },
      { q: "¿Qué incluye el plan gratuito?", a: "Temporizador, registro de horas, metas y acceso a salas de estudio." },
      { q: "¿Sirve para preparar oposiciones?", a: "Sí. Es ideal para sesiones largas con seguimiento por materias." },
    ],
  },
  // ── DE ────────────────────────────────────────────────────────────
  {
    slug: "lernzeit-timer",
    lang: "de-DE",
    keyword: "Lernzeit Timer",
    title: "Lernzeit Timer — Pomodoro & Lernräume kostenlos",
    description: "Kostenloser Lernzeit Timer mit Pomodoro-Technik, Lernstatistik, Zielen, Hintergrundgeräuschen und Online-Lernräumen. Direkt im Browser.",
    intro: "Ein Lernzeit Timer, der wirklich dranbleibt: Pomodoro, automatische Lernstatistik, Ziele und Streaks in einer App.",
    bullets: [
      "Pomodoro 25/5 oder eigene Intervalle",
      "Automatische Lernzeit-Erfassung pro Fach",
      "Tägliche, wöchentliche, monatliche Statistik",
      "Streaks und Erfolge gegen den inneren Schweinehund",
      "Komplett kostenlos im Browser",
    ],
    body: "Ein Lernzeit Timer alleine reicht nicht. TimeZoni kombiniert Pomodoro mit Tageszielen, Streaks, Erfolgen und Online-Lernräumen. So wird Lernen zur Gewohnheit – egal ob für Abitur, Studium oder Weiterbildung.",
    ctaPrimary: "Jetzt kostenlos starten",
    ctaSecondary: "Anmelden",
    whyHeading: "Warum TimeZoni funktioniert",
    faqHeading: "Häufige Fragen",
    faqs: [
      { q: "Ist der Lernzeit Timer wirklich kostenlos?", a: "Ja. Timer, Lernstatistik und Lernräume sind komplett kostenlos." },
      { q: "Muss ich eine App installieren?", a: "Nein. TimeZoni läuft direkt im Browser auf PC, Tablet und Handy." },
      { q: "Kann ich die Pomodoro-Zeiten ändern?", a: "Ja. Wähle 25/5, 50/10 oder eigene Intervalle." },
      { q: "Werden meine Daten synchronisiert?", a: "Ja, über alle Geräte hinweg mit einem kostenlosen Konto." },
      { q: "Eignet es sich für lange Lernphasen?", a: "Ja. Pomodoro hilft bei kurzen Sessions, längere Zyklen für Deep Work." },
    ],
  },
  {
    slug: "online-lernraum",
    lang: "de-DE",
    keyword: "Online Lernraum",
    title: "Online Lernraum — Gemeinsam lernen, kostenlos",
    description: "Online Lernraum, in dem du mit anderen gemeinsam lernst. Pomodoro, Lernstatistik, Hintergrundgeräusche, ohne Kamera, kostenlos.",
    intro: "Konzentration wird ansteckend: ein Online Lernraum, in dem du dich anderen Lernenden anschließt – ohne Kamera, ohne Mikrofon.",
    bullets: [
      "Live mit Lernenden weltweit lernen",
      "Integrierter Pomodoro-Timer",
      "Automatische Lernzeit-Erfassung",
      "Hintergrundgeräusche: Regen, Café, Lo-Fi",
      "Komplett kostenlos und ohne Installation",
    ],
    body: "Der Online Lernraum von TimeZoni fühlt sich an wie die Bib, nur dass du nicht raus musst. Du betrittst einen Raum, andere lernen mit dir, der Pomodoro-Timer hält den Rhythmus und deine Statistiken wachsen mit jeder Sitzung.",
    ctaPrimary: "Lernraum kostenlos beitreten",
    ctaSecondary: "Anmelden",
    whyHeading: "Warum gemeinsames Lernen wirkt",
    faqHeading: "Häufige Fragen",
    faqs: [
      { q: "Ist der Online Lernraum kostenlos?", a: "Ja. Konto und Lernräume sind komplett kostenlos." },
      { q: "Brauche ich eine Kamera?", a: "Nein. Du kannst völlig anonym lernen." },
      { q: "Kann ich private Räume mit Freunden erstellen?", a: "Ja, per Einladungscode." },
      { q: "Wird meine Lernzeit gespeichert?", a: "Ja, automatisch und sichtbar als Statistik." },
      { q: "Funktioniert es auf dem Smartphone?", a: "Ja. PC, Tablet und Smartphone werden unterstützt." },
    ],
  },
  // ── FR ────────────────────────────────────────────────────────────
  {
    slug: "minuteur-etude",
    lang: "fr-FR",
    keyword: "Minuteur d'Étude",
    title: "Minuteur d'Étude — Pomodoro et salles d'étude gratuits",
    description: "Minuteur d'étude gratuit avec technique Pomodoro, suivi du temps, objectifs, sons d'ambiance et salles d'étude en ligne.",
    intro: "Plus qu'un minuteur : un système complet pour étudier avec régularité et concentration.",
    bullets: [
      "Pomodoro 25/5 ou intervalles personnalisés",
      "Suivi automatique du temps d'étude par matière",
      "Statistiques journalières, hebdomadaires, mensuelles",
      "Salles d'étude en ligne intégrées",
      "100% gratuit, directement dans le navigateur",
    ],
    body: "Un minuteur d'étude n'est utile que si tu y reviens. TimeZoni transforme chaque session en série, en arbre qui pousse et en objectifs visibles. Étudiants en prépa, fac ou concours s'en servent pour construire l'habitude que les apps classiques n'arrivent pas à maintenir.",
    ctaPrimary: "Commencer gratuitement",
    ctaSecondary: "Se connecter",
    whyHeading: "Pourquoi ça marche vraiment",
    faqHeading: "Questions fréquentes",
    faqs: [
      { q: "Le minuteur d'étude est-il gratuit ?", a: "Oui, totalement, sans limite de durée." },
      { q: "Faut-il installer une application ?", a: "Non, tout fonctionne dans le navigateur." },
      { q: "Puis-je personnaliser le Pomodoro ?", a: "Oui, choisis tes propres intervalles travail / pause." },
      { q: "Mes données sont-elles synchronisées ?", a: "Oui, sur tous tes appareils avec un compte gratuit." },
      { q: "Est-ce adapté aux longues sessions ?", a: "Oui, Pomodoro court ou cycles longs au choix." },
    ],
  },
  // ── IT ────────────────────────────────────────────────────────────
  {
    slug: "timer-studio",
    lang: "it-IT",
    keyword: "Timer Studio",
    title: "Timer Studio — Pomodoro e aule virtuali gratis",
    description: "Timer studio gratuito con tecnica Pomodoro, registro delle ore, obiettivi, suoni ambientali e aule di studio online.",
    intro: "Più di un timer: un sistema completo per studiare con costanza e concentrazione.",
    bullets: [
      "Pomodoro 25/5 o intervalli personalizzati",
      "Registro automatico delle ore di studio",
      "Statistiche giornaliere, settimanali, mensili",
      "Aule di studio online integrate",
      "100% gratis, direttamente nel browser",
    ],
    body: "Un timer studio funziona solo se torni a usarlo ogni giorno. TimeZoni trasforma ogni sessione in una serie (streak), in un albero che cresce e in obiettivi visibili. Studenti universitari, liceali e di concorsi lo usano per costruire l'abitudine che le app tradizionali non riescono a mantenere.",
    ctaPrimary: "Inizia gratis",
    ctaSecondary: "Accedi",
    whyHeading: "Perché funziona davvero",
    faqHeading: "Domande frequenti",
    faqs: [
      { q: "Il timer studio è gratuito?", a: "Sì, completamente, senza limiti di tempo." },
      { q: "Devo installare un'app?", a: "No, funziona direttamente nel browser." },
      { q: "Posso personalizzare il Pomodoro?", a: "Sì, scegli gli intervalli che preferisci." },
      { q: "I miei dati sono sincronizzati?", a: "Sì, su tutti i dispositivi con un account gratuito." },
      { q: "Va bene per sessioni lunghe?", a: "Sì, Pomodoro brevi o cicli estesi a tua scelta." },
    ],
  },
  // ── RU ────────────────────────────────────────────────────────────
  {
    slug: "tajmer-uchyoby",
    lang: "ru-RU",
    keyword: "Таймер для Учёбы",
    title: "Таймер для Учёбы — Помодоро и комнаты бесплатно",
    description: "Бесплатный таймер для учёбы с техникой Помодоро, учётом времени, целями, фоновыми звуками и онлайн-комнатами для совместной учёбы.",
    intro: "Не просто таймер, а целая система, чтобы учиться регулярно и сосредоточенно.",
    bullets: [
      "Помодоро 25/5 или свои интервалы",
      "Автоматический учёт времени по предметам",
      "Статистика за день, неделю и месяц",
      "Онлайн-комнаты для совместной учёбы",
      "Полностью бесплатно прямо в браузере",
    ],
    body: "Таймер для учёбы работает, только если им пользуются каждый день. TimeZoni превращает каждую сессию в серию, в растущее дерево и в видимые цели. Школьники, студенты и те, кто готовится к экзаменам, используют его, чтобы выработать привычку учиться без перегораний.",
    ctaPrimary: "Начать учиться бесплатно",
    ctaSecondary: "Войти",
    whyHeading: "Почему это действительно работает",
    faqHeading: "Частые вопросы",
    faqs: [
      { q: "Таймер для учёбы действительно бесплатный?", a: "Да, без ограничений по времени." },
      { q: "Нужно ли что-то устанавливать?", a: "Нет, всё работает в браузере." },
      { q: "Можно ли изменять интервалы Помодоро?", a: "Да, любые рабочие и перерывные интервалы." },
      { q: "Сохраняются ли данные между устройствами?", a: "Да, с бесплатным аккаунтом данные синхронизируются." },
      { q: "Подходит для долгих сессий?", a: "Да, можно использовать как короткие Помодоро, так и длинные циклы." },
    ],
  },
];

export function findLandingBySlug(lang: string, slug: string): LocalizedLandingConfig | undefined {
  return LOCALIZED_LANDINGS.find((l) => l.lang === lang && l.slug === slug);
}
