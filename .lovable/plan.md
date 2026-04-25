# Plano: Flair Animado Pro/Premium estilo Discord + Defensivas nos Planos

## Visão geral
Hoje, na lista de **Amigos**, usuários Premium aparecem com um halo dourado animado bonito. Em **Salas** o destaque também existe, mas é estático e o mesmo para todos. Vamos transformar isso em um **sistema de flair (efeito de avatar) escolhível** — como Discord faz com Nitro — onde Pro/Premium escolhem qual animação querem usar, e ela aparece **em todos os lugares** (salas, lista de amigos, modal de perfil de amigo, modal de membro de sala). Premium recebe efeitos exclusivos mais elaborados que Pro.

Também faltam as **defensivas (streak freeze)** nas listas de features dos planos — vamos adicionar.

## 1. Banco — preferência de flair por usuário

Adicionar coluna em `profiles`:
- `avatar_flair` text, default `'default'`
- `avatar_flair_color` text, nullable (hex opcional para customizar a cor base de alguns flairs)

Atualizar RPCs que retornam membros/amigos/ranking (`get_room_members_with_status`, `get_friend_profiles`, `get_global_user_ranking`, etc.) para incluir `avatar_flair` e `avatar_flair_color`. Listar e migrar todas que já retornam `plan_tier`.

## 2. Catálogo de flairs (`src/lib/avatarFlairs.ts`)

Define um array tipado de flairs com `id`, `name`, `description`, `tier` (`pro` ou `premium`), `preview` (componente). Catálogo proposto:

**Pro (4 flairs):**
- `pro-pulse` — anel azul com pulse suave (atual)
- `pro-orbit` — pequeno ponto orbitando
- `pro-shimmer` — gradiente cyan→azul deslizando
- `pro-wave` — ondas concêntricas saindo do avatar

**Premium (7 flairs, mais elaborados):**
- `premium-gold` — halo dourado giratório (atual)
- `premium-flames` — chamas douradas subindo nas bordas
- `premium-sparkles` — partículas/estrelas girando ao redor
- `premium-rainbow` — anel arco-íris animado
- `premium-aurora` — gradiente tipo aurora boreal
- `premium-crown` — coroa flutuando acima do avatar com glow
- `premium-galaxy` — partículas estilo galáxia girando

Todos usam apenas CSS keyframes + SVG inline (sem libs).

## 3. Componente `AvatarFlair`

Substitui o atual `PlanAvatarRing`. Assinatura:

```tsx
<AvatarFlair tier={tier} flairId={flairId} size="sm|md|lg">
  <Avatar />
</AvatarFlair>
```

- Se `tier === 'free'` → renderiza children sem efeito.
- Se `flairId` não pertence ao tier do usuário (ex: Pro com flair Premium) → faz fallback para o flair default do tier.
- Cada flair é um sub-componente isolado para code-splitting visual e fácil manutenção.
- Mantém `PlanAvatarRing` como wrapper deprecated que delega para `AvatarFlair` para não quebrar imports existentes.

Adicionar keyframes novos em `tailwind.config.ts` / `index.css` para os efeitos (flames, sparkles-spin, aurora-shift, rainbow-rotate, galaxy, crown-float).

## 4. Tela de seleção em Configurações de Perfil

Nova seção em `src/pages/Settings.tsx` chamada **"Estilo do Avatar"**, visível apenas se `tier !== 'free'`:

- Grid responsivo (2 col mobile, 3-4 col desktop) de cards.
- Cada card mostra: preview animado em tamanho grande (avatar do próprio usuário com o flair aplicado), nome, badge do tier requerido.
- Flairs Premium aparecem **bloqueados (cadeado + blur)** para usuários Pro com CTA "Upgrade para Premium".
- Card selecionado tem borda animada + check.
- Botão "Salvar" persiste em `profiles.avatar_flair`, invalida queries de perfil/amigos/membros para refletir em tempo real.
- Animação de entrada `fade-in + scale-in` em sequência (stagger) ao abrir a seção.

Para usuários `free`: mostrar a seção como **paywall preview** — grid blureado com overlay "Disponível em Pro e Premium" e botão para `/pricing`.

## 5. Aplicar flair em todos os lugares

