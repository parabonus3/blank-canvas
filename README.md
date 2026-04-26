# TimeZoni

App de foco e produtividade com timer, Pomodoro, sons ambiente, salas de estudo, gamificação e estatísticas detalhadas para ajudar você a gerenciar seu tempo.

## Stack

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (auth, database, edge functions, storage, realtime)
- **i18n:** react-i18next (12 idiomas)
- **Pagamentos:** Stripe

## Rodando localmente

Pré-requisitos: Node.js 18+ e npm (ou bun).

```sh
# 1. Clone o repositório
git clone <SEU_GIT_URL>
cd timezoni

# 2. Instale dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação ficará disponível em `http://localhost:8080`.

## Build de produção

```sh
npm run build
npm run preview
```

## Estrutura

```
src/
  components/    # Componentes React (UI, features, layout)
  contexts/      # Context providers (Auth, Timer, Pomodoro, Theme...)
  hooks/         # Hooks customizados
  pages/         # Páginas / rotas
  i18n/          # Traduções
  integrations/  # Cliente Supabase
  lib/           # Utilitários
supabase/
  functions/     # Edge functions
  migrations/    # Migrations SQL
```

## Domínios

- Produção: [timezoni.com](https://timezoni.com)
