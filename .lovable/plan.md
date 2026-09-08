# Códigos de acesso para parcerias

Objetivo: permitir criar códigos que dão Premium ou Pro por um tempo determinado, com administração completa e sem mudar nada de como os planos funcionam hoje.

## Como isso se encaixa no que já existe

Hoje o plano de cada pessoa é decidido em um único lugar no servidor (a verificação de assinatura), que olha a assinatura da Stripe e o teste gratuito de 3 dias e grava o plano no perfil. Todo o resto do app — limites, cadeados, salas, conquistas, selos — já lê desse mesmo lugar.

A novidade entra exatamente nesse ponto: o código gera uma **concessão de plano** guardada na conta. A verificação passa a considerar três origens (assinatura paga, teste gratuito, concessão por código) e vale sempre a melhor. Nada de plano paralelo: quem resgatar Premium é Premium igual a qualquer assinante.

## Estrutura de dados

Três tabelas novas, nenhuma alteração destrutiva nas atuais:

- **access_codes** — código, plano concedido (pro/premium), duração em dias/meses, tipo (compartilhável ou de uso único), limite de usos, contador de usos, validade do próprio código, parceiro/campanha, observações, ativo/inativo, quem criou.
- **access_code_redemptions** — quem resgatou, qual código, quando, qual plano e qual período foi concedido. Um registro por pessoa por código (impede repetição).
- **plan_grants** — a concessão em si: pessoa, plano, início, fim, origem (`access_code` hoje, aberto para `admin` ou `partner` no futuro) e referência ao resgate. É esta tabela que dá o acesso.

Segurança: acesso às tabelas somente pelo servidor. A pessoa vê apenas as próprias concessões; nada de listar códigos pelo app.

## Regras de resgate

Todo o resgate acontece em uma única operação no banco (função com trava por código), o que impede corrida, uso acima do limite e resgate duplo. Casos tratados, cada um com mensagem própria:

- código inexistente, desativado, expirado, esgotado;
- código de uso único já usado; código já resgatado por essa mesma pessoa;
- pessoa gratuita: passa a valer imediatamente pelo período do código;
- mesmo plano já ativo por código: o tempo é **somado** ao fim atual, sem perder nada;
- plano diferente: a concessão fica registrada e vale o melhor plano no momento; quando o superior acabar, o outro entra em vigor pelo tempo que sobrar;
- assinante pagante: o código é aceito e começa a contar quando a assinatura terminar;
- expiração: ao passar a data, a pessoa volta naturalmente ao plano de origem.

## Experiência da pessoa

- Nas Configurações, um novo cartão **"Ativar código"** (campo + botão), no mesmo padrão visual dos outros cartões.
- Depois do resgate: confirmação clara com o plano recebido, o tempo concedido e a data de término; o app recarrega o plano na hora.
- Quando existe acesso por código ativo, o cartão mostra o plano e até quando vale.
- Também deixo o mesmo cartão acessível pela página de Preços, para quem chega lá procurando onde usar o código.

## Área administrativa

Na página Admin atual, passa a ter abas: **Usuários** (exatamente como está hoje) e **Códigos de acesso**.

Na aba de códigos:
- lista com busca e filtros (parceiro, plano, situação), mostrando código, plano, duração, usos/limite, validade e situação;
- criar código: plano, duração, tipo, limite de usos, validade, parceiro/campanha, observação;
- **geração em lote**: cria N códigos únicos de uma vez com prefixo do parceiro (ex.: `TZ-X7K92-PQ81`) e exporta a lista em CSV;
- ativar/desativar código, editar limite e validade;
- ver os resgates de um código: quem usou, quando e qual período recebeu;
- números do topo: códigos ativos, resgates totais, resgates nos últimos 7 dias.

Acesso restrito a administradores, com a mesma checagem já usada no Admin, e todas as ações passando pelo servidor com registro de quem fez.

## Detalhes técnicos

- Migração: tabelas `access_codes`, `access_code_redemptions`, `plan_grants`; índices por código e por usuário; RLS restrita (leitura das próprias concessões; resto só via servidor); função `redeem_access_code(_code)` com `SECURITY DEFINER` + `FOR UPDATE` no código e checagens completas; função `get_effective_plan_grant(_user_id)` retornando plano e fim vigentes.
- `supabase/functions/check-subscription/index.ts`: além de Stripe + `trial_ends_at`, consulta a concessão vigente; o plano final é o maior entre as origens, e `plan_tier` no perfil continua sendo gravado no mesmo ponto. A resposta ganha `grant_tier` / `grant_ends_at` sem remover campos existentes.
- `SubscriptionContext`: novos campos `grantTier`, `grantEndsAt`, `isCodeAccess`; o `tier` continua sendo a única fonte para limites e recursos — nenhuma checagem existente muda.
- Nova função de servidor `access-codes` (admin) para criar, listar, gerar em lote, ativar/desativar e listar resgates, com a mesma verificação de admin de `admin-users`.
- Front: `src/hooks/useAccessCodes.ts` (admin) e `useRedeemCode.ts`; `src/components/settings/RedeemCodeCard.tsx`; `src/components/admin/AccessCodesTab.tsx` com diálogos de criação/lote/resgates; abas em `src/pages/Admin.tsx` mantendo a tabela atual intacta.
- Textos novos nos 12 idiomas (namespace `access_codes`), mobile-first, com estados vazio/carregando/erro.
- Expiração não exige tarefa agendada: o cálculo é por data a cada verificação; o perfil é corrigido na próxima checagem (que já roda a cada minuto no app).
- Verificação final: typecheck + build, e teste do fluxo de resgate (código válido, inválido, esgotado e repetido).
