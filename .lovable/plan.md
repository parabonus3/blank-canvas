# Plano: Kanban colaborativo, mobile-first e multilíngue

## Diagnóstico confirmado (estado atual)

- A colaboração já tem schema (`board_members`, `board_invitations`, `task_members`) e RPCs (`invite_to_board_by_code`, `accept_board_invitation`).
- O hook `useBoardCollab.ts` já traz: membros do quadro, convites pendentes, atribuição de tarefas e trabalhadores ativos via `time_entries`.
- Os cards já exibem avatares de membros e indicador laranja de quem está focando agora.
- **Problema crítico**: todas as chaves `kanban.*` estão usando fallback hardcoded em português. O objeto `kanban` não existe em nenhum dos 12 arquivos JSON de tradução.
- **Problema de UX**: a tela do quadro (`BoardDetail`) não tem botão/ícone explícito de "Membros" no header; a atribuição de pessoas só aparece indiretamente no card; o drawer de tarefa não tem uma aba "Membros" para convidar/ver quem faz o quê.
- **Problema mobile**: o header do quadro está muito denso; o accordion de colunas precisa de mais contexto visual; ações de colaboração são difíceis de acessar em telas pequenas.

## Objetivos do plano

1. Deixar óbvio, logo ao abrir um quadro, que ele é colaborativo e quem está participando.
2. Permitir atribuir pessoas a cada tarefa de forma direta e visual.
3. Mostrar, em tempo real, quem está focando em cada tarefa e quanto tempo cada pessoa já dedicou.
4. Traduzir 100% das novas (e existentes) strings do Kanban para os 12 idiomas do Timezoni.
5. Reorganizar o layout mobile para que tudo flua sem scroll horizontal e sem confusão visual.

## Entregas do plano

### 1. Header do quadro colaborativo e responsivo
- Adicionar botão de "Membros" com ícone `Users` no header do `BoardDetail`.
- Exibir avatares dos membros do quadro (limitado a 3/4) diretamente no header, com indicador de "online/focando".
- Em mobile: reduzir título, usar ícones compactos e garantir que o header não quebre em múltiplas linhas de forma feia.
- Adicionar badge de "Compartilhado" quando o quadro não for do usuário logado.

### 2. Aba "Membros" no drawer de tarefa
- Criar nova aba `members` no `TaskDetailDrawer`.
- Listar membros do quadro com avatar, nome e papel.
- Permitir atribuir/remover pessoas da tarefa com checkboxes ou botões de toggle.
- Mostrar, ao lado de cada membro atribuído, o tempo total que essa pessoa já dedicou a essa tarefa (agregado de `time_entries` + `task_time_logs`).
- Mostrar quem está focando agora na tarefa (indicador laranja pulsante).

### 3. Melhoria visual do card de tarefa
- Manter avatares dos atribuídos.
- Adicionar tooltip/title com nomes ao passar/long press.
- Destacar o card de uma tarefa em que o usuário logado está focando agora (borda laranja sutil).
- Garantir que, em mobile, o card não fique com informações demais empilhadas de forma confusa.

### 4. Dialog de gerenciamento de membros do quadro
- Evoluir o `BoardInviteDialog` para ser mais claro:
  - Mostrar o código de amigo do usuário logado (caso ele queira copiar e compartilhar).
  - Campo de convite por código com validação visual (ex: "Usuário não encontrado", "Já é membro").
  - Lista de membros com papel traduzido (Dono, Editor, Membro).
  - Permitir remover membros (somente dono).
- Em mobile: usar Sheet em vez de Dialog para melhor aproveitamento de tela.

### 5. Traduções completas do Kanban
- Criar objeto `kanban` completo em todos os 12 locales (`pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`, `ja-JP`, `ko-KR`, `zh-CN`, `ru-RU`, `ar-SA`, `id-ID`).
- Cobrir todas as chaves já usadas no código: `title`, `subtitle`, `page_title`, `new_board`, `board_title`, `board_description`, `board_color`, `linked_project`, `add_column`, `new_column_ph`, `column_color`, `add_task`, `tab_board`, `tab_calendar`, `tab_reports`, `tab_details`, `tab_checklist`, `tab_comments`, `tab_time`, `tab_members`, `priority.*`, `start_focus`, `working_now`, `working_now_with_name`, `members`, `assign_members`, `invite`, `invite_by_code`, `pending_invites`, `invited_by`, `accept`, `reject`, `shared`, `no_project`, `delete_task`, etc.
- Remover strings hardcoded em português (fallbacks) para garantir que o texto apareça no idioma correto.

### 6. Mobile-first no layout do quadro
- Reorganizar o accordion de colunas para mobile:
  - Cada coluna precisa de cabeçalho bem separado com cor, título e contador.
  - Cards devem ter área de toque adequada (mínimo 44px) para drag e abrir.
