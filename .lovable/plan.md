
# Templates de desafios de sala por categoria

## Contexto e decisão de arquitetura

Hoje o `CreateChallengeDialog` mostra só campos crus (emoji, título, período, minutos, duração). O usuário precisa imaginar tudo do zero, o que funciona pra oração mas não ajuda quem quer "ler 20 páginas/dia" ou "assistir 2 aulas".

**Decisão importante:** desafios de sala são contabilizados pelo **tempo cronometrado dentro da sala** (é a única coisa que o sistema mede objetivamente — não dá pra auditar "20 páginas lidas"). Então os templates vão **traduzir cada tipo de objetivo em uma meta de tempo realista** (ex: "Ler 20 páginas/dia" → 25 min/dia), e o título/descrição comunicam a intenção para os membros. Isso mantém integridade com `room_challenge_progress`, `time_entries` e os jobs de push já existentes — zero migração de schema.

Quem quiser número exato continua usando os campos avançados (sempre visíveis abaixo da galeria).

---

## 1. Estrutura de templates

Novo arquivo `src/lib/roomChallengeTemplates.ts`:

```ts
export type ChallengeCategory =
  | "study" | "reading" | "spirituality" | "work"
  | "classes" | "language" | "fitness" | "creative"
  | "mindfulness" | "custom";

export interface ChallengeTemplate {
  id: string;                 // ex "reading_pages_daily"
  category: ChallengeCategory;
  emoji: string;
  i18nKey: string;            // rooms.challenges.templates.items.{key}.{title|desc}
  period: "daily" | "weekly";
  targetMinutes: number;      // tempo equivalente sugerido
  durationDays: number | null;
  hintKey?: string;           // dica curta abaixo do título ("≈ 20 páginas")
}
```

10 categorias × 4–6 templates ≈ **~50 templates curados**. Exemplos:

- **reading**: ler X páginas/dia (25 min), terminar 1 livro/semana (210 min/sem), revisão diária (15 min), leitura técnica (45 min)
- **spirituality**: oração diária (20 min), leitura bíblica (15 min), jejum de tela (30 min), meditação cristã (10 min)
- **study**: revisão pomodoro (50 min), prova em X dias (90 min), flashcards (20 min), resumos (30 min)
- **classes**: assistir 1 aula/dia (45 min), maratona semanal (180 min/sem), reassistir + anotar (60 min)
- **language**: vocabulário (15 min), conversação (25 min), imersão diária (30 min), gramática (20 min)
- **work**: deep work (90 min), inbox-zero (20 min), side project (60 min), aprendizado da função (45 min)
- **fitness**: treino diário (45 min), alongamento (10 min), corrida (30 min)
- **creative**: escrita (30 min), prática musical (40 min), desenho (25 min)
- **mindfulness**: meditação (10 min), respiração consciente (5 min), gratidão (10 min)
- **custom**: 1 template em branco que abre só os campos crus

Toda categoria tem ícone Lucide (igual `goalTemplates.ts`) e cor sutil pra diferenciar visualmente.

---

## 2. Redesenho do `CreateChallengeDialog`

Fluxo em **2 passos** no mesmo dialog (sem trocar de tela):

```text
┌────────────────────────────────────────┐
│ Novo desafio                            │
│                                         │
│ [📚 Leitura] [🙏 Espiritual] [💼 Trab.] │  ← tabs com scroll-x mobile
│ [🎓 Aulas] [🗣 Idiomas] [🏃 Fitness] … │
│                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │📖 20 pgs│ │📕 1 livro│ │✍️ Revisão│   │  ← cards 2-col mobile, 3-col desktop
│ │ /dia    │ │ /semana  │ │ diária  │   │
│ │ ≈25min  │ │ ≈210min  │ │ ≈15min  │   │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ ▼ Personalizar (avançado)               │  ← collapsible, abre sozinho ao escolher
│   Título, emoji, período, minutos, dur. │
│                                         │
│        [Cancelar]  [Criar desafio]      │
└────────────────────────────────────────┘
```

