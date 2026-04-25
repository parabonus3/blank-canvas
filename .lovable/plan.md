# Plano: i18n completo + UI mais limpa do Estilo do Avatar

## Problema identificado

1. **Tradução faltando em 10 idiomas**: as chaves `pricing.feature_*` (incluindo `feature_rooms_1`, `feature_members_10`, `feature_avatar_flair_pro`, `feature_avatar_flair_premium`, etc.) só existem em **pt-BR** e **en-US**. Por isso a tela em japonês mostra `pricing.feature_rooms_1` como texto cru. Faltam: es-ES, fr-FR, ja-JP, de-DE, ar-SA, ko-KR, zh-CN, it-IT, ru-RU, id-ID.

2. **Estilo do Avatar 100% em português hardcoded**: `AvatarFlairPicker.tsx` (título, descrição, badges, botões "Mostrar mais/menos", rodapé "Salvar estilo", aviso de upgrade) e os nomes/descrições dos flairs em `avatarFlairs.ts` ("Pulso", "Anel azul pulsante suave", "Clássicos", "Dark", "Femininos", "Especiais"…) estão fixos em PT.

3. **Picker mostra todas as 4 categorias abertas** com 4 itens cada — visualmente pesado. O usuário quer ver **só os 4 Clássicos** por padrão e um único botão **"Mostrar mais"** que revela tudo o resto (Dark + Femininos + Especiais).

## Mudanças

### 1. UI do Avatar Flair Picker (`AvatarFlairPicker.tsx`)
- Substituir o estado `expanded` por-categoria por **um único `showAll`**.
- Renderizar sempre a categoria **Classic completa (4 itens)**.
- Se `!showAll`: esconder Dark, Feminine e Special; mostrar um botão único largo **"Mostrar mais (+14 efeitos)"** com chevron.
- Se `showAll`: renderizar as três categorias restantes em sequência + botão **"Mostrar menos"** no final.
- Layout permanece responsivo: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`.
- Todos os textos passam a usar `t('settings.avatar_flair.*')`.

### 2. Catálogo de flairs (`avatarFlairs.ts`)
- Remover `name` e `description` literais; manter apenas `id`, `tier`, `category`.
- Criar helpers `getFlairName(id, t)` e `getFlairDescription(id, t)` que leem de `settings.avatar_flair.items.{id}.name` / `.description`.
- `FLAIR_CATEGORIES` passa a expor só `id`; o `label` vem de `settings.avatar_flair.categories.{id}`.

### 3. Novas chaves i18n (em **todos os 12 locales**)

Adicionar bloco `settings.avatar_flair`:
- `title`, `badge_pro`, `badge_premium`
- `description_free`, `description_paid`
- `show_more` (com `{{count}}`), `show_less`
- `save`, `saving`
- `upgrade_hint_pro`, `upgrade_hint_premium`
- `free_cta_title`, `free_cta_subtitle`, `free_cta_button`
- `categories.classic|dark|feminine|special`
- `items.{id}.name` e `items.{id}.description` para os 18 flairs

Adicionar/garantir bloco `pricing` completo em **es-ES, fr-FR, ja-JP, de-DE, ar-SA, ko-KR, zh-CN, it-IT, ru-RU, id-ID** com todas as chaves já existentes em pt-BR/en-US (`feature_timer_basic`, `feature_rooms_1/3/10`, `feature_members_10/50/200`, `feature_freezes_3_monthly/6_monthly`, `feature_avatar_flair_pro/premium`, e todas as outras `feature_*`, além de `month`, `year`, `billed_annually`, etc., se ausentes).

### 4. Verificação
- Rodar `tsc --noEmit` para garantir tipagem.
- Conferir que nenhum texto da seção "Estilo do Avatar" ou planos aparece como chave crua.

## Arquivos afetados

- `src/components/settings/AvatarFlairPicker.tsx` (refator UI + i18n)
- `src/lib/avatarFlairs.ts` (remover strings hardcoded, adicionar helpers)
- `src/i18n/locales/pt-BR.json` e `en-US.json` (adicionar bloco `settings.avatar_flair`)
- `src/i18n/locales/{es-ES,fr-FR,ja-JP,de-DE,ar-SA,ko-KR,zh-CN,it-IT,ru-RU,id-ID}.json` (adicionar bloco `pricing` completo + `settings.avatar_flair`)

## Resultado esperado

- Em qualquer idioma, a página de **Planos** mostra os benefícios traduzidos (sem `pricing.feature_*` cru).
- A seção **Estilo do Avatar** aparece traduzida (título, categorias, nomes dos efeitos, descrições, botões).
- O picker abre limpo mostrando **apenas os 4 efeitos Clássicos** + botão "Mostrar mais (+14 efeitos)"; ao clicar, expande Dark, Femininos e Especiais com botão "Mostrar menos".
