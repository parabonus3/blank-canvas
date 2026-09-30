# Próxima fase: duelos e sessões agendadas

## Objetivo
Transformar os recursos sociais já iniciados em fluxos completos e fáceis de usar no celular, sem alterar cronômetro, salas, rankings ou dados existentes.

## 1. Avisos de duelos
- Criar aviso ao receber um duelo, com foto e nome de quem convidou, objetivo e duração.
- Levar o aviso diretamente à área de duelos e destacar convites pendentes até serem aceitos ou recusados.
- Avisar os dois participantes quando o convite for aceito, recusado ou quando o duelo terminar.
- Manter aceitar, recusar e cancelar protegidos para que apenas a pessoa correta execute cada ação.

## 2. Sessões agendadas nas salas
- Adicionar, dentro de cada sala, uma área de próximas sessões organizada para celular.
- Permitir que proprietário ou moderador crie, edite e cancele sessões com título, descrição, início e fim.
- Permitir que membros confirmem ou retirem presença e vejam a quantidade de participantes.
- Exibir horário no fuso da sala e indicar claramente sessões próximas, em andamento, concluídas ou canceladas.
- Oferecer entrada direta no cronômetro da sala quando a sessão estiver próxima ou em andamento.

## 3. Lembretes e confiabilidade
- Criar avisos para nova sessão, alteração, cancelamento e lembrete antes do início, respeitando as preferências de notificação existentes.
- Evitar avisos duplicados e manter operações idempotentes.
- Atualizar dados em tempo real sem reutilizar canais já inscritos.

## 4. Compatibilidade e acabamento
- Preservar as tabelas existentes e adicionar somente funções/regras retrocompatíveis necessárias.
- Traduzir todos os novos textos nos 12 idiomas.
- Validar tipos, regras de acesso, estados vazios/erro/carregamento e fluxo móvel principal.

## Ordem de entrega
1. Segurança e avisos de duelos.
2. Criação, listagem e confirmação de sessões.
3. Lembretes e acesso ao cronômetro.
4. Traduções e validação final.

## Detalhes técnicos
- Usar o sistema atual de avisos e preferências, sem serviço pago.
- Usar o fuso definido pela sala para calendário e apresentação.
- Aplicar funções autenticadas para respostas sensíveis e políticas de acesso por membro/gestor.
- Paginar consultas quando necessário e manter unidades de tempo sem conversões ambíguas.
