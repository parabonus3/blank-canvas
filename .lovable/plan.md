
# Plano: timer 12h inteligente + sidebar + backgrounds Pro/Premium

## 1. Limite de 12h inteligente (aproveitando o check de 2h)

**Situação atual:** trigger `enforce_time_entry_max_duration` corta qualquer sessão acima de 12h e adiciona nota "auto-ajustada". Isso pune quem realmente estudou >12h, mesmo confirmando presença a cada 2h.

**Lógica nova:**
- Cada confirmação válida do `InactivityCheckModal` (botão "Estou aqui") atualiza `last_heartbeat_at` e incrementa um contador `confirmed_intervals` na entrada (nova coluna).
- O trigger passa a calcular o **limite máximo dinâmico** = `2h × (1 + confirmed_intervals)`.
  - 0 confirmações → corta em 2h (igual hoje quando o usuário esquece).
  - 1 confirmação → permite até 4h.
  - 5 confirmações → permite até 12h.
  - 6+ confirmações → permite até 24h (novo teto absoluto de segurança).
- Se ultrapassar o limite dinâmico, corta no limite e adiciona nota com explicação clara (ex: "ajustada para 8h: 3 confirmações de presença registradas").
- Sessões longas legítimas (estudante real confirmando) passam a contabilizar corretamente.

**Migration:**
- Adicionar `confirmed_intervals INTEGER DEFAULT 0` em `time_entries`.
- Nova RPC `confirm_presence_time_entry(_entry_id uuid)` que incrementa o contador e atualiza `last_heartbeat_at`.
- Reescrever `enforce_time_entry_max_duration` com a fórmula dinâmica e teto de 24h.
- Frontend: `InactivityCheckModal.onResume` chama a RPC ao confirmar.

## 2. Sidebar — Suporte depois de Planos

Em `src/components/layout/Sidebar.tsx`, na lista `navItems`, mover `support` para logo após `pricing`:
```
... settings, pricing, support, admin?, sac-agent?
```

## 3. Backgrounds personalizáveis (perfil + sala) Pro/Premium

**Conceito:** sistema de "wallpapers" análogo ao avatar_flair atual, com tiers.

### 3a. Schema (migration)
- `profiles.profile_background TEXT DEFAULT 'none'` — background do perfil do usuário.
- `study_rooms.room_background TEXT DEFAULT 'none'` — background da sala definido pelo dono.
- Atualizar as funções SECURITY DEFINER que retornam preview público de profile e room para incluir esses campos (somente o id do background, sem dados sensíveis).

### 3b. Catálogo `src/lib/wallpapers.ts`
Estrutura igual a `avatarFlairs.ts`:
- `id`, `name`, `tier` (`free` | `pro` | `premium`), `preview` (gradient/pattern CSS), `className` ou render fn.
- Free: 1–2 opções neutras.
- Pro: ~6 opções (gradientes sólidos, padrões sutis).
- Premium: todas (~14 opções, incluindo animadas: aurora, galáxia, partículas, mesh gradient).
- Helper `getWallpaperById(id, tier)` faz fallback para `'none'` se o usuário não tem o tier necessário (defesa contra downgrade de plano).

### 3c. Componente `<Wallpaper background={id} className="...">`
- Renderiza um `<div absolute inset-0 -z-10>` com o estilo do wallpaper.
- Gradientes via tokens HSL do design system (sem cores hardcoded).
- Animações leves com CSS (sem dependência nova). Premium pode ter 1–2 com Framer Motion já existente.
- Sempre com overlay `bg-background/70 backdrop-blur-sm` para legibilidade do conteúdo.

### 3d. Configuração do background do **perfil** (Settings)
- Novo card `<ProfileBackgroundPicker>` em Settings, abaixo de `AvatarFlairPicker`.
- Mostra grid de previews; trava opções acima do tier (igual ao flair picker).
- Salva via `useUpdateProfile`.

### 3e. Configuração do background da **sala** (Room Settings)
- Em `src/components/rooms/RoomSettingsTab.tsx`, novo card `<RoomBackgroundPicker>` visível apenas para o dono e somente se `tier !== 'free'`.
- Free vê CTA de upgrade.
- Salva via update em `study_rooms.room_background`.

### 3f. Onde os backgrounds aparecem
1. **Perfil em /explore** (`Explore.tsx`): nos cards de perfil público, renderiza `<Wallpaper>` no fundo do card quando o perfil é público e tem background definido. Mantém layout existente, apenas troca o `bg-card` por wallpaper + overlay.
2. **Card de sala em /explore**: aplica `room_background` no fundo do card da sala. Cards de sala ficam com identidade visual do dono.
3. **Dentro da sala** (`RoomDetail.tsx`): wallpaper como fundo da página da sala (full-bleed, atrás do conteúdo). Overlay garante contraste.
4. **Modal de perfil de membro/amigo**: aplica wallpaper do perfil no header do modal (`MemberProfileModal`, `FriendProfileModal`).

### 3g. Responsividade e segurança
- Todos os wallpapers testados em viewport mobile (≤640px): gradientes/padrões escalam por `cover`; animações desativadas em `prefers-reduced-motion`.
- Overlay garante que texto continue legível em qualquer wallpaper.
- Validação no backend: trigger BEFORE INSERT/UPDATE em `profiles` e `study_rooms` que reseta o background para `'none'` se o `plan_tier` do dono não permitir o tier do wallpaper escolhido (proteção contra downgrade e manipulação client-side).

## 4. i18n
- Adicionar chaves em `pt-BR.json` e `en-US.json` para: `settings.profile_background.*`, `rooms.background.*`, `wallpapers.*` (nomes de cada wallpaper), badges Pro/Premium.

## 5. Ordem de execução
1. Migration: `confirmed_intervals`, RPC `confirm_presence_time_entry`, novo trigger 12h dinâmico, colunas `profile_background`/`room_background`, trigger de validação por tier, atualizar funções SECURITY DEFINER de preview.
2. Frontend timer: integrar RPC no `InactivityCheckModal.onResume`.
3. Sidebar: reordenar Suporte.
4. Wallpapers: criar `src/lib/wallpapers.ts` + `<Wallpaper>` + pickers.
5. Aplicar wallpapers em Explore (perfis e salas), RoomDetail, modais de perfil.
6. i18n e QA mobile.

## Pontos para confirmar antes de implementar
- Teto absoluto de 24h serve, ou prefere algo diferente (ex: sem teto se confirmar todas as 2h)?
- Quer que o usuário Free também tenha 1–2 wallpapers (como tem flair "default"), ou Free fica sem opção alguma?
