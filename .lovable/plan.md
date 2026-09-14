# Expansão multilíngue das salas de demonstração

## Situação confirmada

- Existem **796 pessoas de demonstração**, com cerca de 65–67 pessoas em cada um dos 12 idiomas.
- Só existem **24 salas de demonstração**: 12 em português, 7 em inglês e 5 em espanhol.
- Francês, alemão, italiano, japonês, coreano, chinês, russo, árabe e indonésio têm pessoas cadastradas, mas **nenhuma sala**.
- Essas pessoas sem sala também não têm histórico. Hoje há 7.448 sessões, concentradas nos três idiomas que receberam salas.
- A geração parou no meio e a tela administrativa usa totais fixos. Ao tentar continuar, ela não identifica corretamente o que falta por idioma.
- Os nomes começam a ganhar números quando a lista se repete, mensagens de sala só existem em português ou inglês, e a presença usa o mesmo horário para todos os países. Esses pontos prejudicam o realismo.

## Resultado proposto

Chegar a **80 salas protegidas por senha**, sem apagar as 24 atuais:

| Idioma | Salas finais | Situação |
|---|---:|---|
| Português | 12 | manter e revisar |
| Inglês | 7 | manter e revisar |
| Espanhol | 7 | manter 5 e adicionar 2 |
| Francês | 6 | adicionar 6 |
| Alemão | 6 | adicionar 6 |
| Italiano | 6 | adicionar 6 |
| Japonês | 6 | adicionar 6 |
| Coreano | 6 | adicionar 6 |
| Chinês | 6 | adicionar 6 |
| Russo | 6 | adicionar 6 |
| Árabe | 6 | adicionar 6 |
| Indonésio | 6 | adicionar 6 |

As 796 pessoas existentes serão reaproveitadas. Só serão criadas novas pessoas se algum idioma ficar abaixo do mínimo necessário após a auditoria, evitando aumentar as duplicações já existentes.

## Conteúdo das novas salas

- Criar nomes, descrições, regras, metas e mensagens **no idioma nativo**, com assuntos reconhecíveis no país.
- Misturar preparação acadêmica, concursos, certificações, leitura, escrita e carreira, sem deixar todas as salas com o mesmo perfil.
- Exemplos principais:
  - Japão: 共通テスト, 公務員試験, ITパスポート・基本情報, 大学院入試, 資格勉強, 読書習慣.
  - Coreia: 수능, 공무원, 코딩테스트, NCS 취업, TOEIC, 국가고시.
  - China: 高考, 考研, 公务员, 法考, 教师资格证, 编程学习.
  - França: Bac, PASS/LAS, grandes écoles, fonction publique, CRPE/CAPES, langues.
  - Alemanha: Abitur, Medizin/Jura Staatsexamen, IHK, Ausbildung, Meisterprüfung, Deutschprüfung.
  - Itália: Maturità, Medicina, concorsi pubblici, esami universitari, abilitazione, studio lingue.
  - Rússia: ЕГЭ, ОГЭ, университетские экзамены, языки, программирование, дипломная работа.
  - Árabe: القدرات والتحصيلي, medicina, exames universitários, IELTS, programação e trabalho focado.
  - Indonésia: UTBK/SNBT, CPNS, kedokteran, skripsi, TOEFL/IELTS e coding.
  - Espanhol: acrescentar certificações e preparação profissional sem repetir EBAU/MIR/oposiciones.
- Variar quantidade de membros, data de entrada, plano, sequência, horários, volume semanal e frequência. Evitar totais redondos ou padrões iguais.

## Geração segura e retomável

- Trocar os alvos globais fixos por metas **por idioma** e por etapas: pessoas, salas, membros, histórico e presença.
- Tornar cada etapa retomável: executar novamente cria somente o que estiver faltando, sem duplicar pessoas, salas, membros ou sessões.
- Corrigir nomes repetidos: combinar listas maiores de nomes e sobrenomes por localidade, com iniciais e apelidos ocasionais, sem sufixos numéricos visíveis.
- Distribuir as pessoas atualmente sem sala e gerar o histórico ausente para elas; não duplicar as 7.448 sessões existentes.
- Garantir senhas longas e diferentes por sala, mantendo todos os convites inacessíveis ao público.
- Remover o atalho fixo de inicialização da função administrativa; geração, pausa e remoção continuarão disponíveis somente para administradores autenticados.
- Preservar a remoção total por marcação de demonstração, sem alcançar usuários ou salas reais.

## Presença e aparência realista

- Calcular manhã, tarde e noite pelo fuso da própria sala, para Japão/Coreia/China não seguirem o horário do Brasil ou do servidor.
- Variar online e estudando em ciclos menores, mantendo proporções plausíveis e evitando que todos mudem juntos.
- Criar sessões abertas somente para membros daquela sala e fechá-las com durações variadas.
- Traduzir mensagens iniciais, texto de status e rótulo de meta nos 12 idiomas.
- Manter o ranking global equilibrado para as pessoas fictícias movimentarem o sistema sem ocupar permanentemente todas as primeiras posições.

## Explorar e administração

- No Explorar, priorizar primeiro as salas do idioma atual da pessoa, sem esconder as demais.
- Adicionar filtro de idioma ao lado de país e categoria, permitindo conferir facilmente japonês, coreano e os outros idiomas.
- Na administração, mostrar uma linha por idioma com: pessoas, salas, membros, pessoas com histórico e pessoas em atividade.
- Substituir o botão baseado em “50 salas/430 pessoas” por ações claras: **Completar dados ausentes**, **Pausar movimento** e **Remover demonstração**.
- Traduzir toda a área administrativa de demonstração para os 12 idiomas.

## Validação antes de concluir

1. Confirmar no banco pelo menos a quantidade planejada de salas em cada idioma, todas marcadas como demonstração e protegidas por senha.
2. Confirmar que cada idioma tem membros, histórico recente, sequências e presença dinâmica.
3. Abrir o Explorar nos 12 idiomas e verificar prioridade, filtro, bandeiras, textos e ausência de salas vazias.
4. Conferir rankings Agora, Hoje, Semana e Total para evitar números iguais, exagerados ou pessoas fictícias dominando tudo.
5. Entrar como administrador, pausar/retomar a presença e executar novamente a conclusão para provar que não duplica dados.
6. Validar a remoção em ambiente controlado, garantindo que somente registros de demonstração sejam selecionados.
