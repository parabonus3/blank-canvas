# O que falta e vale a pena ter no Timezoni

Objetivo que guia tudo: as pessoas manterem um hábito diário de foco. Só entra aqui o que ajuda nisso. Nada de recurso "enfeite".

## 1. Muito útil e ainda não temos (prioridade alta)

1. **Lembrete inteligente no horário habitual**
   O app aprende o horário em que a pessoa costuma estudar e avisa naquele horário se ela ainda não fez sessão no dia. Um aviso extra à noite só se a sequência estiver em risco. Máximo de 2 avisos por dia, com opção de desligar.
   Por que: é a principal causa de perder sequência — esquecer.

2. **Planejar a semana (domingo/segunda)**
   Tela curta: escolher quantas horas por dia, em quais projetos, e quais tarefas entram na semana. Isso vira blocos na agenda e metas da semana, e a revisão semanal compara "planejei x fiz".
   Por que: fecha o ciclo planejar → fazer → revisar, que hoje está aberto.

3. **Rotina de foco na agenda**
   Rotinas com dias previstos aparecem automaticamente em Hoje e na agenda, com botão "Começar" que já abre o cronômetro com a rotina certa.
   Por que: hoje rotina e agenda ficam separadas.

4. **Cronômetro que não perde tempo sem internet**
   Se a internet cair, a sessão continua e é salva quando voltar (sem duplicar).
   Por que: perder uma sessão de 2h destrói a confiança no app. Fica por último por ser o mais delicado.

## 2. Bom de ter (prioridade média)

5. **Sessão ao vivo na sala**: quando uma sessão agendada começa, todos veem quem entrou e o tempo rodando juntos.
6. **Conquistas sociais**: marcos por duelos vencidos e presença em sessões de sala (sem mudar a árvore).
7. **Resumo semanal compartilhável**: imagem simples com horas e sequência para postar.

## 3. Melhorar o que já existe (antes das novidades)

- Revisão de telas no celular estreito (320/360/390 px) em Hoje, Cronômetro, Salas e Relatório.
- Textos que ainda aparecem só em português/inglês nos 12 idiomas.
- Revisar os avisos de segurança antigos do banco.

## Ficou de fora de propósito

Integração com calendários pagos, IA de "coach", loja de temas: custo alto ou uso baixo.

## Ordem sugerida

```text
Rodada 1: Melhorias da seção 3 + Lembrete inteligente
Rodada 2: Planejar a semana + Rotina na agenda
Rodada 3: Sessão ao vivo + Conquistas sociais
Rodada 4: Cronômetro sem internet
```

## Pendências que dependem de você

- Aprovar imagens das conquistas dos níveis 22 a 200.
- Decidir árvore completa em 1.098h ou 1.100h.
- Conta de administrador logada para gerar as 56 salas de demonstração.

## Detalhes técnicos

- Horário habitual: mediana do horário de início das sessões dos últimos 28 dias no fuso do perfil; envio pelo sistema de push já existente, com limite diário por usuário.
- Planejamento semanal: nova tabela por semana local (segunda), ligada a projetos/tarefas; blocos gerados na agenda existente; comparação na `useWeeklyReview`.
- Rotinas na agenda: derivadas de `focus_routines` + dias previstos, sem criar time entries.
- Offline: fila local com id único por sessão para evitar duplicação, respeitando o limite de duração e confirmação de presença.
- Tudo em 12 idiomas, sem APIs pagas.
