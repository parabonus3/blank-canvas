# Conquistas: descrições fiéis às imagens e 1h por nível

## O que confirmei
- Sim, as descrições precisam mudar. Elas foram escritas antes das imagens novas e hoje não batem: por exemplo, o nível 1 diz "vaso vazio", mas a imagem 1 já tem terra; o nível 2 diz "terra comum", mas a imagem mostra a semente ao lado da cova. Em vários níveis o texto em português e a tradução também falam de coisas diferentes.
- Hoje cada nível pede 3h de foco. Para chegar ao fim (366 níveis) são 1.098h, perto de 3h por dia, todos os dias do ano. Para a maioria dos estudantes isso é muito: quase ninguém passa da fase de broto.

## Recomendação: 1h por nível
- 366 níveis = 366h no ano, cerca de 1h por dia. Um dia de estudo dá um nível novo, o que combina com a ideia do app de manter o hábito diário.
- A meta anual passa de 1.100h para 366h, e as horas de cada fase (plantio, broto, mudinha, árvore, pinheiro, luzes, enfeites, completa) acompanham.
- Efeito em quem já usa: ninguém perde horas, mas todos sobem de nível na hora (quem tinha 30h estava no nível 10 e vai para o 30). Isso é bom para motivar, mas a árvore de muita gente vai "pular" de fase de uma vez.

## O que será feito
1. Olhar cada uma das imagens de 0 a 366 e escrever uma descrição curta do que realmente aparece nela (ex.: "Vaso com terra", "Semente ao lado da cova", "Duas folhas se abrindo", "Primeira luz amarela").
2. Usar essas descrições na tela de conquistas, no "próximo desbloqueio" e na grade do admin, nos 12 idiomas.
3. Mudar para 1h por nível: textos "Xh / 1100h", "faltam Xh", progresso do dia ("Xh / 1h") e faixas de horas das fases.
4. Ajustar os testes que hoje confirmam 3h e 1.100h para confirmar 1h e 366h.
5. Conferir a página de conquistas no celular e no computador.

## Detalhes técnicos
- `src/lib/treeConfig.ts`: `HOURS_PER_LEVEL = 1`, `YEARLY_GOAL_HOURS = 366`, `minHours/maxHours` das fases recalculados, `LEVEL_MILESTONES` reescrito alinhado a `TREE_VISUAL_LEVELS` (um marco por imagem), chaves `achievements.milestone_*` renomeadas por conteúdo.
- Trocar os valores fixos 1100 em `Achievements.tsx` e `GrowthTree.tsx` pela constante.
- Os 12 arquivos `src/i18n/locales/*.json` recebem os textos novos.
- `achievementProgress.test.ts` atualizado.
- Nada no banco muda: o nível é calculado a partir das horas já salvas. A meta anual que o próprio usuário criou não é alterada.
