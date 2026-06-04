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
];

export function findLandingBySlug(lang: string, slug: string): LocalizedLandingConfig | undefined {
  return LOCALIZED_LANDINGS.find((l) => l.lang === lang && l.slug === slug);
}
