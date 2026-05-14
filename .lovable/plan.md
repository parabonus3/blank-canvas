## Diagnóstico

Na aba **Explorar → Usuários** (image-45), os avatares aparecem com um "halo" duplicado e desorganizado. Isso acontece porque em `src/pages/Explore.tsx` (linhas 339‑357) o avatar foi envolvido por **dois componentes que renderizam o mesmo flair**:

```tsx
<AvatarFlair tier={...} flairId={u.avatar_flair} compact>
  <PlanAvatarRing tier={...}>      // ← PlanAvatarRing É AvatarFlair (shim)
    <Avatar />
  </PlanAvatarRing>
</AvatarFlair>
```

`PlanAvatarRing` em `src/components/rooms/PlanBadge.tsx` é apenas um wrapper que delega para `AvatarFlair`. Resultado: **dois conjuntos de aros, glows e gradientes empilhados** — o que vemos nas imagens.

Além disso o `PlanAvatarRing` interno **não recebia `flairId`**, então mostrava o flair-default do tier em vez do flair escolhido pelo usuário.

Outro ponto: o card do usuário na aba Explorar usa um visual genérico (`border bg-card`), enquanto dentro da sala o membro aparece com o visual rico `classroom-desk-{tier}` (com aro premium/pro, ribbon de canto, gradiente). O pedido é que esses dois lugares fiquem **consistentes**.

## Plano de correção (somente UI)

### 1. `src/pages/Explore.tsx` — aba Usuários
- Remover o wrapper externo `<AvatarFlair>` que duplica o flair.
- Manter apenas **um** `<PlanAvatarRing>` ao redor do `<Avatar>`, passando `flairId={u.avatar_flair}` para usar o flair escolhido pelo usuário.
- Aplicar o mesmo padrão visual usado em `RoomMemberGrid.tsx` no card da linha:
  - Classes `classroom-desk-premium` / `classroom-desk-pro` / `classroom-desk` conforme `u.plan_tier`.
  - Ribbon de canto `plan-ribbon plan-ribbon-{tier}` para Premium/Pro.
  - Nome com gradiente dourado (premium) ou azul (pro), igual ao membro na sala.
  - Manter o `ring-2 ring-primary/40` quando for o próprio usuário (`isMe`) e o `#1/medalha` para o top 3.
- Remover o import `AvatarFlair` (que ficará sem uso) — manter apenas `PlanAvatarRing` e `PlanBadge`.

### 2. Verificar consistência (read-only nesta etapa)
- `FriendsList.tsx`, `FriendProfileModal.tsx`, `MemberProfileModal.tsx` e `RoomMemberGrid.tsx` já usam **um único** `PlanAvatarRing flairId={...}` — não precisam de alteração.
- Card da **sala** (Explore → Salas) usa `RoomFrame` e não envolve avatares — sem mudança.

### 3. Sem alterações de banco / lógica
- Nenhuma migration, nenhum hook, nenhuma RPC alterada.
- Mudança 100% de apresentação no arquivo `src/pages/Explore.tsx`.

## Resultado esperado

- Cada usuário no ranking de Explorar terá **um único anel animado** correspondente ao flair escolhido nas configurações, idêntico ao que aparece dentro da sala e no perfil.
- Linhas Premium/Pro ganham o mesmo "desk" (gradiente + ribbon de canto + nome dourado/azul) que o membro tem na sala.
- Fim do efeito de halo duplicado/borrão das imagens.