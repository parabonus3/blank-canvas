# Checklist visível no cartão do quadro (mobile-first)

Hoje o cartão mostra apenas uma barrinha fina de progresso e um selo `0/3`. Não dá para saber o que falta nem quem está marcando os itens. A ideia é transformar isso num bloco de checklist compacto, bonito e legível no celular — sem aumentar muito a altura do cartão.

## O que muda no cartão

1. **Bloco "Checklist" compacto**
   - Uma linha de cabeçalho: ícone + `2/5` + barra de progresso na mesma linha (economiza altura).
   - Cor da barra e do selo por estado: cinza (0 feito), laranja/âmbar (em andamento), verde (completo) — mesma linguagem de cor já usada na escolha de desafios das salas.
   - Quando completo, o selo mostra "Concluído" em verde com check.

2. **Prévia dos próximos itens**
   - Mostra até 2 itens ainda pendentes, em texto pequeno (uma linha cada, com corte por reticências).
   - Se houver mais, aparece "+3 itens" como texto discreto.
   - Itens já concluídos não ocupam espaço na prévia (ficam representados na barra/contador).
   - Toque no bloco abre o cartão já na aba Checklist (hoje abre em "Detalhes").

3. **Quem está fazendo**
   - Ao lado do contador, mini-avatares (14px) das pessoas que concluíram itens do checklist, no máximo 3 + "+N".
   - Tooltip/`title` com o nome de quem concluiu.
   - Se alguém está com timer ativo na tarefa, o indicador laranja "Focando agora" já existente continua logo abaixo, sem duplicar informação.

4. **Densidade mobile**
   - Tudo dentro do padding atual do cartão, usando `text-[10px]/[11px]`, gaps de 1–1.5.
   - A prévia de itens é opcional por densidade: em telas muito estreitas mostra 1 item; a partir de `sm`, 2 itens.
   - Nenhum scroll horizontal novo; nada de largura fixa.

## Detalhes técnicos

- `src/components/kanban/TaskCard.tsx`: substituir a barra solta + selo `checkDone/checkTotal` por um novo subcomponente `TaskChecklistPreview` (novo arquivo `src/components/kanban/TaskChecklistPreview.tsx`), memoizado, recebendo `items` já carregados por `useTaskChecklists`.
- Avatares: derivar os `completed_by` distintos dos itens e resolver nome/foto pela lista `members` já passada ao cartão (sem query extra); fallback para o RPC de perfis públicos apenas se o usuário não estiver em `members` — reutilizando o mesmo padrão já usado em `TaskDetailDrawer` (`checklist_profiles`).
- `onClick` do bloco chama `onClick(task)` com um novo parâmetro opcional de seção inicial; `BoardDetail.tsx` guarda esse estado e passa como `initialSection` para `TaskDetailDrawer`, que já tem `SectionId` incluindo `"checklist"`.
- Novas chaves i18n (`kanban.checklist_more_items`, `kanban.checklist_completed_label`, `kanban.checklist_by`) adicionadas nos 12 idiomas.
- Sem mudanças de banco de dados nem de RLS.
