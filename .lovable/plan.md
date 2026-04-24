## Diagnóstico

Fiz uma varredura completa no código procurando referências a banco de dados. **Boas notícias**: nenhum código-fonte (`src/`, edge functions, `config.toml`) referencia outro projeto Supabase. Tudo usa as variáveis de ambiente padrão e o `supabase/config.toml` aponta corretamente para o projeto atual (`iukwvfyhforubyqgguwl`).

**Mas o arquivo `.env` está bagunçado e parcialmente apontando para um projeto antigo:**

```
SUPABASE_PUBLISHABLE_KEY="...ref:lezufzdmjbozpzskqglv..."   ← chave de OUTRO projeto (antigo)
SUPABASE_URL="https://iukwvfyhforubyqgguwl.supabase.co"     ← projeto atual (ok)
VITE_SUPABASE_PROJECT_ID=                                    ← VAZIO
VITE_SUPABASE_PUBLISHABLE_KEY=                               ← VAZIO
VITE_SUPABASE_URL=                                           ← VAZIO
```

Problemas concretos:
1. `SUPABASE_PUBLISHABLE_KEY` contém um JWT cujo `ref` é `lezufzdmjbozpzskqglv` — esse é um projeto Supabase **antigo/diferente** do nosso. Não é usado pelo frontend (porque o frontend lê `VITE_SUPABASE_*`), mas está poluindo o arquivo e pode confundir scripts/ferramentas.
2. As três variáveis `VITE_SUPABASE_*` (que o `src/integrations/supabase/client.ts` realmente lê) estão vazias. O frontend só funciona porque a Lovable injeta esses valores em runtime — mas qualquer build local ou dev fora da Lovable falharia.

Confirmações adicionais:
- `supabase/config.toml` → `project_id = "iukwvfyhforubyqgguwl"` ✅
- Todas as 9 edge functions usam apenas `Deno.env.get('SUPABASE_*')` (injetado pela Supabase no runtime das functions, sempre o projeto atual) ✅
- Nenhum URL hardcoded de outro projeto encontrado em código ✅
- Tabelas listadas batem 1:1 com `src/integrations/supabase/types.ts` ✅
- Banco está vazio (`profiles` tem 0 linhas) — nada a migrar de dados.

## Plano de correção

Atualizar o `.env` para:
1. Remover a chave antiga do projeto `lezufzdmjbozpzskqglv`.
2. Preencher as três variáveis `VITE_SUPABASE_*` com os valores corretos do projeto atual:
   - `VITE_SUPABASE_PROJECT_ID="iukwvfyhforubyqgguwl"`
   - `VITE_SUPABASE_URL="https://iukwvfyhforubyqgguwl.supabase.co"`
   - `VITE_SUPABASE_PUBLISHABLE_KEY="<anon key do projeto atual>"`
3. Manter `SUPABASE_URL` e adicionar `SUPABASE_PUBLISHABLE_KEY` corretos (caso scripts não-Vite leiam dessas vars).

Resultado esperado: `.env` 100% consistente apontando para `iukwvfyhforubyqgguwl`, build funciona em qualquer ambiente, zero referência ao projeto antigo.

## Risco

**Mínimo.** É apenas reescrita de variáveis de ambiente. O frontend já está funcionando hoje (a Lovable injeta os valores em runtime). A correção só elimina inconsistência latente e remove resíduo do projeto antigo.

## Não há outras mudanças necessárias

- Nenhum código TS/TSX precisa ser alterado.
- Nenhuma edge function precisa ser alterada.
- Nenhuma migration de schema necessária.
- Nenhum dado para migrar.
