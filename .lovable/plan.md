## Objetivo
Deixar os nomes dos níveis mais aspiracionais (sem "Regular" morno) e traduzir 100% dos textos que hoje aparecem em inglês/português cru — conquistas da sala, "min hoje", legenda "Menos/Mais" do heatmap, descrição e período do heatmap — em todos os 12 idiomas, de forma profissional.

---

## 1. Renomear níveis (curva mais desejável)

Trocar apenas 2 nomes na escala (mantém 7 níveis, thresholds e cores em `src/lib/roomMemberLevel.ts`):

| Ordem | Horas | Chave i18n | Antes | Proposta |
|---|---|---|---|---|
| 1 | 0h | `level_novice` | Novato | Novato *(mantém)* |
| 2 | 0.5h | `level_starter` | Iniciante | Iniciante *(mantém)* |
| 3 | 3h | `level_regular` | **Regular** | **Persistente** (Consistent / Constant / Régulier / Beständig / Costante / 継続者 / 꾸준함 / 坚持者 / Настойчивый / مُثابر / Konsisten) |
| 4 | 10h | `level_dedicated` | Dedicado | Dedicado *(mantém)* |
| 5 | 30h | `level_veteran` | Veterano | Veterano *(mantém)* |
| 6 | 80h | `level_master` | Mestre | **Mestre** *(mantém — já é forte)* |
| 7 | 200h | `level_legend` | Lenda | Lenda *(mantém)* |

Motivo: "Regular / Regular / 普通" soa como "mediano". "Persistente" comunica virtude → gera desejo de alcançar. Só renomeamos o valor das chaves existentes → zero mudança de código.

Traduções profissionais do nível 3 nos 12 idiomas:
`pt-BR: Persistente · en-US: Consistent · es-ES: Constante · fr-FR: Régulier · de-DE: Beständig · it-IT: Costante · ja-JP: 継続者 · ko-KR: 꾸준함 · zh-CN: 坚持者 · ru-RU: Настойчивый · ar-SA: مُثابِر · id-ID: Konsisten`

---

## 2. Renomear conquistas fracas + i18n completo (12 idiomas)

Hoje `src/components/rooms/RoomAchievements.tsx` tem os nomes e descrições **hard-coded em PT/EN** dentro do arquivo. Vamos:

**2a. Melhorar 3 nomes que soam apagados** (mantendo tom épico/aspiracional):

| id | Antes (PT / EN) | Depois (PT / EN) |
|---|---|---|
| `total_10h` | Aquecendo / Warming Up | **Ignição / Ignition** |
| `members_5` | Pequena Tribo / Small Tribe | **Núcleo / The Core** |
| `members_10` | Time Formado / Squad Up | **Esquadrão / The Squad** |
| `members_25` | Comunidade / Community | **Guilda / The Guild** |
| `sync_5` | Sincronia / In Sync | **Em Sintonia / In Sync** *(só PT ajustado)* |

Demais nomes já estão bons: Em Ritmo, Maratonistas, Meio Milhar, Lenda Viva, Trio Certeiro, Semana Cheia, Mês Perfeito, Enxame Focado.

**2b. Mover TODOS os nomes e descrições para as 12 locales.**
Criar em cada `src/i18n/locales/*.json` o bloco:

```
rooms.achievements.<id>.name
rooms.achievements.<id>.desc
```

Substituir os objetos `NAMES` e `DESCS` inline por `t("rooms.achievements." + def.id + ".name")` / `.desc`. Remover `pickLang` e a lógica `isPt` para nomes/descrições (mantém `isPt` só para o fallback "hoje/ontem" — que também vamos i18n abaixo).

**2c. i18n dos textos auxiliares do card de conquistas** (hoje ainda em PT/EN literal):
- `rooms.achievements.today` = "hoje"
- `rooms.achievements.yesterday` = "ontem"
- `rooms.achievements.days_ago` = "há {{n}}d" / `{{n}}d ago` / etc.
- `rooms.achievements.months_ago` = "há {{n}}m" / `{{n}}mo ago`
- `rooms.achievements.locked` = "Bloqueada · {{rarity}}"
- `rooms.achievements.empty` = "Nenhuma conquista ainda — comecem a estudar para desbloquear as primeiras!"
- `rooms.achievements.rarity.common|rare|epic|legendary`
- `rooms.achievements.category.time|streak|community|special`

`RARITY_STYLES` e `CATEGORY_LABELS_PT/EN` continuam para cores, mas os labels vêm do i18n.

---

## 3. Traduzir strings soltas restantes (12 idiomas)

| Local | Chave | Estado atual |
|---|---|---|
| `RoomChallengesMatrix.tsx:670` | `rooms.challenges.total_today` = `"{{n}}min hoje"` | Só existe como defaultValue → adicionar às 12 locales |
| `RoomHeatmap.tsx` | `rooms.heatmap_less` = "Menos" / `rooms.heatmap_more` = "Mais" | Adicionar às 12 locales |
| `RoomHeatmap.tsx` | `rooms.heatmap_desc_v2` | Adicionar às 12 locales |
| `RoomHeatmap.tsx` | `rooms.heatmap_period_label` (`"últimos {{count}} dias"`) | Adicionar às 12 locales |

Traduções serão feitas de forma profissional (não literal) — por ex. em coreano `min hoje` → `오늘 {{n}}분`, chinês → `今日 {{n}}分钟`, japonês → `本日 {{n}}分`, árabe → `{{n}} د اليوم` (RTL correto).

---

## 4. Execução (ordem e escopo)

1. Editar `src/lib/roomMemberLevel.ts` — apenas trocar o label i18n do nível 3 nas 12 locales (chave `rooms.level_regular` → texto "Persistente/Consistent/…"). *A chave permanece a mesma para não quebrar nada.*
2. Refatorar `src/components/rooms/RoomAchievements.tsx`:
   - Remover `NAMES`, `DESCS`, `pickLang`, `CATEGORY_LABELS_PT/EN` (usar `t`).
   - Ler tudo via `t("rooms.achievements.…")`.
   - Aplicar os 4 novos nomes (Ignição, Núcleo, Esquadrão, Guilda, Em Sintonia).
3. Escrever um script Python único que injeta em cada `src/i18n/locales/*.json` (12 arquivos, em paralelo) os novos blocos: `rooms.achievements.*`, `rooms.heatmap_less/more/desc_v2/period_label`, `rooms.challenges.total_today`, e o novo texto do `level_regular`. Traduções listadas explicitamente no script (uma tabela por idioma), revisadas manualmente antes de rodar.
4. Verificação: build + abrir a sala em pt-BR, ko-KR e ar-SA para conferir que "Menos/Mais", "min hoje", nomes das conquistas e o nível "Persistente/꾸준함/مُثابِر" aparecem traduzidos.

## Fora de escopo
- Alterar thresholds/horas dos níveis ou raridades das conquistas.
- Ranking lateral, filtros do heatmap.
- Ícones e cores (mantidos).

## Confirmação
Se "Persistente" (nível 3) e os 4 nomes de conquistas propostos (Ignição, Núcleo, Esquadrão, Guilda) fizerem sentido, sigo com essa lista. Se quiser trocar algum, me diga qual antes de eu implementar.
