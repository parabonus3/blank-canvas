# Proteger canais Realtime via RLS em `realtime.messages`

## O problema
Hoje qualquer usuário autenticado pode se inscrever em qualquer canal Realtime (DMs, salas, tickets) e receber broadcasts. A tabela `realtime.messages` não tem policies.

## Solução
Aplicar RLS em `realtime.messages` com policies que validam o `topic` do canal contra o `auth.uid()`. A Supabase suporta isso oficialmente — é o método recomendado para Realtime Authorization.

## Mapeamento de canais usados no app

Inspecionei os hooks. Padrões atuais:

| Canal | Origem | Quem pode escutar |
|---|---|---|
| `dm-{userA}-{userB}-{uuid}` | `useDirectMessages` | apenas userA ou userB |
| `dm-notifications-{userId}-{uuid}` | `useDMNotifications` | apenas o próprio userId |
| `room-messages-{roomId}-{uuid}` | `useRoomMessages` | membros da sala |

Vou padronizar a verificação por **prefixo** do `topic` + extração do UUID relevante.

## Migration (SQL)

```sql
-- 1. Habilitar RLS em realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 2. Policy de SELECT (subscribe) e INSERT (broadcast)
CREATE POLICY "authenticated_can_read_authorized_topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    -- DM channel: dm-{uidA}-{uidB}-{nonce} → user precisa ser uidA ou uidB
    WHEN realtime.topic() LIKE 'dm-%' THEN
      auth.uid()::text = split_part(realtime.topic(), '-', 2)
      OR auth.uid()::text = split_part(realtime.topic(), '-', 3)

    -- DM notifications: dm-notifications-{uid}-{nonce}
    WHEN realtime.topic() LIKE 'dm-notifications-%' THEN
      auth.uid()::text = split_part(realtime.topic(), '-', 3)

    -- Room messages: room-messages-{roomId}-{nonce}
    WHEN realtime.topic() LIKE 'room-messages-%' THEN
      public.is_room_member(
        auth.uid(),
        split_part(realtime.topic(), '-', 3)::uuid
      )

    ELSE false
  END
);

CREATE POLICY "authenticated_can_send_authorized_topics"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK ( /* mesma lógica */ );
```

Default-deny: qualquer canal não previsto é bloqueado.

## Frontend
Sem mudanças necessárias — os nomes de canal já seguem o padrão. Os listeners de `postgres_changes` continuam funcionando (eles já usam RLS das tabelas `direct_messages`, `room_messages`).

## Validação pós-migration
1. Rodar o linter Supabase para confirmar finding resolvido.
2. Marcar `realtime_no_channel_policies` como fixed.

## Riscos
- Se algum canal futuro usar outro padrão de nome, será negado por padrão — basta estender o `CASE`.
- Não alteramos estrutura nem triggers do schema `realtime`, apenas adicionamos policies (procedimento oficial Supabase).

Aprove para aplicar.