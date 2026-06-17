## Problema
O botão atual de instalar PWA fica só no rodapé da sidebar (área autenticada). Usuários não-logados na landing não veem nenhuma chamada para instalar, e mesmo logados o botão passa despercebido. Também não aparece no preview Lovable (SW desativado lá), o que confunde no teste.

## Solução: "Smart Install" em 3 pontos

### 1. Componente central `SmartInstallButton`
Botão reutilizável que decide sozinho o que fazer baseado no ambiente:
- Se já instalado (`display-mode: standalone`) → não renderiza.
- Se Android/Chrome/Edge/desktop com `beforeinstallprompt` capturado → dispara prompt nativo.
- Se iOS Safari → abre o `IOSInstallDialog` já existente.
- Se outro navegador sem suporte (ex.: Firefox desktop, Safari macOS) → abre um novo `ManualInstallDialog` explicando "use Chrome/Edge para instalar" ou as instruções específicas do navegador.
- Props: `variant` ("hero" | "compact" | "icon"), `className`.

### 2. `InstallBanner` (topo do app)
Banner fino, dispensável, exibido quando `canInstall && !isInstalled && !dismissed`:
- Posição: logo abaixo do header em `MainLayout` e no topo da `Landing`.
- Texto: "Instale o TimeZoni no seu dispositivo" + botão "Instalar" + "X" para dispensar.
- Persistência do dismiss em `localStorage` (`tz_pwa_banner_dismissed_at`) com cooldown de 7 dias (reaparece depois).
- Responsivo: em mobile fica compacto (só ícone + label curto + X).

### 3. CTA na landing (`Landing.tsx`)
Adicionar um botão "Baixar app" ao lado de "Começar Grátis" no hero, usando `SmartInstallButton variant="hero"`. Só aparece se `canInstall`.

### 4. Substituir o botão atual da sidebar
`InstallAppButton.tsx` passa a renderizar `<SmartInstallButton variant="compact" />` (mantém aparência atual, mas com a lógica nova).

### 5. i18n (12 idiomas)
Adicionar ao bloco `pwa.*`:
- `banner_title`, `banner_cta`, `banner_dismiss`
- `hero_cta` ("Baixar app" / "Get the app" / etc.)
- `manual_title`, `manual_desc_chrome`, `manual_desc_firefox`, `manual_desc_safari_mac`, `manual_desc_other`
- `desktop_step_1`, `desktop_step_2` (instruções genéricas Chrome/Edge: "clique no ícone de instalação na barra de endereço")

### 6. Detecção de navegador
Pequena util `src/lib/browserDetect.ts` que classifica em `"chromium" | "firefox" | "safari-mac" | "safari-ios" | "other"`. Usada pelo `ManualInstallDialog` para escolher a mensagem certa.

### 7. Preview Lovable
No iframe do editor Lovable o SW e `beforeinstallprompt` não disparam — isso é esperado e desejado. O botão simplesmente não aparece lá. Vou adicionar um comentário no código + uma nota visível só em dev (`import.meta.env.DEV`) abaixo do botão "Instalar app" da sidebar: "Disponível no app publicado". Assim você sabe testar via `timezoni.com`/`timezonii.lovable.app`.

## Arquivos a criar
- `src/components/pwa/SmartInstallButton.tsx`
- `src/components/pwa/InstallBanner.tsx`
- `src/components/pwa/ManualInstallDialog.tsx`
- `src/lib/browserDetect.ts`

## Arquivos a editar
- `src/components/pwa/InstallAppButton.tsx` (delegar para SmartInstallButton)
- `src/components/layout/MainLayout.tsx` (montar `<InstallBanner />`)
- `src/pages/Landing.tsx` (adicionar CTA no hero)
- 12 × `src/i18n/locales/*.json` (novas chaves `pwa.*`)

## Fora de escopo
- Push notifications, modo offline real de dados, badges de app, integrações nativas.
- Mudar visual da landing além de adicionar 1 botão no hero.

## Resultado
- Visitante na landing: vê CTA "Baixar app" se o navegador suporta.
- Usuário logado: vê banner discreto no topo (uma vez por semana se dispensado) + botão na sidebar.
- iOS: sempre abre tutorial visual.
- Navegadores sem suporte: instruções específicas em vez de botão "morto".
- Tudo em 12 idiomas, responsivo mobile/desktop.