Substituir `PlanAvatarRing` por `AvatarFlair tier={tier} flairId={flair}` em:
- `src/components/rooms/RoomMemberGrid.tsx`
- `src/components/friends/FriendsList.tsx`
- `src/components/rooms/MemberProfileModal.tsx`
- `src/components/friends/FriendProfileModal.tsx`
- `src/components/rooms/RoomRankingSidebar.tsx`
- `src/components/rooms/RoomChat.tsx` (mensagens) — versão `size="sm"` mais econômica

## 6. Defensivas nos planos

Hoje os arrays `STRIPE_PLANS.{pro,premium}.features` não citam streak freezes. Adicionar:
- Free: nenhuma menção (ou `freezes_none`)
- Pro: `freezes_3_monthly` (3 defensivas por mês) + flair customizável (4 estilos)
- Premium: `freezes_6_monthly` + flair exclusivo (7 estilos premium)

Adicionar chaves de i18n em `pt-BR.json` (e demais locales — pelo menos pt-BR e en-US, outras com fallback):
- `pricing.feature_freezes_3_monthly`: "3 defensivas/mês para proteger sua sequência"
- `pricing.feature_freezes_6_monthly`: "6 defensivas/mês para proteger sua sequência"
- `pricing.feature_avatar_flair_pro`: "4 efeitos animados de avatar"
- `pricing.feature_avatar_flair_premium`: "7 efeitos exclusivos de avatar (estilo Discord)"
- `settings.avatar_flair_title`, `settings.avatar_flair_desc`, etc.

Atualizar tanto `src/pages/Pricing.tsx` quanto `src/components/landing/PricingSection.tsx` (compartilham `STRIPE_PLANS.features`, então só editar o array já reflete em ambos).

## 7. Detalhes técnicos

- **Tipos Supabase**: regenerar após migração para incluir `avatar_flair` em `profiles` e nos retornos de RPCs.
- **Performance**: animações puramente CSS (transform/opacity) com `will-change` apenas em flairs Premium pesados (galaxy/sparkles); avatares fora da viewport não recebem animação extra (usar `content-visibility: auto` no container do membro grid já existente).
- **Acessibilidade**: respeitar `prefers-reduced-motion` — todos os flairs param de animar mantendo o estilo estático.
- **Fallback de carregamento**: se `avatar_flair` vier `null`, usar `'pro-pulse'` para Pro e `'premium-gold'` para Premium (mantém comportamento atual).
- **Cache**: `useProfile` já invalida em update; garantir que `roomMembers` e `friends` queries também reagem (já fazem via realtime de `profiles`? caso não, invalidar manualmente após salvar flair).

## Arquivos afetados

**Novos:**
- `src/lib/avatarFlairs.ts` — catálogo
- `src/components/avatar/AvatarFlair.tsx` — componente principal
- `src/components/avatar/flairs/*.tsx` — um por efeito (ou um arquivo só com sub-componentes)
- `src/components/settings/AvatarFlairPicker.tsx` — UI de seleção
- `supabase/migrations/<timestamp>_avatar_flair.sql`

**Editados:**
- `tailwind.config.ts` + `src/index.css` — keyframes
- `src/lib/stripePlans.ts` — features arrays
- `src/i18n/locales/pt-BR.json` + `en-US.json` — novas chaves
- `src/pages/Settings.tsx` — nova seção
- `src/components/rooms/PlanBadge.tsx` — `PlanAvatarRing` vira shim
- `src/components/rooms/RoomMemberGrid.tsx`
- `src/components/friends/FriendsList.tsx`
- `src/components/rooms/MemberProfileModal.tsx`
- `src/components/friends/FriendProfileModal.tsx`
- `src/components/rooms/RoomRankingSidebar.tsx`
- `src/components/rooms/RoomChat.tsx`
- `src/hooks/useProfile.ts` — adicionar `avatar_flair` na interface
- `src/integrations/supabase/types.ts` (auto)

## Resultado para o usuário

- Em **Configurações → Estilo do Avatar**: grid lindo de previews animados, escolho um, salvo, e me vejo brilhando do jeito que escolhi.
- Em **Salas**, **Amigos**, modais de perfil e ranking: meu avatar aparece com o efeito que escolhi, em vez do mesmo para todos os Premium.
- Premium tem efeitos visivelmente mais ricos e exclusivos do que Pro, justificando o preço.
- Página de **Planos** agora deixa explícito que Pro tem 3 defensivas/mês + 4 efeitos, Premium tem 6 defensivas/mês + 7 efeitos exclusivos.