- Header do quadro em mobile: título em uma linha, botões de ação em outra, ou usar um layout flexível que se adapte.
- Sheet em vez de Dialog para convite de membros e detalhes em telas pequenas.
- Garantir que nenhum container do Kanban force scroll horizontal em mobile.

### 7. Dados de tempo por pessoa em cada tarefa
- Criar/agrupar consulta que some `total_tracked_seconds` por `user_id` para uma tarefa (via `time_entries` e `task_time_logs`).
- Exibir esse tempo na aba "Membros" do drawer e, opcionalmente, em um tooltip no card.

## Implementação técnica

### Hooks
- Adicionar `useTaskMemberTimeTotals(taskId)` em `useBoardCollab.ts` para retornar `Map<user_id, totalSeconds>`.
- Adicionar `useMyFriendCode()` (ou similar) para mostrar o código do usuário logado no dialog de convite.
- Garantir que `useBoardTaskMembers` e `useActiveTaskWorkers` atualizem corretamente após atribuição/desatribuição.

### Componentes
- `BoardDetail.tsx`: refatorar header, adicionar botão de membros e badge de compartilhado.
- `TaskDetailDrawer.tsx`: adicionar aba `members` com `MemberAssigner`.
- `TaskCard.tsx`: ajustar espaçamento mobile, adicionar destaque de "focando agora" para o usuário logado.
- `BoardInviteDialog.tsx`: melhorar mensagens, validações e exibir código do usuário. Adicionar prop `isMobile` para alternar Dialog/Sheet.
- Criar `TaskMemberAssigner.tsx` para a aba de membros do drawer.
- Atualizar `MemberAvatars.tsx` se necessário para suportar tooltip/nomes em mobile.

### Traduções
- Adicionar objeto `kanban` completo em todos os 12 arquivos JSON.
- Usar script de sincronização para garantir que cada chave exista em todos os idiomas com tradução adequada.

### Banco (se necessário)
- Verificar se `profiles.friend_code` está populado para todos os usuários. Se não, garantir que o trigger `set_friend_code()` seja executado no cadastro.
- Não é necessária nova migration de schema, pois as tabelas já existem. Se houver necessidade de ajustar RLS ou índices, serão feitas migrações pontuais.

## Critérios de aceite

- [ ] Header do quadro mostra claramente os membros e botão de gerenciar convites.
- [ ] Drawer de tarefa tem aba "Membros" funcional em desktop e mobile.
- [ ] É possível atribuir/remover pessoas de uma tarefa com um clique/toque.
- [ ] O tempo dedicado por cada pessoa em cada tarefa é visível.
- [ ] Quem está focando na tarefa aparece com indicador pulsante.
- [ ] Todas as strings do Kanban estão traduzidas nos 12 idiomas (sem fallback em português).
- [ ] Não há scroll horizontal em mobile na tela do quadro.
- [ ] Ações de colaboração funcionam em telas pequenas (Sheet, toques de 44px+).

## Riscos e mitigações

- **Risco**: Overcrowding de avatares em cards pequenos. **Mitigação**: limitar a 2 avatares em mobile e usar `+N` para o restante.
- **Risco**: Traduções geradas automaticamente ficarem literais. **Mitigação**: revisar termos específicos de produtividade (Kanban, Pomodoro, etc.) em cada idioma.
- **Risco**: Performance ao carregar muitos membros/trabalhadores. **Mitigação**: manter subscriptions Realtime e invalidações por `boardId`.

## Dependências

- Não depende de backend novo: schema de colaboração já existe.
- Depende de ajustes nos hooks `useBoardCollab.ts` e nos componentes de UI.
- Depende de traduções em massa nos 12 arquivos JSON.

## Técnico resumido

```text
BoardDetail.tsx
  └─ Header colaborativo (avatares + botão Membros + badge Compartilhado)
  └─ Passa taskMembersMap e activeWorkers para ColumnContainer

TaskDetailDrawer.tsx
  └─ Nova aba "members" com TaskMemberAssigner
  └─ Exibe tempo por pessoa e indicador "focando agora"

TaskCard.tsx
  └─ Destaque de tarefa ativa do usuário
  └─ Avatares compactos para mobile

BoardInviteDialog.tsx
  └─ Mostra friend_code do usuário
  └─ Validações claras
  └─ Sheet no mobile

useBoardCollab.ts
  └─ useTaskMemberTimeTotals(taskId)
  └─ useMyFriendCode()

i18n/locales/*.json
  └─ Objeto "kanban" completo em 12 idiomas
```

## Nota sobre o estado atual das traduções

Hoje as telas do Kanban mostram textos em português mesmo quando o usuário escolheu outro idioma, porque as chaves `kanban.*` não existem nos arquivos de locale. O plano corrige isso criando o objeto completo em todos os idiomas e removendo fallbacks hardcoded.
