# Reescrita estratégica das copys da landing (12 idiomas)

## Diagnóstico do que precisa mudar

A landing atual vende **features** (timer, 14 sons, CSV, PDF) quando deveria vender **transformação**. O posicionamento real do TimeZoni, conforme sua análise, é:

> "O app que transforma foco em progresso visível, sozinho ou com outras pessoas."

Três pilares mal explorados hoje:
1. **Clareza brutal** sobre onde o tempo foi (prova de trabalho)
2. **Pressão social positiva** com salas ao vivo + ranking (subutilizado)
3. **Dopamina produtiva** com árvore, streaks e conquistas (vendido como "gamificação", termo frio)

E um inimigo claro que não aparece: **scroll infinito, falso estudo, "trabalhei o dia todo e não fiz nada"**.

## Princípios da reescrita

- **Sem travessões** (—, –) em nenhum idioma. Substituir por vírgula, ponto, dois pontos ou parênteses.
- Vender **mecanismo + resultado**, não lista de features.
- Inimigo nomeado nas dores (procrastinação, distração, tempo invisível).
- Adicionar pilar de **comunidade/salas** (hoje ausente da landing, mas é o diferencial mais raro).
- Tom: direto, honesto, levemente provocador ("Pare de achar que produziu. Prove.") sem soar agressivo demais para ads.
- Manter chaves de tradução existentes (zero mudança de código React/JSX). Só edita os JSONs.

## Estrutura nova das seções (mesmas chaves, novo conteúdo)

### Hero
- `hero_tagline`: posicionamento forte em uma linha. Ex PT: "Transforme foco em progresso visível."
- `hero_subtitle`: promessa concreta + mecanismo. Ex: "Cronometre seu trabalho real, entre em flow com sons ambiente e prove o que você fez no fim do dia."

### Problema (inimigo claro)
- `problem_1`: tempo invisível ("Você fechou o notebook achando que produziu, mas não consegue dizer no quê.")
- `problem_2`: distração e falso estudo ("Abriu pra estudar, gastou 2 horas no feed e ainda se sente cansado.")
- `problem_3`: falta de prova ("Trabalha duro mas não tem nada concreto pra mostrar pra você mesmo, pro cliente ou pro seu eu de amanhã.")

### Solução
- `solution_title`: "Conheça o TimeZoni" mantém, mas
- `solution_subtitle`: foco no triplo pilar (medir, focar, pertencer). Ex: "Um sistema que mede o que você faz, te coloca em flow e te conecta com gente focando junto, em tempo real."

### Features (vender mecanismo, não item)
- `feature_smart_timer`: "Saiba pra onde foi cada hora" (em vez de "rastreie")
- `feature_pomodoro`: "Entre em flow em segundos" (vende sensação)
- `feature_sounds`: "O ambiente certo pra calar a mente" (em vez de "14+ sons")
- `feature_goals`: "Metas que puxam você todo dia"
- `feature_history`: "Prova concreta do seu trabalho" (CSV/PDF como prova, não exportação)
- `feature_achievements`: "Sua consistência virando algo vivo" (árvore como metáfora emocional)

### How It Works
Reescrever os 3 passos com verbos de ação e benefício imediato no fim de cada um.

### Stats
Manter formato (são labels curtos), só ajustar textos para soarem como prova social, não brochura técnica.

### Final CTA
- `final_cta_title`: provocação positiva. Ex: "Pare de achar que produziu. Comece a provar."
- `final_cta_subtitle`: reforço de comunidade + risco zero.
- `final_cta_button`: manter "Comece grátis, sem cartão" (já está bom).

### Pricing
- `plans_subtitle`: focar em valor percebido, não em "comece grátis e pague depois".
- Descrições de plano (`plan_free_desc`, `plan_pro_desc`, `plan_premium_desc`): traduzir em **pra quem é**, não em **o que tem**.

## Arquivos afetados

Apenas os 12 JSONs de tradução:
```
src/i18n/locales/pt-BR.json
src/i18n/locales/en-US.json
src/i18n/locales/es-ES.json
src/i18n/locales/fr-FR.json
src/i18n/locales/de-DE.json
src/i18n/locales/it-IT.json
src/i18n/locales/ru-RU.json
src/i18n/locales/zh-CN.json
src/i18n/locales/ja-JP.json
src/i18n/locales/ko-KR.json
src/i18n/locales/ar-SA.json
src/i18n/locales/id-ID.json
```

Chaves alteradas (mesma estrutura, novo texto), todas dentro de `landing.*` e algumas de `pricing.*`:

- `hero_tagline`, `hero_subtitle`
- `problem_title`, `problem_1_title/desc`, `problem_2_title/desc`, `problem_3_title/desc`
- `solution_title`, `solution_subtitle`
- `feature_smart_timer_title/desc`, `feature_pomodoro_title/desc`, `feature_sounds_title/desc_full`, `feature_goals_title/desc`, `feature_history_title/desc_full`, `feature_achievements_title/desc`
- `how_title`, `how_step_1/2/3_title/desc`
- `stats_sounds_label`, `stats_pomodoro_label`, `stats_export_label`, `stats_languages_label`
- `final_cta_title`, `final_cta_subtitle`
- `plans_title`, `plans_subtitle`, `plan_free_desc`, `plan_pro_desc`, `plan_premium_desc`

## Detalhes técnicos

- **Zero alteração** em `Landing.tsx`, `PricingSection.tsx` ou qualquer componente. As chaves i18n permanecem idênticas.
- **Sem travessões** em nenhum idioma: faço uma verificação automática (`grep -n "—\|–"`) em cada arquivo após edição.
- **JSON válido** garantido (escape de aspas onde necessário, principalmente PT/EN/FR/DE).
- **RTL (ar-SA)**: textos em árabe respeitam o tom mas mantêm naturalidade idiomática, sem tradução literal.
- **CJK (zh, ja, ko)**: adaptação cultural, não tradução palavra por palavra. Por exemplo, "prova de trabalho" vira algo culturalmente equivalente a "evidência concreta do seu esforço".
- Mantenho os comprimentos próximos do original para não quebrar layout (especialmente títulos do hero, CTA e cards de features que têm espaço limitado em mobile).

## O que NÃO está incluído neste plano

- Criação de variantes de anúncios (Facebook/Instagram/TikTok ads). Esse seria um próximo passo, com copys segmentadas por persona (estudante x freelancer), conforme seu insight de "dois produtos em um".
- Mudança de design/layout da landing.
- Adição de nova seção de "salas/comunidade" (recomendaria fazer depois, mas não está neste escopo).

## Próximo passo sugerido (após aprovar este plano)

Depois que as copys estiverem reescritas, posso gerar um **kit de anúncios** (10 a 15 variações de copy curta para ads) separados por:
- Persona A (racional): freelancers, profissionais, "prove seu trabalho"
- Persona B (emocional): estudantes, jovens, "estude junto, foco gamificado"

É só pedir após aprovar este.
