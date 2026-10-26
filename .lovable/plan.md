# Sala fora das "Opções da sessão" no cronômetro

## Recomendação

Tirar a sala de dentro de "Opções da sessão". Estudar numa sala é uma escolha social que muda o ranking e os desafios, então ela não deve ficar escondida. As opções técnicas (Corrida/GPS e Deep Work) continuam recolhidas.

## Nova ordem antes de iniciar

```text
[ Projeto                      v ]
[ Sala: Sem sala / Nome da sala v ]   <- sempre visível (só aparece se a pessoa tiver salas)
   Desafios da sala (empilhados, só quando há sala escolhida)
[ Opções da sessão: Corrida · Deep Work   v ]
Rotinas de foco
[ Iniciar ]
```

- **Sala**: campo próprio logo abaixo do projeto, com o ícone de pessoas e o nome da sala escolhida.
- **Desafios**: aparecem logo abaixo da sala, somente quando uma sala está escolhida; somem quando "Sem sala".
- **Opções da sessão**: passam a conter só Corrida e Deep Work. O botão mostra um resumo do que está ativo (ex.: "Corrida · 50 min") para a pessoa saber que há algo ligado sem abrir.
- Quem chega por um link de sala (ex.: "Abrir cronômetro" numa sessão agendada) já vê a sala escolhida, sem precisar abrir nada.
- Quem não participa de nenhuma sala não vê o campo (como hoje).
- Celular: tudo empilhado, largura total, sem rolagem lateral. Computador: mesma ordem, mesma largura do cartão.

## Detalhes técnicos

- `src/pages/Index.tsx`: mover `RoomPicker`, `RoomChallengePicker` e `RoomChallengeBanner` para fora do `Collapsible`, logo após `ProjectPicker`; renderizar desafios/banner só se `selectedRoom !== "none"`. Adicionar resumo (runMode / focusTarget) no gatilho.
- Manter `?options=1` abrindo as opções; `?room=` continua pré-selecionando a sala.
- Nenhuma mudança em como o tempo é salvo, desafios, ranking ou banco.
- Textos novos do resumo nos 12 idiomas.
- Validar em 320/360/390 px e desktop.
