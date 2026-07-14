## Objetivo
Deixar o título da aba do navegador em `/timer` apenas como **"Timezoni"**, limpo, sem sufixos ou descrições anexadas.

## Situação atual
- `index.html` define `<title>TimeZoni</title>` como padrão global.
- A página `/timer` (`src/pages/Index.tsx`) **não renderiza** o componente `<SEO />`, então herda o título do `index.html`. Dependendo da navegação prévia (Pricing, Auth, Landing renderizam `<SEO>` via Helmet), o Helmet pode ter deixado um título de outra página persistente ao voltar para `/timer`, causando o "muita coisa" que aparece na aba.

## Mudança
Adicionar um `<SEO />` mínimo no topo do JSX de `src/pages/Index.tsx` que force o título da aba para **"Timezoni"** sempre que o usuário estiver em `/timer`, sem alterar nenhum conteúdo visual da página (header "Cronômetro / Rastreie seu tempo em projetos" permanece igual).

```tsx
// src/pages/Index.tsx
import { SEO } from "@/components/SEO";
...
return (
  <MainLayout>
    <SEO title="Timezoni" path="/timer" noindex localeOnly />
    <div className="max-w-2xl mx-auto ...">
      ...
    </div>
  </MainLayout>
);
```

Detalhes:
- `title="Timezoni"` → title exato pedido (sem "- Cronômetro", sem descrição extra).
- `noindex` → rota autenticada não deve ser indexada.
- `localeOnly` → evita emitir hreflang alternates para uma rota interna.
- Sem `pageKey`, então o SEO não puxa cópia traduzida — mantém "Timezoni" fixo em todos os idiomas.

## Arquivos alterados
- `src/pages/Index.tsx` — adicionar import do `SEO` e renderizar `<SEO title="Timezoni" ... />` no topo do retorno.

## Fora de escopo
- Não altero o `<h1>Cronômetro</h1>` nem o subtítulo da página (é conteúdo visual, não título de aba).
- Não altero `index.html` (o padrão global "TimeZoni" continua válido para outras rotas sem `<SEO>`).
- Não mexo no `RoomChallengePicker` nem em outras áreas.