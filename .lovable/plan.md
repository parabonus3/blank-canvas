## Situação atual

Boa notícia: a logo do TimeZoni já está em uso no app. Após inspeção:

- `public/logo.png` → já é a logo do TimeZoni (o "Z" com ondas).
- `public/favicon.ico` → também já é a logo do TimeZoni (não é o ícone do Lovable).
- `index.html` → já referencia `/logo.png` no favicon, OG image e Twitter image. Não há nenhuma menção textual ao "Lovable".
- Componentes do app (Sidebar, Auth, etc.) → todos usam `@/assets/logo.png`, que também é a logo do TimeZoni.

As únicas referências ao "Lovable" que sobraram no projeto são:

1. **`README.md`** — texto institucional padrão do template Lovable (URL do projeto, instruções de edição). Não aparece em nenhum lugar para o usuário final.
2. **`package.json` + `vite.config.ts`** — pacote `lovable-tagger`, usado apenas em modo de desenvolvimento dentro do editor Lovable (não vai para produção, não aparece para o usuário). **Não pode ser removido** sem quebrar o ambiente de edição.

## O que será alterado

### 1. Substituir `public/favicon.ico` pela logo do TimeZoni em formato `.ico`
Mesmo o atual já sendo a logo do TimeZoni, vou regenerá-lo a partir de `public/logo.png` para garantir nitidez em múltiplos tamanhos (16x16, 32x32, 48x48) — assim a aba do navegador exibe a logo limpa em qualquer DPI.

### 2. Adicionar favicon de alta resolução para dispositivos modernos
Atualizar `index.html` para incluir:
- `<link rel="icon" type="image/x-icon" href="/favicon.ico">` (fallback)
- `<link rel="icon" type="image/png" sizes="32x32" href="/logo.png">`
- `<link rel="apple-touch-icon" href="/logo.png">` (para iOS)

### 3. Reescrever `README.md`
Substituir o conteúdo padrão do Lovable por um README do TimeZoni (descrição do projeto, stack, como rodar localmente). Sem links nem menções ao Lovable.

## O que NÃO será alterado (e por quê)

- **`lovable-tagger` em `package.json` / `vite.config.ts`**: É uma dependência interna do editor Lovable usada só em `mode === 'development'`. Não é incluída no build de produção, não aparece para o usuário final, e removê-la quebra o ambiente de edição visual.
- **Pasta `.lovable/`**: arquivos internos do editor, invisíveis ao usuário.

## Detalhes técnicos

- O novo `favicon.ico` será gerado via ImageMagick (`nix run nixpkgs#imagemagick`) a partir de `public/logo.png`, empacotando 16/32/48px no mesmo `.ico`.
- O `index.html` ganha 2 tags `<link>` adicionais para cobrir Apple Touch e PNG nativo, mantendo a tag de favicon existente.

## Verificação

Após as mudanças:
- Recarregar o preview e confirmar que a aba do navegador mostra o "Z" do TimeZoni.
- Testar em mobile (Apple Touch Icon).
- Confirmar que o `README.md` não tem mais nenhuma menção ao Lovable.
