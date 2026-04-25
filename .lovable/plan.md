## Visão geral

Modernizar dois painéis com a mesma experiência: **busca avançada, filtros relevantes, paginação de 50 por página, exportação PDF/CSV e ações úteis para escalar**. Tudo com i18n em todos os idiomas.

---

## 1) Painel Admin (`/admin`)

### Novos recursos para gestão de usuários

**Toolbar superior**
- Busca avançada (email, nome, friend_code, ID)
- Filtros: Status (free/trial/active/expired/banned), Plano (Free/Pro/Premium + intervalo mensal/anual), Papel (admin, agente, usuário), Período de cadastro (hoje/7d/30d/custom), Trial expirando em (3d/7d/30d), Atividade (ativo/inativo 30d)
- Ordenação: cadastro, último login, total de horas, plano
- Botão **Exportar**: PDF (jsPDF) e CSV
- Contador "X de Y usuários"
- Botão limpar filtros

**Paginação server-side**
- 50 usuários por página com Anterior/Próxima e indicador "Página X de Y"
- Edge function `admin-users` recebe `page`, `perPage`, `search`, `filters`, `sort` e devolve `{ users, total, page, totalPages }`
- Toggle "por página": 25 / 50 / 100

**Novas ações por usuário** (além das existentes editar/reset/plano/cancelar/deletar)
- **Banir / Suspender** (defensiva): bloqueia login imediato sem deletar dados
- **Reativar** usuário banido
- **Promover/Remover admin** (gerencia `user_roles`)
- **Promover/Remover agente de suporte** (gerencia `support_agents`)
- **Ver detalhes**: drawer lateral com perfil completo, histórico de tickets, total de horas, último login, IP do último acesso, assinatura Stripe, salas que participa
- **Enviar e-mail manual** (campo livre via edge function)
- **Ações em massa** (checkbox por linha): banir, exportar selecionados, alterar plano em lote

**Cards de stats expandidos**
- Total | Ativos | Trial | Expirados | **Banidos** | **Novos hoje** | **Receita ativa estimada** (soma de planos ativos)

### Backend
- Migração: adicionar coluna `is_banned boolean default false` e `banned_at timestamptz` em `profiles`; trigger ou RLS para bloquear ações de banidos onde fizer sentido
- Edge function `admin-users` ganha actions: `ban_user`, `unban_user`, `grant_role`, `revoke_role`, `grant_support_agent`, `revoke_support_agent`, `send_email`, `get_user_details` e suporte a paginação/filtros/sort no `list_users`
- Para banir: chamar `supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' })` + atualizar flag

---

## 2) Painel SAC

### Dashboard de tickets (`/sac/dashboard`)
- **Busca** por assunto, e-mail, ID, conteúdo da mensagem
- Filtros existentes (status, prioridade, categoria) + novos:
  - **Atribuído a** (agente específico, não atribuído, eu)
  - **Período** (hoje/7d/30d/custom)
  - **Plano do usuário** (Free/Pro/Premium) — útil para priorizar pagantes
  - **Tempo aberto** (>1h, >24h, >7d) para SLA
- Ordenação: prioridade+data (atual), mais antigo, mais novo, último update
- **Paginação 50 por página** com Anterior/Próxima
- **Ações em massa**: marcar como resolvido/fechado, atribuir a agente, mudar prioridade
- **Exportar**: PDF e CSV dos tickets filtrados
- Stats expandidos: Abertos | Em andamento | Resolvidos hoje | Tempo médio de espera | **Sem atribuição** | **SLA estourado (>24h aberto)**

### Meus tickets (`/sac/tickets`)
- Busca por assunto/conteúdo
- Filtro por status
- Paginação 50/página
- Botão exportar histórico (PDF) próprio

### Gerenciar agentes (`/sac/agents`)
- Busca por e-mail/nome
- Filtros: papel (admin/agente), status (ativo/inativo)
- Paginação 50/página
- Coluna nova: **e-mail real** (hoje mostra apenas user_id), **tickets atribuídos**, **resolvidos no mês**
- Ações em massa: ativar/desativar, mudar papel
- Exportar lista de agentes

---

## 3) Componente reutilizável de paginação + exportação

Criar componentes compartilhados:
- `PaginatedTable` (já existe `PaginationControls`, vamos estender)
- `useTableState` hook: gerencia search, filtros, sort, page, perPage com persistência em URL (`?page=2&status=open`)
- `exportToPDF(data, columns, title)` em `src/lib/exportTable.ts` usando jsPDF + jspdf-autotable
- `exportToCSV(data, columns, filename)` no mesmo arquivo

---

## 4) Internacionalização

Todas as novas strings (filtros, ações de banir, exportar, paginação, mensagens de confirmação, badges de status banido) traduzidas nos 12 idiomas: pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ru-RU, ja-JP, ko-KR, zh-CN, ar-SA, id-ID.

---

## Detalhes técnicos

**Migração SQL necessária:**
```
ALTER TABLE public.profiles 
  ADD COLUMN is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN banned_at timestamptz,
  ADD COLUMN banned_reason text;
```

**Pacotes a adicionar:**
- `jspdf` + `jspdf-autotable` para exportação PDF de tabelas

**Estrutura de arquivos novos/alterados:**
- `src/lib/exportTable.ts` (novo) — helpers PDF/CSV
- `src/hooks/useTableState.ts` (novo) — estado de tabela com URL sync
- `src/components/admin/AdminFilters.tsx` (novo)
- `src/components/admin/UserDetailDrawer.tsx` (novo)
- `src/components/admin/BulkActionsBar.tsx` (novo)
- `src/pages/Admin.tsx` (refatorar)
- `src/pages/sac/SacDashboard.tsx` (refatorar)
- `src/pages/sac/MyTickets.tsx` (busca + paginação)
- `src/pages/sac/AgentManager.tsx` (busca + paginação + colunas extras)
- `src/components/sac/TicketFilters.tsx` (adicionar filtros novos)
- `src/hooks/useAdmin.ts` (suporte a paginação/filtros + novas mutations: ban, unban, grant_role, etc.)
- `src/hooks/useSupportTickets.ts` (paginação server-side + filtro por agente)
- `supabase/functions/admin-users/index.ts` (novas actions e paginação)
- `supabase/functions/sac-admin/index.ts` (action para listar agentes com email + stats)
- `src/i18n/locales/*.json` (12 idiomas)

**RLS / segurança:**
- Banir usa `auth.admin.updateUserById` com `ban_duration` — bloqueia login no Supabase Auth
- Promoção de admin valida que o caller já é admin (já feito) e impede auto-rebaixamento
- Exportação PDF/CSV é feita no cliente com dados já filtrados (sem expor dados extras)
