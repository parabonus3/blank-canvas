## Objetivo

1. Reformular os flairs **Chamas** e **Coroa** (sem emoji) e adicionar uma nova categoria **Dark** + estilos **Femininos**, todos puramente em CSS animado.
2. Resolver o "achatamento" da imagem do avatar adicionando um **editor de avatar** com zoom + reposicionamento (estilo Discord/Telegram), salvando a versão recortada.

---

## Parte 1 — Redesign dos Flairs (sem emoji)

### Remover emojis dos flairs existentes
- `premium-flames`: tirar os 🔥. Substituir por **anel de fogo CSS** — múltiplas camadas de `radial-gradient` laranja/vermelho com `mask` e blur, usando keyframes `flame-flicker` (escala + opacidade pulsando irregularmente) + `flame-rotate` lento. Resultado: "halo de fogo" envolvendo o avatar.
- `premium-crown`: tirar o 👑. Substituir por **diadema CSS** — pseudo-elementos com `clip-path` formando uma silhueta de coroa minimalista em ouro, com gradiente animado e brilho `drop-shadow` pulsante. Posicionado acima do anel sem texto/emoji.
- `premium-sparkles`: trocar caracteres `✦/✧` por **partículas CSS** (pequenos `div` redondos com `box-shadow` brilhante) orbitando — já existe a base, só remover os caracteres.
- `premium-galaxy`: já é puro CSS, manter.

### Novos flairs Premium
| ID | Nome | Visual |
|---|---|---|
| `premium-obsidian` | Obsidiana | Anel preto profundo com reflexo prateado deslizante (gradiente cônico preto→cinza→preto) + sombra interna |
| `premium-void` | Vazio | Anel preto absoluto com partículas roxas/azuis pulsando, halo escuro |
| `premium-rose` | Rosé | Gradiente rosa-claro → coral → dourado, brilho suave feminino, partículas em forma de pétala (CSS `border-radius` assimétrico) flutuando |
| `premium-pearl` | Pérola | Anel iridescente branco/rosa/azul-bebê com shimmer perolado, halo suave |
| `premium-butterfly` | Borboleta | Anel rosa/violeta com 2 "asas" CSS (clip-path) batendo suavemente nas laterais |

### Novos flairs Pro
| ID | Nome | Visual |
|---|---|---|
| `pro-noir` | Noir | Anel preto/grafite minimalista com linha cyan deslizante |
| `pro-blossom` | Florescer | Gradiente rosa-claro → lavanda suave, pulso delicado |

### Organização visual no picker
- Agrupar por **categoria** (não só por tier) com tabs ou seções: **Clássicos**, **Dark**, **Femininos**, **Especiais**.
- Cada categoria com cabeçalho pequeno e ícone (Lucide: `Sparkles`, `Moon`, `Flower`, `Star`).
- Cards dos flairs maiores com mais respiro, hover com leve `scale` e `shadow`, selecionado com borda gradiente animada.
- Adicionar `category` ao `AvatarFlairDef` em `src/lib/avatarFlairs.ts`.

### Arquivos
- `src/lib/avatarFlairs.ts` — adicionar campo `category`, novos IDs
- `src/components/avatar/AvatarFlair.tsx` — substituir blocos `premium-flames` e `premium-crown`, adicionar novos casos
- `src/index.css` — novos keyframes: `flame-flicker`, `flame-rotate`, `petal-float`, `pearl-shimmer`, `wing-flap`, `void-pulse`
- `src/components/settings/AvatarFlairPicker.tsx` — agrupar por categoria, melhorar visual

---

## Parte 2 — Editor de imagem do avatar (zoom + reposicionar)

### Comportamento atual
Em `Settings.tsx` (linhas 112-149) o arquivo é enviado direto pro Supabase Storage. O `<AvatarImage>` aplica `object-cover` então imagens não-quadradas são cortadas no centro — daí a sensação de "achatamento/compressão".

### Solução
Após o usuário escolher arquivo, abrir um **diálogo de edição** antes do upload:

- Componente novo: `src/components/settings/AvatarCropDialog.tsx`
- Usa `<canvas>` puro (sem libs novas) com:
  - Imagem carregada no centro
  - **Slider de zoom** (1x → 3x)
  - **Arrastar com mouse/touch** para reposicionar
  - Máscara circular mostrando o recorte final (preview)
- Ao confirmar: gera blob 512×512 quadrado via `canvas.toBlob('image/webp', 0.9)` → faz upload (substituindo o fluxo atual).
- Cancelar fecha o dialog sem upload.

### Bônus de qualidade
- Antes de exibir no canvas, redimensionar para no máx 1024px no maior lado (evita memória alta).
- Forçar saída como `.webp` (ou `.jpg` fallback) para garantir tamanho pequeno e nome consistente (`avatar.webp`), eliminando o problema de extensões variáveis.
- Manter o cache-busting `?t=Date.now()` já existente.

### Arquivos
- Novo: `src/components/settings/AvatarCropDialog.tsx`
- Editar: `src/pages/Settings.tsx` — `handleAvatarUpload` agora abre o dialog ao invés de subir direto; ao confirmar, recebe o blob recortado e faz upload.

---

## Detalhes técnicos

- **Sem novas dependências** — crop usa Canvas API nativo, flairs usam CSS puro.
- `prefers-reduced-motion` continua respeitado em todos os novos keyframes.
- Tipos do Supabase (`avatar_flair`) já cobrem os novos IDs (string), nenhuma migração necessária.
- Backward compat: IDs existentes mantidos; usuários com `premium-flames`/`premium-crown` veem automaticamente a versão nova/melhor.
- Picker mantém a lógica de bloqueio por tier e a paywall para Free.

---

## Resumo de arquivos

**Novos**
- `src/components/settings/AvatarCropDialog.tsx`

**Editados**
- `src/lib/avatarFlairs.ts` (novos flairs + categorias)
- `src/components/avatar/AvatarFlair.tsx` (renderização sem emoji + novos casos)
- `src/components/settings/AvatarFlairPicker.tsx` (UI agrupada por categoria)
- `src/index.css` (novos keyframes)
- `src/pages/Settings.tsx` (integrar crop dialog ao upload)