Comportamento:
1. Ao abrir, mostra **galeria + accordion "Personalizar" fechado**.
2. Clicar num template **pré-preenche todos os campos** (título traduzido, emoji, período, minutos, duração) e abre o accordion automaticamente — o usuário só ajusta o que quiser.
3. Card selecionado fica destacado (borda primary + check). Trocar = sobrescrever campos.
4. Editar desafio existente pula a galeria (vai direto pros campos avançados).
5. Categoria "Custom" = comportamento atual (campos vazios).
6. Tabs com `overflow-x-auto` + `snap-x` no mobile; grid responsivo nos cards (`grid-cols-2 sm:grid-cols-3`).
7. Tooltips de ajuda permanecem em cada campo avançado (já temos).

Sem mudanças em `useRoomChallenges` ou nas RPCs — só consome os mesmos parâmetros já existentes.

---

## 3. Internacionalização (12 línguas)

Para cada template, 2 chaves: `title` e `desc`. Mais nomes de categoria, hints e labels da UI nova.

```jsonc
"rooms": {
  "challenges": {
    "templates": {
      "pick_template": "Escolha um modelo",
      "or_start_blank": "ou comece em branco",
      "customize": "Personalizar",
      "selected": "Selecionado",
      "categories": {
        "study": "Estudos", "reading": "Leitura",
        "spirituality": "Espiritual", "work": "Trabalho",
        "classes": "Aulas", "language": "Idiomas",
        "fitness": "Fitness", "creative": "Criativo",
        "mindfulness": "Mente", "custom": "Em branco"
      },
      "items": {
        "reading_pages_daily": {
          "title": "Ler {{pages}} páginas/dia",
          "desc": "Cerca de {{minutes}} min de leitura focada"
        },
        "spirituality_prayer_daily": { "title": "Oração diária", "desc": "..." },
        "classes_one_per_day":       { "title": "1 aula por dia",  "desc": "..." }
        // ... ~50 chaves
      }
    }
  }
}
```

Mesma estrutura replicada em: `pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ru-RU, ja-JP, ko-KR, zh-CN, ar-SA, id-ID`. Traduções nativas, não literais (ex: "deep work" vira "trabalho profundo", "集中作業", etc.). Variáveis (`{{pages}}`, `{{minutes}}`) resolvidas no componente.

---

## 4. Responsividade mobile

- Dialog já é `max-h-[92dvh] flex flex-col` — só ajustar conteúdo.
- Tabs horizontais com scroll suave, chip ativo grudando à esquerda (`snap-start`).
- Cards de template: padding generoso pra toque, mínimo 44px de altura, texto truncado em 2 linhas.
- Accordion "Personalizar" colapsado por padrão no mobile (economiza scroll), aberto auto após seleção.
- Botões do footer empilham (`flex-col-reverse sm:flex-row`) — já é assim.

---

## 5. Detalhes técnicos

Arquivos a criar:
- `src/lib/roomChallengeTemplates.ts` — catálogo + helper `getTemplatesByCategory()`.
- `src/components/rooms/ChallengeTemplatePicker.tsx` — tabs + grid + card.

Arquivos a editar:
- `src/components/rooms/CreateChallengeDialog.tsx` — integra picker + accordion "Personalizar".
- `src/i18n/locales/*.json` (12 arquivos) — bloco `rooms.challenges.templates`.

Sem mudanças em: schema do banco, RPCs, `useRoomChallenges`, `RoomChallengesCard`, jobs de push (`notification-scheduler` continua usando `target_minutes`/`name`).

---

## 6. Entregáveis (ordem)

1. Catálogo `roomChallengeTemplates.ts` com ~50 templates organizados por categoria.
2. Componente `ChallengeTemplatePicker` (tabs + grid responsivo + estado de seleção).
3. Refatorar `CreateChallengeDialog` em 2 zonas (picker → accordion avançado), preservando fluxo de edição.
4. Adicionar bloco `rooms.challenges.templates` nas 12 línguas com traduções nativas.
5. Validar visualmente no mobile e desktop, e conferir que edição de desafio existente continua direta.

Se aprovar, executo na ordem acima — nada quebra do fluxo atual e o "começar em branco" continua disponível pra quem prefere.
