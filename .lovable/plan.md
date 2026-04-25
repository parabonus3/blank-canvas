## Objetivo

Refinar a seção "Estilo do Avatar" em Configurações para ficar mais limpa, remover a menção a "Discord Nitro", e adicionar transparência sobre quais efeitos cada plano (Pro vs Premium) inclui na página de Planos.

---

## Parte 1 — Limpar a UI do AvatarFlairPicker

Arquivo: `src/components/settings/AvatarFlairPicker.tsx`

### Remover menção ao Discord Nitro
- Trocar a `CardDescription` atual:
  - De: *"Disponível em Pro e Premium — escolha um efeito animado para seu avatar (estilo Discord Nitro)."*
  - Para: *"Escolha um efeito animado exclusivo para destacar seu avatar em salas, lista de amigos e perfis."*
- Remover qualquer outra referência a "Discord" / "Nitro" no componente.

### Mostrar apenas 4 flairs por padrão + botão "Mostrar mais"
- Adicionar estado `expanded: Record<FlairCategory, boolean>` (default `false`).
- Para cada categoria:
  - Se `expanded[cat] === false` → renderizar **apenas os primeiros 4** flairs daquela categoria.
  - Se `true` → renderizar todos.
- Abaixo do grid de cada categoria (apenas quando `items.length > 4`):
  - Botão `variant="outline"` largura total, com ícone `ChevronDown`/`ChevronUp` (Lucide) e texto:
    - Fechado: *"Mostrar mais (+N)"* onde N = `items.length - 4`
    - Aberto: *"Mostrar menos"*
  - Estilo: borda sutil, hover com leve gradiente da categoria, transição suave.
- Hoje categorias com >4: **Especiais (7)**. Demais (Clássicos 4, Dark 3, Femininos 4) ficam sem o botão.

### Pequenos ajustes de layout
- Manter os cabeçalhos coloridos por categoria.
- Adicionar `transition-all` e `animate-fade-in` nos itens revelados ao expandir.
- Free continua vendo blur + paywall (sem alteração de comportamento).

---

## Parte 2 — Comunicar diferença Pro vs Premium nos Planos

### `src/lib/stripePlans.ts`
Já existem `avatar_flair_pro` e `avatar_flair_premium` em features. Não mudar a estrutura — só refinar as labels nos i18n.

### i18n: `src/i18n/locales/pt-BR.json` e `en-US.json`
Atualizar os textos das features de avatar flair para serem específicos:

- `avatar_flair_pro`:
  - PT: **"7 efeitos animados no avatar (Clássicos, Dark e Femininos)"**
  - EN: **"7 animated avatar effects (Classic, Dark and Feminine)"**
- `avatar_flair_premium`:
  - PT: **"Todos os 18 efeitos animados (+ Especiais exclusivos: Chamas, Coroa, Galáxia, Aurora…)"**
  - EN: **"All 18 animated effects (+ exclusive Specials: Flames, Crown, Galaxy, Aurora…)"**

### `src/pages/Pricing.tsx` e/ou `src/components/landing/PricingSection.tsx`
- Verificar se já renderizam features pelos i18n keys. Se sim, a mudança acima já reflete automaticamente.
- Se houver uma seção de comparação destacada (highlights), adicionar uma linha visual destacando o avatar flair com pequeno preview animado lado a lado:
  - Pro: ícone `Sparkles` + "7 efeitos"
  - Premium: ícone `Crown` dourado + "18 efeitos + Especiais"
- Manter consistência com os badges de plano já existentes.

---

## Resumo de arquivos

**Editados**
- `src/components/settings/AvatarFlairPicker.tsx` — remover "Discord Nitro", mostrar 4 + botão "Mostrar mais/menos" por categoria
- `src/i18n/locales/pt-BR.json` — refinar textos `avatar_flair_pro` / `avatar_flair_premium`
- `src/i18n/locales/en-US.json` — idem
- `src/pages/Pricing.tsx` (se necessário) — destacar visualmente diferença Pro vs Premium em flairs

Sem mudanças em banco de dados, sem novas dependências.
