## Objetivo

Estender o tutorial atual (`OnboardingWizard`) para, após criar categoria e projeto, levar o usuário até a página **Explorar** e ensinar de forma didática tudo o que ela oferece (salas públicas, ranking, filtros, etc.). Tudo responsivo para mobile e desktop, e traduzido nos 12 idiomas do app.

## Mudanças

### 1. Fluxo do wizard (`src/components/OnboardingWizard.tsx`)

Aumentar de 4 para **7 passos**:

```
0. Boas-vindas (existente)
1. Criar categoria (existente)
2. Criar projeto (existente)
3. NOVO — "Conheça o Explorar" (intro)
4. NOVO — "Salas públicas" (filtros, países, top 10, entrar)
5. NOVO — "Ranking de pessoas" (períodos: agora/hoje/semana/total)
6. Finalização (existente, com CTA "Ir para Explorar")
```

Comportamento:
- Cada passo novo tem ícone, título, descrição curta, lista de 3-4 bullets explicativos com ícones (Search, Globe, Users, Trophy, Radio, Calendar, etc.) e mini "preview" visual em card.
- Botão "Pular tour" sempre disponível.
- No passo final, o botão principal vira **"Explorar agora"** e navega para `/explore`; botão secundário "Ficar no painel" vai para `/`.
- `finish()` marca `onboarding_completed: true` em qualquer saída.

### 2. Responsividade

- `DialogContent` passa de `sm:max-w-md` para `sm:max-w-lg` para acomodar mais conteúdo.
- Mantém `max-h-[90vh] overflow-y-auto` (já existe).
- Listas de bullets em `space-y-2` com `text-sm`; ícones `h-4 w-4 shrink-0`.
- Botões de ação em `flex-col sm:flex-row gap-3 w-full` (padrão já usado).
- Mini previews dos passos 4 e 5: cards `rounded-lg border bg-muted/30 p-3` com flex compacto, sem imagens pesadas — apenas ícones + placeholders de texto.

### 3. Traduções (12 idiomas)

Adicionar a cada `src/i18n/locales/*.json` em `onboarding`:

```
explore_intro_title, explore_intro_desc,
explore_intro_bullets[4],
explore_rooms_title, explore_rooms_desc,
explore_rooms_bullets[4],
explore_users_title, explore_users_desc,
explore_users_bullets[4],
done_explore_button, done_stay_button
```

Arquivos: `pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ru-RU, ja-JP, ko-KR, zh-CN, ar-SA, id-ID`.

Conteúdo didático (resumo do que será explicado):
- **Salas:** o que são salas de foco/estudo, como filtrar por categoria/país, buscar pelo nome, identificar Top 10, entrar em salas públicas e o cadeado em salas privadas.
- **Ranking de usuários:** períodos (Agora/Hoje/Semana/Total), medalhas top 3, como aparecer no ranking (estudando dentro de salas), respeito ao anonimato.
- **Intro Explorar:** o que é a página, por que usar, como descobrir comunidades.

### 4. Sem mudanças

- Nenhuma alteração em RPCs, schema, hooks, página Explorar ou lógica de criação de categoria/projeto.
- Sem novas dependências.

## Arquivos editados

- `src/components/OnboardingWizard.tsx` — 3 passos novos + navegação final.
- `src/i18n/locales/*.json` (12 arquivos) — chaves novas em `onboarding`.

## Detalhes técnicos

- `totalSteps = 7`, barra de progresso recalculada automaticamente.
- Navegação final usa `useNavigate()` de `react-router-dom` (novo import).
- Bullets renderizados com `(t("onboarding.X_bullets", { returnObjects: true }) as string[]).map(...)` (padrão já usado em `done_tips`).
- Ícones reutilizados de `lucide-react` (já no bundle): `Globe, Search, Users, Trophy, Radio, Calendar, Lock, Compass`.