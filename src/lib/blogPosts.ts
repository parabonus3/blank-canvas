// Native blog posts per locale for content marketing & long-tail SEO.
// Each post is locale-only (no hreflang alternates) — written natively
// for its market, not translated. Article JSON-LD emitted automatically.

export interface BlogSection {
  /** Section H2 heading. */
  heading: string;
  /** 1-3 paragraphs of body content. */
  paragraphs: string[];
}

export interface BlogPostConfig {
  /** URL slug under /<lang>/blog/<slug>. */
  slug: string;
  /** Language code (must match LANGUAGES in i18nRoutes.ts). */
  lang: string;
  /** Article title — also the H1. */
  title: string;
  /** SEO meta title (≤60 chars ideal). */
  seoTitle: string;
  /** SEO meta description (≤160 chars ideal). */
  description: string;
  /** Hero subtitle / lede. */
  lede: string;
  /** Author display name. */
  author: string;
  /** ISO date (YYYY-MM-DD). */
  datePublished: string;
  /** Estimated read time, localized (e.g. "5分で読める"). */
  readTime: string;
  /** Body sections. */
  sections: BlogSection[];
  /** CTA heading at the bottom. */
  ctaHeading: string;
  /** CTA description. */
  ctaBody: string;
  /** CTA button label. */
  ctaLabel: string;
  /** Related links shown below the article (optional). */
  related?: { label: string; href: string }[];
}

export const BLOG_POSTS: BlogPostConfig[] = [
  // ── JP ────────────────────────────────────────────────────────────
  {
    slug: "online-jishuushitsu-tsukaikata",
    lang: "ja-JP",
    title: "オンライン自習室の使い方 — 集中力を3倍にする方法",
    seoTitle: "オンライン自習室の使い方｜集中力を3倍にする5つのコツ",
    description: "オンライン自習室で集中力を最大化する具体的な方法。ポモドーロ、環境音、ルーティン作りまで、今日から使える実践ガイド。",
    lede: "「家だと集中できない」を解決する、オンライン自習室の正しい使い方を解説します。",
    author: "TimeZoni編集部",
    datePublished: "2026-06-05",
    readTime: "5分で読める",
    sections: [
      {
        heading: "オンライン自習室とは",
        paragraphs: [
          "オンライン自習室は、世界中の学習者と同じ仮想空間で勉強できるサービスです。カメラやマイクは不要で、ただ「誰かが一緒に勉強している」という感覚だけで集中力が大きく変わります。",
          "図書館やカフェで勉強がはかどる理由と同じ「社会的促進効果」を、自宅にいながら得られるのが最大の魅力です。",
        ],
      },
      {
        heading: "集中力を3倍にする5つのコツ",
        paragraphs: [
          "1. 入室前に「今日やること」を1行で書く。これだけで開始10秒の迷いが消えます。",
          "2. ポモドーロタイマー（25分集中＋5分休憩）を必ず使う。脳の集中サイクルに合わせた科学的な方法です。",
          "3. 環境音（雨音・カフェ音など）を流す。静かすぎる部屋より集中が続きます。",
          "4. スマホは別の部屋に置く。通知が見えるだけで集中力は40%落ちます。",
          "5. 毎日同じ時間に入室する。脳が「勉強する時間」を覚えます。",
        ],
      },
      {
        heading: "TimeZoniならすべてが1つに",
        paragraphs: [
          "TimeZoniのオンライン自習室は、ポモドーロタイマー・環境音・学習記録・目標管理がすべて統合されています。アカウントを作って入室するだけで、上の5つのコツが自動で実践できる設計です。",
          "完全無料で始められるので、まずは1回のポモドーロ（25分）から試してみてください。",
        ],
      },
    ],
    ctaHeading: "今すぐオンライン自習室に入る",
    ctaBody: "登録は30秒。クレジットカード不要、完全無料で今日から使えます。",
    ctaLabel: "無料で始める",
    related: [
      { label: "オンライン自習室について詳しく", href: "/ja/jishuushitsu" },
      { label: "勉強タイマーを使う", href: "/ja/benkyou-timer" },
    ],
  },

  // ── KR ────────────────────────────────────────────────────────────
  {
    slug: "study-with-me-gongbu-supgwan",
    lang: "ko-KR",
    title: "스터디 윗미로 공부 습관 만들기 — 30일 챌린지 가이드",
    seoTitle: "스터디 윗미로 공부 습관 만들기｜30일 챌린지 완벽 가이드",
    description: "스터디 윗미를 활용해 매일 공부하는 습관을 30일 만에 만드는 실전 방법. 뽀모도로, 환경음, 루틴 설계까지 한 번에.",
    lede: "혼자서는 공부 습관이 안 만들어진다면, 스터디 윗미로 30일이면 충분합니다.",
    author: "TimeZoni 편집팀",
    datePublished: "2026-06-05",
    readTime: "5분 소요",
    sections: [
      {
        heading: "스터디 윗미가 효과적인 이유",
        paragraphs: [
          "스터디 윗미(Study With Me)는 다른 사람과 같은 가상 공간에서 함께 공부하는 방식입니다. 카메라나 마이크 없이도 \"누군가와 같이 공부한다\"는 감각만으로 집중력이 크게 올라갑니다.",
          "도서관에서 공부가 잘 되는 이유와 똑같은 \"사회적 촉진 효과\"를 집에서도 얻을 수 있다는 점이 가장 큰 장점입니다.",
        ],
      },
      {
        heading: "30일 챌린지 — 매일 실천할 4가지",
        paragraphs: [
          "1. 매일 같은 시간에 입실하기. 뇌가 \"공부하는 시간\"으로 인식하게 만듭니다.",
          "2. 뽀모도로 타이머(25분 집중 + 5분 휴식)를 무조건 사용하기. 뇌의 집중 주기에 맞춘 검증된 방법입니다.",
          "3. 입실 전에 오늘 할 일을 한 줄로 적기. 시작할 때 10초 망설임이 사라집니다.",
          "4. 스마트폰은 다른 방에 두기. 알림이 보이는 것만으로도 집중력이 40% 떨어집니다.",
        ],
      },
      {
        heading: "TimeZoni로 모든 걸 한 번에",
        paragraphs: [
          "TimeZoni의 스터디 윗미는 뽀모도로 타이머, 환경음, 공부 시간 기록, 목표 관리가 모두 통합되어 있습니다. 가입하고 입실하면 위 4가지가 자동으로 실천되는 구조입니다.",
          "완전 무료로 시작할 수 있으니, 일단 뽀모도로 한 번(25분)부터 시도해보세요. 30일 후엔 습관이 됩니다.",
        ],
      },
    ],
    ctaHeading: "지금 바로 스터디 윗미 시작하기",
    ctaBody: "30초면 가입 완료. 신용카드 불필요, 오늘부터 무료로 사용 가능.",
    ctaLabel: "무료로 시작하기",
    related: [
      { label: "스터디 윗미 자세히 보기", href: "/ko/study-with-me" },
      { label: "공부 타이머 사용하기", href: "/ko/gongbu-timer" },
    ],
  },
];

export function findBlogPost(lang: string, slug: string): BlogPostConfig | undefined {
  return BLOG_POSTS.find((p) => p.lang === lang && p.slug === slug);
}
