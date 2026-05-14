## Ajuste

O flair do avatar (anel animado) ficou perfeito — sem duplicação e respeitando a escolha do usuário. Mas o card da linha ficou pesado: gradiente de "desk", ribbon "PREMIUM" no canto, nome com gradiente dourado/azul. Isso é informação demais para o ranking do Explorar.

## Plano

Em `src/pages/Explore.tsx`, aba **Usuários**, voltar o card da linha ao visual limpo anterior, mantendo apenas o avatar com flair único:

- Remover classes `classroom-desk-premium` / `classroom-desk-pro` / `classroom-desk`.
- Remover os ribbons `<span className="plan-ribbon ...">Premium/Pro</span>`.
- Remover gradientes dourado/azul no nome — usar peso/cor padrão (apenas itálico+muted para anônimo, primary para "Você").
- Voltar para `rounded-xl border bg-card p-4 hover:shadow-md`, com `ring-2 ring-primary/40 bg-primary/5` quando for o próprio usuário e `border-yellow-500/30` no top 3 (igual ao layout original).
- **Manter** o `<PlanAvatarRing tier={...} flairId={u.avatar_flair} compact>` ao redor do `<Avatar>` (única correção de fato — sem o wrapper duplicado).
- **Manter** o `<PlanBadge tier={...} />` ao lado do nome (a "tag" Premium/Pro inline já comunica o plano).

Sem alterações em outros arquivos, hooks ou banco.