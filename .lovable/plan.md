
# Atualizar preços Pro e Premium

## Novos valores

| Plano | Mensal | Anual (total) | Equivalente mensal anual |
|-------|--------|---------------|--------------------------|
| Pro     | $9.90  | $95  | $7.92  |
| Premium | $19.90 | $143 | $11.92 |

Toggle anual continua mostrando "Economize 40%" (sem detalhar diferença real entre Pro/Premium).

Adaptive Pricing continua ativo no `create-checkout` → comprador no Brasil/Europa/Ásia vê preço convertido na moeda local automaticamente.

## Passos da implementação

### 1. Criar edge function temporária `setup-new-prices`
Função one-shot, restrita a admin (valida `has_role(uid, 'admin')`), que chama a API da Stripe e cria 4 novos Prices atrelados aos products existentes:

- $9.90/mês recurring → `prod_U9cV4fuZjYahhc` (Pro mensal)
- $95/ano recurring → `prod_U9cVTsdR19wOvY` (Pro anual)
- $19.90/mês recurring → `prod_U9cW1bur6JaHIy` (Premium mensal)
- $143/ano recurring → `prod_U9cXdUEoYVf070` (Premium anual)

Retorna os 4 `price_id` no JSON de resposta (e loga no console).

### 2. Executar a função uma vez
Eu chamo via `supabase--curl_edge_functions` ou `supabase--test_edge_functions` com seu token de admin. Se eu não conseguir autenticar pelo lado do sandbox, te peço para clicar um botão temporário (te aviso na hora). Esperado: receber os 4 novos `price_id`.

### 3. Atualizar `src/lib/stripePlans.ts`
- `STRIPE_PLANS.pro`:
  - `monthlyPrice: 9.9`
  - `yearlyPrice: 95`
  - `yearlyMonthlyEquivalent: 7.92`
  - `prices.monthly` / `prices.yearly` → novos IDs
- `STRIPE_PLANS.premium`:
  - `monthlyPrice: 19.9`
  - `yearlyPrice: 143`
  - `yearlyMonthlyEquivalent: 11.92`
  - `prices.monthly` / `prices.yearly` → novos IDs
- Mover os 4 Price IDs antigos (`price_1TBJG4...`, `price_1TBJGc...`, `price_1TBJHY...`, `price_1TBJI7...`) para `LEGACY_PRICES` para que assinantes atuais continuem reconhecidos como `monthly`/`yearly` em `getBillingInterval`.
- Atualizar `PLAN_OPTIONS` (admin) com novos labels e priceIds.

### 4. Atualizar `src/pages/Pricing.tsx`
- Atualizar `PRICE_VALUES` (hierarquia upgrade/downgrade) com os novos IDs em centavos:
  - Pro mensal: 990
  - Pro anual: 9500
  - Premium mensal: 1990
  - Premium anual: 14300
- Manter os IDs legacy também no objeto, para que usuários antigos preservem a hierarquia correta no fluxo de upgrade.

### 5. Apagar a edge function `setup-new-prices`
Não é mais necessária depois que os Prices forem criados.

## O que NÃO muda

- Products na Stripe (continuam os mesmos IDs).
- Edge functions `check-subscription`, `stripe-webhook`, `update-subscription`, `create-checkout` (mapeamento tier é por `product_id`, não por `price_id`).
- Banco de dados (nenhuma migração necessária).
- Tradução / copy dos planos (valores são renderizados a partir do `stripePlans.ts`).
- **Assinantes atuais** ($13/$24): continuam pagando o valor original. Stripe respeita o Price em que cada cliente assinou. Só novos checkouts e upgrades futuros usam os novos valores.

## Pricing regional (NÃO entra agora)

Conforme análise anterior: **Adaptive Pricing já cobre 80% do problema** (conversão automática para moeda local). Pricing regional manual com 48 Price IDs traz risco de arbitragem (usuário troca idioma e paga preço de Indonésia). Fica para uma segunda fase, com detecção de país por IP no edge function se você quiser ir nesse caminho.

---

**Aprova para eu seguir?** Ao aprovar, no próximo turno (modo build) eu crio a edge function, executo, pego os IDs, atualizo o código e removo a função temporária — tudo na mesma sessão.
