## 1. Bug "Personalizada" não abre no desktop

**Causa**: o `<Tabs>` tem `TabsTrigger value="custom"` mas nenhum `TabsContent value="custom"`. Ao clicar, o Radix esconde o painel "templates" e não há painel "custom" para mostrar. O `onClick → setStep("form")` deveria salvar, mas o re-render do Radix em modo uncontrolled gera um frame "vazio" no desktop (no mobile o Sheet tem `flex-1` que disfarça). Resultado: tela em branco.

**Correção**: remover a abstração `<Tabs>` duplicada. O painel inicial já tem o botão "Criar meta personalizada" no rodapé — basta usar apenas ele e remover o `TabsList` redundante. Passa a haver dois estados claros controlados por `step`:

- `step === "templates"` → header "Escolha um template" + `GoalTemplatePicker` + botão "Criar meta personalizada".
- `step === "form"` → botão "← Voltar" + formulário completo.
- `step === "book"` → botão "← Voltar" + `BookPicker`.

Resolve o bug em desktop e mobile com a mesma UI.

## 2. Catálogo de livros expandido

Adicionar ao `POPULAR_BOOKS` em `src/lib/goalTemplates.ts`, agrupado mentalmente por gênero (a UI vai segmentar por categoria via abas dentro do BookPicker):

**Cristãos / Espirituais**: O Peregrino (John Bunyan, 320), Em Seus Passos o Que Faria Jesus? (192), O Mais Importante Aconteceu (224), A Cabana (256), Mero Cristianismo (224), Cartas de um Diabo (172), Jesus Calling (400), A Vida Devocional Cristã (240), O Conhecimento do Santo (A.W. Tozer, 144).

**Fantasia / Ficção**: As Crônicas de Nárnia (vol. único, 768), O Hobbit (310), O Senhor dos Anéis (1216), Percy Jackson 1 (377), Crepúsculo (498), Jogos Vorazes (374), Eragon (509), Duna (688), A Roda do Tempo 1 (782).

**Clássicos**: Os Miseráveis (1488), Crime e Castigo (671), Anna Karenina (864), Orgulho e Preconceito (432), O Conde de Monte Cristo (1276), Cem Anos de Solidão (417), Memórias Póstumas de Brás Cubas (256), O Cortiço (304), Vidas Secas (176).

**Desenvolvimento pessoal**: Os 7 Hábitos das Pessoas Altamente Eficazes (432), Mindset (312), Essencialismo (272), O Poder do Hábito (408), Como Fazer Amigos e Influenciar Pessoas (256), Foco (320), Comece pelo Porquê (256), Mindfulness (320).

**Negócios / Finanças**: Pai Rico, Pai Pobre (já existe), Os Segredos da Mente Milionária (240), O Investidor Inteligente (656), Princípios (Ray Dalio, 592), Do Mil ao Milhão (288), Os Axiomas de Zurique (208).

**História / Não-ficção**: Homo Deus (448), 21 Lições para o Século 21 (432), Por que as Nações Fracassam (560), Armas, Germes e Aço (480), Breve História do Tempo (256).

UI do `BookPicker` ganha sub-abas de gênero (`Cristãos | Fantasia | Clássicos | Pessoal | Negócios | História`) + "Todos" + busca livre. Mantém aba "Outro livro" para entrada manual.

## 3. Mais templates inteligentes + novas categorias

Acréscimos a `GOAL_TEMPLATES` (mantendo i18n keys):

**📖 Leitura** (+): Ler a Bíblia em 1 ano em ÁUDIO (`habit` 7×/sem), Resenhar livros lidos (`progress` 12 resenhas), Trocar 1h de tela por leitura (`habit`).

**💰 Finanças** (+): Reserva de emergência 6 meses (`progress`), Sair do vermelho (`simple`), Aprender 1 nova habilidade financeira (`simple`), Cortar gastos supérfluos (`habit` mensal), Doar dízimo/oferta mensal (`habit`).

**🙏 Espiritualidade** (+): Ler 1 capítulo de Provérbios/dia (`habit`), Decorar versículos (`progress` 52 versículos), Participar de pequenos grupos (`habit` semanal), Evangelizar 1 pessoa/mês (`habit` mensal), Retiro espiritual (`simple`).

**📚 Estudo** (+): Tirar uma certificação (`simple`), Ler artigo/podcast técnico (`habit` semanal), Aulas particulares (`habit`), Resolver problemas (LeetCode/ENEM) — N por semana (`habit`).

**🏃 Saúde** (+): Perder/ganhar X kg (`progress`), N passos por dia (`habit`), Sem álcool/refrigerante (`habit`), Consulta médica anual (`simple`), Yoga/alongamento (`habit`).

**✍️ Hábitos** (+): Acordar cedo (`habit`), Não usar celular na 1ª hora (`habit`), Listar 3 gratidões/dia (`habit`).

**Novas categorias**:

**❤️ Família & Relacionamentos**: Encontro semanal com cônjuge, Ligar para os pais 1×/sem, Brincar com filhos 30min/dia, Reencontrar 5 amigos no ano, Não brigar (`habit`).

**💼 Carreira**: Conseguir promoção/novo emprego (`simple`), Aumento de X% no salário (`progress`), Atualizar portfólio/LinkedIn (`simple`), Networking semanal (`habit`), Side project lançado (`simple`).

