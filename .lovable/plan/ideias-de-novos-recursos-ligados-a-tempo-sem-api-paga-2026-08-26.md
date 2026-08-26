# Ideias de novos recursos ligados a tempo (sem API paga)

Tudo abaixo usa só o que já temos: cronômetro, projetos, salas, desafios, tarefas, GPS/Leaflet, push, Postgres.

## Alto impacto, baixo esforço

1. **Time blocking / Agenda do dia**
   Arrastar tarefas para blocos de horário do dia (ex.: 08:00–09:30) e iniciar o cronômetro direto do bloco. Ao parar, o real vs. planejado aparece lado a lado.
   Ganho: transforma o Kanban em plano de execução do dia.

2. **Estimado vs. Real (já temos `estimated_minutes`)**
   Barra por tarefa e relatório por membro: quem estima bem, onde estoura. Alerta quando passa 100% do estimado.

3. **Rotina/Ritual (sequências de foco)**
   Modelos como "Manhã: 10min leitura + 50min estudo + 10min anotações". Um toque inicia a sequência encadeada com transições automáticas.

4. **Relatório semanal automático (push + página)**
   Domingo à noite: horas por categoria, melhor dia, sequência, comparação com a semana anterior, 1 sugestão de meta. Reaproveita `notification-scheduler`.

5. **Modo Deep Work (contagem regressiva com compromisso)**
   Escolhe 25/50/90min; se parar antes, pergunta o motivo (distração, interrupção, urgência). Gera um "relatório de distrações" — muito viciante e zero custo.

## Média complexidade, alto valor

6. **Heatmap pessoal de horários produtivos**
   Grade 7 dias × 24h com as horas registradas: descobre "seu melhor horário" e o app passa a sugerir o horário do lembrete matinal com base nisso.

7. **Orçamento de tempo por categoria (semanal)**
   Define "Estudo 10h, Academia 4h, Trabalho 20h" e vê barras de consumo do orçamento com aviso ao chegar em 80%.

8. **Duelos 1v1 entre amigos**
   Desafio direto de X horas em Y dias, placar ao vivo, vencedor com badge. Usa a estrutura de desafios de sala já existente.

9. **Modo caminhada/pedal/trilha no GPS**
   O rastreador já existe; falta só perfil de atividade (limites de velocidade, pace vs. km/h) e recordes pessoais (maior distância, melhor pace 1 km/5 km).

10. **Linha do tempo do dia (timeline)**
    Faixa visual do dia com todas as sessões, lacunas e pausas — permite corrigir/completar sessões esquecidas com um toque.

## Diferenciais mais ambiciosos

11. **Foco offline-first com registro local**
    Cronômetro grava no IndexedDB e sincroniza depois; nada se perde sem internet (crítico para uso mobile e corrida).

12. **Sessões ao vivo agendadas na sala**
    Dono agenda "Foco 20h–21h", membros confirmam presença, push 10min antes, sala mostra quem entrou. Cria hábito coletivo.

13. **Auto-detecção de padrão e metas sugeridas**
    Regras simples em SQL: "você estuda 40min em média; que tal meta de 5h/semana?" — recomendação sem IA, só estatística.

14. **Exportação profissional**
    Timesheet mensal em PDF/CSV por projeto e cliente, com totais e assinatura — útil para freelancers cobrarem por hora.

## Recomendação de ordem

Fase 1: Deep Work com motivo de interrupção (5) + Estimado vs. Real (2) + Relatório semanal (4).
Fase 2: Time blocking (1) + Heatmap de horários (6) + Orçamento por categoria (7).
Fase 3: Duelos entre amigos (8) + perfis de atividade no GPS (9) + sessões agendadas na sala (12).

Tudo mobile-first, com tokens do design system atual e i18n nos 12 idiomas.

## Nota técnica

Nada aqui exige serviço externo pago: time blocking e orçamentos são novas tabelas simples; heatmap, estimado vs. real e sugestões são consultas agregadas sobre `time_entries`/`tasks`; relatórios e sessões agendadas reusam `notification-scheduler` e `send-push`; perfis de GPS são ajuste de parâmetros no `useGpsTracker`.
