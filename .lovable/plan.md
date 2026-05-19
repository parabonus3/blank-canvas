## Objetivo

Tornar a página **Metas** mais fácil de usar: permitir editar metas existentes, oferecer **templates** prontos para metas comuns (leitura, finanças, oração, estudo, exercício, água, escrita, idiomas), adicionar **tooltips** explicativos em todos os campos e garantir layout 100% responsivo — tudo traduzido em todas as 12 línguas.

---

## 1. Editar metas existentes

Atualmente `GoalCard` só permite excluir e logar progresso. Vamos adicionar:

- Botão "Editar" no menu de cada card (transformar trash em `DropdownMenu` com Editar / Excluir).
- Novo componente `EditGoalDialog` (baseado no `CreateGoalDialog`) que permite alterar: título, descrição, categoria, alvo (`target_value`), unidade, frequência. Tipo da meta **não** será editável (evita inconsistência de dados).
- Para metas de progresso/habit, permitir também **ajustar manualmente o valor atual** (`current_value`) — útil quando o usuário esquece de logar.
- Usa o hook já existente `useUpdateAnnualGoal`.

## 2. Templates de metas (Quick Start)

Novo arquivo `src/lib/goalTemplates.ts` com catálogo de templates organizados por área. Cada template traz: id, ícone, categoria sugerida, tipo (`simple`/`progress`/`habit`), título padrão, unidade, alvo padrão, descrição, e — quando aplicável — **subtipo "Livro"** com lista de livros populares + número real de páginas.

Catálogo proposto:

**📖 Leitura**
- Ler um livro específico → escolher de catálogo (Bíblia 1189pg, Dom Casmurro 256, Harry Potter 1 223, Atomic Habits 320, O Pequeno Príncipe 96, etc.) **ou** digitar nome+páginas manualmente. Vira meta `progress` com unidade "páginas".
- Ler N livros por ano → `progress` unidade "livros".
- Ler 30 min/dia → `habit` semanal.

**💰 Finanças**
- Economizar valor (R$/$/€) → `progress` unidade da moeda escolhida.
- Quitar dívida → `progress`.
- Investir mensalmente → `habit` mensal.

**🙏 Espiritualidade**
- Ler a Bíblia em 1 ano → preset 1189 páginas com sugestão de ~3,3pg/dia.
- Orar todos os dias → `habit` semanal (7x).
- Devocional diário → `habit`.
- Jejum semanal → `habit`.

**📚 Estudo**
- Estudar idioma N horas → `progress` unidade "horas".
- Completar curso → `simple`.
- Praticar idioma diariamente → `habit`.

**🏃 Saúde**
- Beber 2L água/dia → `habit` diário (renderizado como semanal 7x).
- Treinar Nx/semana → `habit` semanal.
- Correr N km → `progress`.
- Meditar diariamente → `habit`.

**✍️ Hábitos pessoais**
- Escrever no diário → `habit`.
- Dormir 8h → `habit`.

### UX dos templates

No `CreateGoalDialog`, no topo, abas: **Template** (default) | **Personalizada**.

- Aba Template: grid de cards visuais agrupados por área (com busca). Ao clicar em "Ler a Bíblia", abre passo 2 com campos pré-preenchidos editáveis. Para "Ler livro específico", há um `Combobox` com livros populares + opção "Outro livro" que revela campos título+páginas.
- Aba Personalizada: o formulário atual (refinado com tooltips).
- Templates apenas pré-preenchem; o usuário pode mudar tudo antes de criar.

## 3. Tooltips em todos os campos

Componente helper `<FieldLabel label tooltip>` que renderiza `<Label>` + ícone `HelpCircle` com `Tooltip` do shadcn. Aplicar em:

- Tipo de meta (explicar Simples vs Progresso vs Frequência com exemplos)
- Título, Categoria, Alvo, Unidade, Frequência, Descrição
- No card: tooltip nos botões +1/+5/+10 e no input de quantidade

## 4. Internacionalização

Adicionar em todas as 12 locales (pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ar-SA, ja-JP, ko-KR, zh-CN, ru-RU, id-ID) sob `annual_goals`:

- `tooltips.*` — textos explicativos de cada campo
- `templates.categories.*` — Leitura, Finanças, Espiritualidade, Estudo, Saúde, Hábitos
- `templates.items.*` — título e descrição de cada template
- `templates.books.*` — nomes dos livros populares (mantém autor original)
- `edit_goal`, `tab_template`, `tab_custom`, `search_template`, `other_book`, `book_name`, `book_pages`, `adjust_current_value`, etc.

Livros e moedas ficam em catálogo único; só traduzimos rótulos genéricos.

## 5. Responsividade mobile

- `CreateGoalDialog` vira `Sheet` (bottom sheet) em telas <640px para ocupar tela inteira e facilitar rolagem.
- Grid de templates: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Cards de tipo de meta empilham em 1 coluna no mobile (já fazem, manter).
- Botões +1/+5/+10 no `GoalCard` viram `flex-wrap` com tamanho mínimo confortável (h-9 no mobile).
- Tooltips em mobile: trocar por `Popover` ao toque (helper detecta `useIsMobile`).
- Header do `Goals.tsx`: ações já fazem `flex-wrap`, manter.

---

## Estrutura técnica

```text
src/
  lib/goalTemplates.ts              ← catálogo + tipos
  components/goals/
    CreateGoalDialog.tsx            ← refator: abas + tooltips + responsive sheet
    EditGoalDialog.tsx              ← NOVO
    GoalCard.tsx                    ← + DropdownMenu (Editar/Excluir) + tooltips
    GoalTemplatePicker.tsx          ← NOVO: grid agrupado + busca
    BookPicker.tsx                  ← NOVO: combobox de livros populares
    FieldLabel.tsx                  ← NOVO: label+tooltip helper
  i18n/locales/*.json               ← novas chaves em todas as 12 línguas
```

Nenhuma mudança de banco é necessária — o schema atual (`goal_type`, `target_value`, `current_value`, `unit`, `frequency_period`, `description`) já suporta todos os templates.

---

## Fora de escopo (não vou mexer)

- Animação do relógio na landing (já está pronta).
- Lógica de RPC/triggers do Supabase.
- Outras páginas (Dashboard, Rooms, etc.).