**🎨 Hobbies & Criatividade**: Aprender instrumento — N horas (`progress`), Pintar/desenhar N quadros (`progress`), Tocar música (`habit`), Escrever um livro/conto (`simple`), Cozinhar receita nova (`habit` semanal).

**✈️ Viagens & Aventura**: Conhecer N cidades novas (`progress`), 1 viagem internacional (`simple`), Trilha/montanha (`progress`), Camping (`habit` mensal).

**🧘 Mindfulness & Bem-estar**: Terapia semanal (`habit`), Sessão de respiração diária (`habit`), Detox digital mensal (`habit`).

**🎯 Produtividade**: Completar N pomodoros/semana (`habit`), Inbox zero diário (`habit`), Planejamento semanal aos domingos (`habit`).

Total: ~50 templates em 11 categorias. Em mobile o grid vira `grid-cols-1`, em tablet `sm:grid-cols-2`, em desktop `lg:grid-cols-3`. As pílulas de categoria viram scroll-x horizontal em mobile.

## 4. Tooltips que vazam da tela

Hoje `<TooltipContent>` e `<PopoverContent>` usam apenas `side="top" max-w-[260px]`. Em itens próximos da borda, Radix não tem `collisionPadding` configurado e em mobile o popover passa da viewport.

**Correção em `FieldLabel.tsx`**:
- `collisionPadding={12}` em ambos `TooltipContent` e `PopoverContent`.
- `sideOffset={6}` e `side="top"` com `align="start"` para encostar à esquerda do ícone.
- Largura responsiva: `max-w-[min(280px,calc(100vw-32px))]`.
- `style={{ wordBreak: "break-word" }}` para textos longos em árabe/japonês.
- No popover mobile, adicionar `avoidCollisions` (default true do Radix) + `sticky="always"`.
- Replace `<button>` por `<span tabIndex={0} role="button">` para evitar submit acidental dentro de `<form>` (não é o nosso caso mas previne).

Também aplicar `collisionPadding` nos tooltips dos botões +1/+5/+10 em `GoalCard.tsx`.

## 5. Liberar metas para o tier free

Atualmente `hasFeature("goals")` retorna `false` para free → bloqueia tudo. Vamos liberar com limites:

| Tier | Categorias | Metas/ano | Templates | Edição |
|---|---|---|---|---|
| free | 3 | 3 | todos | sim |
| pro | ilimitadas | ilimitadas | todos | sim |
| premium | ilimitadas | ilimitadas | todos | sim |

**Mudanças**:
- `SubscriptionContext.hasFeature`: remover `"goals"` da lista de bloqueio do free. Adicionar helper `getMaxAnnualGoals()` e `getMaxLifeCategories()` retornando `3` no free, `Infinity` nos pagos.
- `Goals.tsx`: remover paywall total. No header, mostrar pill "X/3 metas" e "X/3 categorias" para free.
- `CreateGoalDialog` (trigger): desabilitar com tooltip "Limite atingido — faça upgrade" quando `goals.length >= max`. Idem para `CreateCategoryDialog`.
- Botão "+ Nova meta" dentro de cada categoria também respeita o limite.
- Card de upgrade discreto no final da página quando free atinge o limite.
- Sem mudança de banco — limites enforced no client; insert ainda funciona se o usuário bypasses (não crítico, mas se quiser, podemos adicionar trigger SQL futuramente).

## 6. Responsividade geral

- `GoalFormDialog` desktop: `max-w-2xl` mantém; `max-h-[88vh]` com scroll interno só no body. Header e footer sticky (`shrink-0`).
- Mobile (`Sheet bottom`): manter `h-[92vh]`. Adicionar `safe-area-inset-bottom` no footer.
- `GoalTemplatePicker`: pílulas de categoria com `overflow-x-auto` + `scrollbar-hide` em mobile.
- Cards do `GoalCard`: já tratados (h-9 mobile, h-8 desktop). Confirmar `flex-wrap` no rodapé do progresso para não estourar com unidades longas.
- `Goals.tsx` header: indicadores de cota viram `text-xs` em mobile e `text-sm` em desktop.

---

## Arquivos a alterar

```text
src/lib/goalTemplates.ts                     ← +catálogo de livros + +templates + +categorias
src/contexts/SubscriptionContext.tsx         ← liberar goals no free + getters de limite
src/components/goals/GoalFormDialog.tsx      ← remover Tabs duplicado; corrigir bug
src/components/goals/GoalTemplatePicker.tsx  ← categorias scroll-x mobile; conta itens
src/components/goals/BookPicker.tsx          ← sub-abas por gênero; busca melhorada
src/components/goals/FieldLabel.tsx          ← collisionPadding, max-w responsivo
src/components/goals/GoalCard.tsx            ← collisionPadding nos tooltips do +N
src/pages/Goals.tsx                          ← remover paywall total; contadores de cota; upgrade hint
src/i18n/locales/*.json (12)                 ← chaves novas: novos templates, novas categorias, mensagens de cota, livros (genéricos)
```

Sem mudança de banco. Sem mudança de RPC. Tudo client-side, traduzido nas 12 línguas com fallback inglês para templates novos.
