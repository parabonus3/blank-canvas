## Objetivo

Reorganizar o sistema visual: remover totalmente o "fundo de perfil" do usuário, transformar o "fundo da sala" em **contorno animado** (frame/border) e garantir que o **estilo de avatar** já configurado em Configurações apareça consistentemente em Explorar, Salas e Amigos.

---

## 1. Remover fundo de perfil do usuário

- Remover `ProfileBackgroundPicker` da página `Settings.tsx` e deletar o componente `src/components/settings/ProfileBackgroundPicker.tsx`.
- Remover `profile_background` do tipo `Profile` (`useProfile.ts`) e de `RoomMember` (`useRoomMembers.ts`).
- Remover renderização de wallpaper de perfil em:
  - `RoomMemberGrid.tsx` (cards dos membros dentro da sala)
  - `Explore.tsx` (cards de usuários no ranking)
- Remover chaves i18n `settings.profile_background.*` em `pt-BR.json` e `en-US.json`.
- **Migration**: dropar coluna `profiles.profile_background`, trigger `validate_profile_background` e ajustar RPCs (`get_room_member_profiles`, `get_public_rooms_ranking_by_period`, `get_room_public_preview`) para não retornarem mais esse campo.

## 2. Transformar wallpaper de sala em contorno animado

- Refatorar `src/lib/wallpapers.ts`: renomear catálogo para **Room Frames** (contornos). Manter tiers (free/pro/premium). Cada frame define apenas:
  - cor/gradiente da borda
  - animação (rotação de gradiente cônico, shimmer, pulse, aurora flow, etc.) aplicada **somente à borda**
- Reescrever `src/components/Wallpaper.tsx` → renomear para `RoomFrame.tsx`. Renderizar um `<div>` de moldura com `padding` fino e `background` animado que envolve o conteúdo (técnica: gradiente animado no wrapper + `inset` sólido no filho com `bg-background`). Sem cobrir o interior da sala.
- Adicionar/ajustar keyframes em `index.css`: `frame-rotate` (conic-gradient spin), `frame-shimmer`, `frame-aurora-flow`, `frame-pulse`. Remover keyframes antigos de fundo cheio (`wallpaper-aurora`, `wallpaper-galaxy`, `wallpaper-mesh`, `wallpaper-flame`) que não serão mais usados.
- Em `RoomDetail.tsx`: remover wallpaper full-page; aplicar o `RoomFrame` envolvendo o container principal da sala (efeito moldura).
- Em `Explore.tsx` (cards de salas) e `Rooms.tsx` (lista): aplicar `RoomFrame` como borda do card da sala.
- Renomear no banco: manter coluna `study_rooms.room_background` (nome técnico) mas tratar como id do frame; atualizar trigger `validate_room_background` para validar contra a nova lista de ids (`frame-free-*`, `frame-pro-*`, `frame-premium-*`).

## 3. Renomear UI e i18n

- `RoomBackgroundPicker.tsx` → `RoomFramePicker.tsx`. Preview agora mostra um quadrado com **apenas a borda animada**, interior neutro.
- Chaves i18n: `rooms.background.*` → `rooms.frame.*` (título "Contorno da sala", descrição "Escolha um contorno animado para destacar sua sala").
- Atualizar `RoomSettingsTab.tsx` para usar o novo picker.

## 4. Garantir avatar flair consistente

Já existe `AvatarFlair` em `src/components/avatar/AvatarFlair.tsx` e `resolveFlair()`. Auditar e padronizar uso:

- **Explorar (`Explore.tsx`)**: tanto no ranking de usuários quanto nos cards de salas que mostram membros, envolver `<Avatar>` com `<AvatarFlair flairId={...} color={...}>`.
- **Amigos (`FriendsList.tsx`, `FriendProfileModal.tsx`, `AddFriendDialog.tsx`)**: idem.
- **Salas (`RoomMemberGrid.tsx`, `MemberProfileModal.tsx`, `RoomChat.tsx`, `RoomRankingSidebar.tsx`)**: confirmar que todos os avatares usam `AvatarFlair`.
- Garantir que as RPCs que listam usuários retornam `avatar_flair` e `avatar_flair_color` (já retornam para membros de sala; verificar `get_public_rooms_ranking_by_period` e RPCs de amigos).

---

## Detalhes técnicos do contorno animado

Estrutura padrão do `RoomFrame`:

```text
<div class="relative rounded-xl p-[2px] [animated-gradient-border]">
  <div class="rounded-[inherit] bg-background">
     {children}  ← conteúdo intocado
  </div>
</div>
```

- Free: borda sólida sutil (sem animação).
- Pro: gradiente linear animado (shimmer horizontal).
- Premium: `conic-gradient` rotacionando 360° (spin) ou aurora flow multi-cor.

Performance: usar `will-change: background-position/transform` apenas quando animado; respeitar `motion-reduce`.

---

## Arquivos afetados (resumo)

**Deletar**: `src/components/settings/ProfileBackgroundPicker.tsx`

**Renomear**: `Wallpaper.tsx` → `RoomFrame.tsx`; `RoomBackgroundPicker.tsx` → `RoomFramePicker.tsx`; `src/lib/wallpapers.ts` → `src/lib/roomFrames.ts`

**Editar**: `Settings.tsx`, `RoomSettingsTab.tsx`, `RoomDetail.tsx`, `Explore.tsx`, `Rooms.tsx`, `RoomMemberGrid.tsx`, `FriendsList.tsx`, `FriendProfileModal.tsx`, `useProfile.ts`, `useRoomMembers.ts`, `useRooms.ts`, `index.css`, locais pt-BR/en-US.

**Migration**: drop `profile_background` + trigger; atualizar `validate_room_background` e RPCs relacionadas.
