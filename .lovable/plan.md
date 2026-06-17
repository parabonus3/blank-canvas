## Objetivo
Transformar o TimeZoni em um PWA profissional, instalável em qualquer dispositivo (iOS, Android, Desktop), com suporte offline básico, auto-atualização e botão "Instalar app" visível na sidebar.

## Escopo

### 1. Infraestrutura PWA (vite-plugin-pwa)
- Instalar `vite-plugin-pwa` + `workbox-window`.
- Configurar em `vite.config.ts`:
  - `registerType: "autoUpdate"` (atualiza automático quando houver nova versão).
  - `injectRegister: null` (registro manual via wrapper seguro).
  - `devOptions: { enabled: false }` (nunca registra em dev/preview Lovable).
  - `workbox`:
    - `navigateFallback: "/index.html"`, **excluindo** `/~oauth` e rotas Supabase.
    - Runtime caching:
      - HTML/navegação → `NetworkFirst` (sempre busca atualização).
      - Assets hashados (JS/CSS/imagens locais) → `CacheFirst`.
      - Fontes Google → `CacheFirst` com expiração 30d.
      - Supabase API (`*.supabase.co/rest/*`, `/auth/*`, `/realtime/*`) → **NetworkOnly** (nunca cachear dados sensíveis nem auth).
    - `cleanupOutdatedCaches: true`.

### 2. Wrapper de registro seguro (`src/pwa/registerSW.ts`)
Recusa registrar (e desregistra SWs existentes) quando:
- `!import.meta.env.PROD`
- dentro de iframe
- hostname inclui `id-preview--`, `preview--`, `lovableproject.com`, `lovable.dev`, `lovableproject-dev.com`
- URL contém `?sw=off` (kill switch)

Quando atualização nova é detectada, dispara evento custom `pwa:update-available` consumido por um toast com botão "Atualizar agora" (recarrega aplicando `skipWaiting`).

### 3. Manifest + ícones (`public/manifest.webmanifest`)
- `name: "TimeZoni"`, `short_name: "TimeZoni"`.
- `display: "standalone"`, `start_url: "/"`, `scope: "/"`, `id: "/"`.
- `theme_color` e `background_color` alinhados ao design system (cores do `index.css`).
- `orientation: "portrait"`, `lang: "pt-BR"`, `categories: ["productivity"]`.
- Ícones gerados (192, 256, 384, 512 + 512 maskable + apple-touch-icon 180).
- `screenshots` (1 desktop + 1 mobile) para melhorar o prompt de instalação no Chrome/Edge.
- Adicionar `shortcuts`: Timer, Salas, Dashboard.

### 4. Tags no `index.html`
- `<link rel="manifest">`, `<meta name="theme-color">` (claro/escuro via media), `<link rel="apple-touch-icon">`, `<meta name="apple-mobile-web-app-capable">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `<meta name="apple-mobile-web-app-title">`.

### 5. Hook + botão de instalação
`src/hooks/usePWAInstall.ts`:
- Captura evento `beforeinstallprompt` (Chrome/Edge/Android) e armazena.
- Detecta iOS Safari (sem evento) para mostrar instruções manuais ("Compartilhar → Adicionar à Tela de Início").
- Detecta se já está instalado (`display-mode: standalone` ou `navigator.standalone`) e esconde o botão.
- Retorna `{ canInstall, isIOS, isInstalled, promptInstall() }`.

`src/components/pwa/InstallAppButton.tsx`:
- Botão na sidebar (acima do logout) com ícone `Download` e label traduzido.
- Em Android/Desktop: chama `prompt()` nativo.
- Em iOS: abre um `Dialog` com instruções ilustradas passo a passo.
- Some quando `isInstalled` é true.

Integração em `src/components/layout/Sidebar.tsx`, no `SidebarFooter`, antes do botão "Sair". Visível tanto em desktop quanto mobile (collapsed mode mostra só o ícone).

### 6. Toast de atualização (`src/components/pwa/UpdatePrompt.tsx`)
- Monta um `Sonner` toast persistente quando `pwa:update-available` dispara.
- Botões: "Atualizar agora" (recarrega) / "Depois".
- Montado uma vez em `App.tsx` ao lado dos outros `Toaster`.

### 7. i18n
Adicionar bloco `pwa.*` nos 12 locales:
- `install_button`, `install_title`, `install_desc`
- `ios_step_1`, `ios_step_2`, `ios_step_3`
- `update_available_title`, `update_available_desc`, `update_now`, `update_later`
- `already_installed`

### 8. Responsividade
- Botão da sidebar respeita o estado `collapsed` (só ícone) e modo offcanvas (mobile).
- Diálogo de instruções iOS: `max-h-[90dvh] overflow-y-auto`, `w-[calc(100%-1rem)]`.
- Toast empilha corretamente no mobile (já tratado pelo Sonner existente).

### 9. Não cachear dados sensíveis / autenticação
- Regras explícitas de bypass para domínio Supabase e `/~oauth`.
- HTML sempre `NetworkFirst` → toda atualização de UI/tradução chega na próxima visita sem usuário precisar limpar nada.

## Arquivos a criar
- `public/manifest.webmanifest`
- `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` (gerados)
- `src/pwa/registerSW.ts`
- `src/hooks/usePWAInstall.ts`
- `src/components/pwa/InstallAppButton.tsx`
- `src/components/pwa/UpdatePrompt.tsx`
- `src/components/pwa/IOSInstallDialog.tsx`

## Arquivos a editar
- `vite.config.ts` (plugin PWA)
- `index.html` (manifest + meta tags Apple)
- `src/main.tsx` (chamar `registerSW()` do wrapper)
- `src/App.tsx` (montar `<UpdatePrompt />`)
- `src/components/layout/Sidebar.tsx` (botão Install no footer)
- 12 arquivos em `src/i18n/locales/*.json` (chaves `pwa.*`)
- `package.json` / `bun.lock` (novas deps)

## Fora de escopo
- Push notifications (web push exige worker dedicado — fica para etapa futura).
- Offline real de dados Supabase (apenas shell + assets ficam offline; chamadas de API continuam online).
- Publicação em App Store/Play Store (caminho Capacitor é separado).

## Como o usuário verá
1. Em produção (`timezoni.com` / `timezonii.lovable.app`), aparece "Instalar app" na sidebar.
2. Android/Desktop: 1 clique instala.
3. iPhone: abre tutorial visual ("Compartilhar → Adicionar à Tela de Início").
4. Quando você publicar uma nova versão, qualquer usuário com o app aberto recebe um toast "Nova versão disponível → Atualizar agora".
5. No editor/preview do Lovable nada muda (SW desativado por segurança).
