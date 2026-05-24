## 1. Diálogo fecha sozinho (Nova Meta / Nova Categoria)

### Causa
Em `src/pages/Goals.tsx` os helpers `GoalsQuotaButton` e `CategoryQuotaButton` estão **declarados dentro do componente `Goals`**. Cada render do `Goals` cria uma nova referência de função → o React enxerga um *tipo de componente novo* a cada render e **desmonta/remonta** toda a subárvore (`CreateGoalDialog`, `CreateCategoryDialog`).

Como o estado `internalOpen` do `GoalFormDialog` é interno, no remount ele volta a `false` e o `Dialog`/`Sheet` fecha. O gatilho dos "alguns segundos" é o React Query refazendo `useAnnualGoals` / `useAnnualGoalsStats` / `useLifeCategories` no `refetchOnWindowFocus` ou após qualquer mutação → re-render do `Goals` → remount → fechamento.

### Correção
- Mover `GoalsQuotaButton` e `CategoryQuotaButton` para **componentes de módulo** (fora do `Goals`), recebendo via props o que hoje vêm por closure (`year`, `categories`, `goalsLimitReached`, `categoriesLimitReached`, `maxGoals`, `maxCategories`, `defaultCategoryId`, `t`).
- Auditar o restante do app procurando o mesmo padrão (componente declarado dentro de outro componente que abriga `Dialog`/`Sheet`/`Popover`). Alvos para checagem rápida: `Settings.tsx`, `RoomDetail.tsx`, `Friends.tsx`, `Notes.tsx`, `MindMaps.tsx`, `RoomSettingsTab.tsx`. Corrigir os que tiverem o mesmo problema.

Não mexer no `GoalFormDialog` — ele já é estável; o problema é externo.

## 2. Livros populares por idioma

### Hoje
`POPULAR_BOOKS` em `src/lib/goalTemplates.ts` tem títulos **fixos em português**. Mesmo o usuário japonês/inglês/etc vê "O Hobbit", "Bíblia Sagrada", etc.

### Estratégia
Refatorar `POPULAR_BOOKS` para um catálogo neutro com `id`, `pages`, `genre` e adicionar **traduções por idioma** no i18n, usando o `id` do livro como chave:

```
annual_goals.books.{id}.title
annual_goals.books.{id}.author   (opcional, pode ficar igual em todos)
```

E no `BookPicker`:
```ts
const title = t(`annual_goals.books.${b.id}.title`, b.fallbackTitle);
const author = t(`annual_goals.books.${b.id}.author`, b.author ?? "");
```

### Curadoria por mercado
Em vez de simplesmente traduzir os mesmos 60 livros, criar **listas regionais** por idioma para refletir o que realmente é publicado e popular em cada mercado:

- **pt-BR**: manter o catálogo atual (já é brasileiro).
- **en-US**: títulos no original em inglês + bestsellers EUA/UK (NYT/Goodreads).
- **es-ES**: edições espanholas + autores hispano-americanos populares (García Márquez, Vargas Llosa, Zafón, Pérez-Reverte, etc.).
- **ja-JP**: título japonês oficial das traduções (例: ホビット, ハリー・ポッターと賢者の石) + clássicos japoneses populares (村上春樹, 東野圭吾, 夏目漱石, 太宰治).
- **zh-CN**: títulos chineses simplificados das traduções + clássicos chineses (《活着》余华, 《三体》刘慈欣, 《围城》钱钟书).
- **ko-KR**: títulos coreanos + autores coreanos (한강, 김영하, 조남주).
- **fr-FR**, **it-IT**, **de-DE**, **ru-RU**: títulos na edição local + 1–2 autores nativos populares (ex: Houellebecq, Ferrante, Schätzing, Pelevin).
- **ar-SA**: edições árabes + autores árabes (نجيب محفوظ, غسان كنفاني, أحلام مستغانمي).
- **id-ID**: edições em bahasa + autores indonésios (Pramoedya, Tere Liye, Andrea Hirata).

### Implementação
1. Em `goalTemplates.ts`: trocar `POPULAR_BOOKS` por `BOOK_CATALOG` indexado e exportar um helper:
   ```ts
   export function getPopularBooks(locale: string): BookOption[]
   ```
   que devolve a lista de IDs ordenados para aquele idioma (curadoria regional). Cada item carrega `id`, `pages`, `genre` e títulos **resolvidos via i18n** no consumidor.

2. Em `src/i18n/locales/*.json`: adicionar a seção `annual_goals.books` com `{title, author}` para cada `id` usado no idioma. Idiomas sem curadoria específica caem na curadoria "internacional" (en-US) por fallback.

3. `BookPicker.tsx`:
   - Substituir `import { POPULAR_BOOKS }` por `getPopularBooks(i18n.language)`.
   - Resolver `title`/`author` via `t()` com fallback ao valor do catálogo.
   - Busca passa a comparar com o título já traduzido.

4. **`InstrumentalI18n`**: o `BookPicker` já usa `useTranslation`; só falta passar `i18n.language` para o helper.

### Sem mudanças
- UI do `BookPicker`, do `GoalFormDialog`, dos templates de meta e da página `Goals` continua igual.
- IDs dos livros não mudam → metas já criadas não são afetadas.
- Currency picker e templates de meta (não-livros) ficam inalterados.

## Arquivos a tocar
- `src/pages/Goals.tsx` (extrair os dois helpers)
- Possíveis ajustes em outras páginas se a auditoria encontrar o mesmo padrão
- `src/lib/goalTemplates.ts` (catálogo neutro + `getPopularBooks(locale)`)
- `src/components/goals/BookPicker.tsx` (consumir helper + i18n)
- `src/i18n/locales/*.json` × 12 (seção `annual_goals.books`, curadoria por mercado)
