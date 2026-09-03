# Fase 3 — Recursos avançados ligados ao tempo

## Status

- Linha do tempo diária: implementada no Dashboard.
- Rotinas de foco: banco preparado; interface e execução ainda pendentes.
- Duelos 1v1: banco preparado; fluxo social e placar ainda pendentes.
- Perfis de atividade GPS: banco preparado; seleção, métricas e recordes ainda pendentes.
- Sessões agendadas em salas: banco preparado; agenda, confirmação e lembretes ainda pendentes.

## Próximas etapas

1. **Linha do tempo diária**
   - Mostrar sessões concluídas do dia, lacunas relevantes e totais.
   - Permitir preencher uma lacuna diretamente com registro manual pré-preenchido.
   - Reutilizar `time_entries`, projetos e o fuso horário do perfil.

2. **Rotinas/rituais de foco**
   - Criar e editar rotinas com etapas de foco, pausa, projeto e duração.
   - Executar uma etapa por vez, reaproveitando o timer atual e o modo Deep Work/Pomodoro.
   - Mostrar progresso da rotina e permitir pausar, pular ou encerrar.

3. **Duelos 1v1**
   - Convidar amigos, aceitar/recusar e acompanhar status.
   - Exibir placar por período usando tempo confirmado de cada participante.
   - Finalizar automaticamente ou permitir encerramento controlado, com notificações traduzidas.

4. **Perfis GPS**
   - Selecionar corrida, caminhada, pedal ou trilha antes de iniciar.
   - Ajustar rótulos, métricas de ritmo/velocidade e histórico por modalidade.
   - Mostrar recordes pessoais sem alterar atividades antigas, que permanecem como corrida.

5. **Sessões agendadas em salas**
   - Dono/moderador cria sessão com horário, duração, título e descrição.
   - Membros confirmam presença e visualizam participantes.
   - Integrar lembretes e estados de sessão sem interferir no timer existente.

6. **Exportação e metas inteligentes**
   - Exportar timesheet mensal em CSV/PDF com filtros por projeto/categoria.
   - Sugerir metas com base em histórico local, sem IA ou API paga.

## Critérios para todas as etapas

- Mobile-first, sem scroll horizontal e com estados vazios, carregamento e erro.
- Traduções completas nos 12 idiomas, sem strings fixas em componentes.
- RLS e permissões alinhadas ao dono, participantes e membros da sala.
- Reutilizar os fluxos atuais de timer, notificações, projetos e autenticação.
- Validar TypeScript, build e os fluxos principais antes de avançar.

## Fora da próxima etapa

Offline-first fica em uma fase separada, pois altera o núcleo de persistência e sincronização do cronômetro.
