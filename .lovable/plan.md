# Diagnóstico — Salas e Amigos não funcionam

## O erro real (do console)

```
Error: cannot add `postgres_changes` callbacks for realtime:friendships-realtime after `subscribe()`
Error: cannot add `postgres_changes` callbacks for realtime:invitations-<uuid> after `subscribe()`
WebSocket ... failed: WebSocket is closed before the connection is established
```

Esse erro do supabase-js v2 acontece quando dois componentes tentam criar um **canal Realtime com o mesmo nome ao mesmo tempo**. O cliente reaproveita o canal já existente e tenta anexar um novo listener `.on()` num canal que já chamou `.subscribe()`, o que é proibido. Resultado: a inscrição falha, o WebSocket cai e os updates em tempo real (novos amigos, convites, mensagens) param de chegar — quebrando a sensação de "ao vivo" das salas e amigos.

## Causa raiz identificada

Vários hooks usam **nome de canal global / fixo** e são chamados em múltiplos componentes que ficam montados juntos:

| Hook | Nome do canal | Componentes que o chamam simultaneamente |
|---|---|---|
| `useFriendships` | `"friendships-realtime"` (FIXO) | Sidebar + FriendsList + MemberProfileModal + CreateRoomDialog |
| `usePendingInvitations` | `invitations-${user.id}` | Sidebar + RoomInvitations (rota /rooms) |
| `useDirectMessages` (chat) | `dm-${user.id}-${friendId}` | DirectChatDialog (raro duplicar, mas vulnerável) |
| `useDMNotifications` | `dm-notifications-${user.id}` | App.tsx (único — ok) |

Cada montagem extra cria a colisão. Em React 18 StrictMode (dev) o `useEffect` ainda executa duas vezes na primeira montagem, agravando o problema.

Backend está OK: as tabelas `friendships`, `room_invitations`, `room_members`, `direct_messages`, etc. já estão na publication `supabase_realtime`. As Edge Functions (`check-subscription`, `stripe-webhook`) também estão funcionando.

## Plano de correção

### 1. Tornar nomes de canais únicos por instância
Em todos os hooks afetados, gerar um sufixo único por montagem usando `crypto.randomUUID()` (ou `useId()` do React) para que cada componente tenha seu próprio canal mesmo quando o hook é usado várias vezes:

- `useFriendships` → `friendships-realtime-${uniqueId}`
- `usePendingInvitations` → `invitations-${user.id}-${uniqueId}`
- `useDirectMessages` (mensagens da conversa) → `dm-${user.id}-${friendId}-${uniqueId}`

### 2. Limpeza defensiva do canal
Garantir que o `return () => supabase.removeChannel(channel)` execute mesmo quando o efeito reroda (StrictMode), e nunca recriar `.on()` sobre um canal que já fez `.subscribe()`.

### 3. (Opcional, recomendado) Centralizar realtime de amigos
`useFriendships` é chamado em 4 lugares. Mesmo com IDs únicos, abrir 4 WebSockets para a mesma tabela é desperdício. Mover a inscrição realtime para um único hook global `useFriendshipsRealtime()` montado uma vez em `App.tsx` (igual ao `useDMNotifications`), e deixar `useFriendships` apenas como query React Query. Isso elimina duplicação por construção.

Mesma ideia para `usePendingInvitations` (Sidebar + página /rooms).

### 4. Validar pós-correção
- Abrir /friends e /rooms: console deve ficar sem o erro `cannot add postgres_changes callbacks`.
- Enviar pedido de amizade entre duas contas → recebedor vê o badge atualizar sem refresh.
- Convidar membro para sala → convite aparece em tempo real na Sidebar e na página /rooms.
- WebSocket em Network deve ficar `101 Switching Protocols` estável.

## Detalhes técnicos (para referência)

Arquivos a editar:
- `src/hooks/useFriendships.ts` — canal único por instância **ou** extrair para `useFriendshipsRealtime` global
- `src/hooks/useRoomInvitations.ts` — mesmo tratamento
- `src/hooks/useDirectMessages.ts` — sufixo único no canal de conversa
- `src/App.tsx` — montar `useFriendshipsRealtime()` se optarmos pela abordagem (3)

Nenhuma migração SQL é necessária — o backend já está correto.

## Resultado esperado
- Realtime funcionando em Salas, Convites, Amigos e Chat direto
- WebSocket estável (sem ciclo de fechamento)
- Notificações instantâneas de pedidos de amizade, convites de sala e mensagens
