## Problema

Quando a sidebar é colapsada no desktop, ela passa a ter largura de apenas `3rem` (48px - definido em `src/components/ui/sidebar.tsx` como `SIDEBAR_WIDTH_ICON`). Porém, no `SidebarHeader` de `src/components/layout/Sidebar.tsx`:

- O header usa `p-4` (16px de padding em todos os lados) → sobram apenas 16px de largura útil
- A logo usa `h-10 w-10` (40px) → muito maior que o espaço disponível
- Resultado: a logo aparece cortada/espremida e desalinhada com os ícones do menu abaixo (que ficam centralizados em ~32px)

No mobile o sidebar abre como sheet com largura normal, então o problema principal é o estado colapsado no desktop. Mesmo assim, vamos garantir tamanho consistente.

## Solução

Ajustar o `SidebarHeader` em `src/components/layout/Sidebar.tsx` para reagir ao estado `isCollapsed`:

1. **Padding adaptativo**: usar `p-2` quando colapsado (alinha com o padding dos ícones do menu) e manter `p-4` quando expandido.
2. **Tamanho da logo adaptativo**: `h-8 w-8` quando colapsado (cabe nos 48px com folga e alinha visualmente com os ícones de 20px do menu, dado o padding `p-2` do botão), e `h-10 w-10` quando expandido.
3. **Centralização**: quando colapsado, centralizar a logo (`justify-center`) para alinhar com a coluna de ícones; quando expandido manter `gap-3` com o texto "TimeZoni".
4. **object-contain**: garantir que a imagem não distorça (`object-contain`).

### Detalhe técnico do trecho a alterar

```tsx
<SidebarHeader className={cn(isCollapsed ? "p-2" : "p-4")}>
  <div className={cn(
    "flex items-center",
    isCollapsed ? "justify-center" : "gap-3"
  )}>
    <img
      src={logo}
      alt="TimeZoni"
      className={cn(
        "shrink-0 object-contain",
        isCollapsed ? "h-8 w-8" : "h-10 w-10"
      )}
    />
    {!isCollapsed && (
      <span className="font-bold text-lg tracking-tight">TimeZoni</span>
    )}
  </div>
</SidebarHeader>
```

## Arquivos modificados

- `src/components/layout/Sidebar.tsx` — header com logo responsiva ao estado colapsado/expandido.

## Resultado esperado

- Desktop expandido: logo 40px + texto "TimeZoni" (igual ao atual).
- Desktop colapsado: logo 32px centralizada, sem corte, alinhada verticalmente com os ícones do menu.
- Mobile (sheet): comportamento expandido normal, sem alteração visual.
