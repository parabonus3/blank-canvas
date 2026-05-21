## Objetivo
Três ajustes pontuais, todos refletidos nos 12 idiomas:

1. **Título "Metas 2026" → "Metas"** (sem o ano)
2. **Remover pontos finais dos taglines/hooks da landing**
3. **Bug do volume**: ao auto-iniciar o som ambiente junto com o timer, o volume salvo nas configurações é ignorado (toca em 50% padrão)

---

### 1. Título da página de Metas

**Arquivo:** `src/pages/Goals.tsx` (linha 120)

Trocar `{t("annual_goals.title")} {year}` por apenas `{t("annual_goals.title")}`. O `{year}` continua aparecendo no card de stats "Ano: 2026", então o usuário ainda vê o ano referente, mas o H1 vira só "Metas" — não passa a sensação de "metas apenas anuais".

Não há mudança de chave i18n necessária (os JSONs já têm `annual_goals.title = "Metas"`).

### 2. Pontos finais nos taglines/hero da landing

**Arquivos:** `src/i18n/locales/*.json` (12 arquivos)

Limpar o ponto final de:
- `landing.tagline_1` → "Seu tempo" (era "Seu tempo.")
- `landing.tagline_2` → "Sua prova" (era "Sua prova.")
- `landing.hero_subtitle` → manter (é frase completa com vírgula, não título; pontuação faz sentido). **Confirmação:** o usuário pediu "sem ponto final" em hooks/títulos curtos — o subtitle é parágrafo, mantemos. Se preferir tirar também, ajustar.

Aplicar a varredura em todos os 12 locales via script Node curto.

### 3. Bug do volume no auto-start do som ambiente

**Arquivo:** `src/pages/Index.tsx` (linhas 331–344)

Causa: o `AmbientSoundProvider` instancia `useAmbientSound()` sem `initialVolume`, então o `volume` interno fica em 0.5. Quando o auto-start chama `ambientSound.play(profile.ambient_sound!)`, o `play()` usa esse `volume` interno e ignora `profile.ambient_volume`.

Correção: antes do `play`, chamar `ambientSound.setVolume(profile.ambient_volume ?? 0.5)` e só então `play(...)`. Garante que o volume salvo seja aplicado tanto na geração via Web Audio quanto no `<audio>` de arquivos.

```ts
const timer = setTimeout(() => {
  ambientSound.setVolume(profile.ambient_volume ?? 0.5);
  ambientSound.play(profile.ambient_sound!);
  hasAutoPlayed.current = true;
}, 500);
```

Também adicionar `profile?.ambient_volume` nas deps do useEffect.

### 4. Sincronização i18n

Script: ler cada locale, atualizar `landing.tagline_1` e `landing.tagline_2` removendo o ponto final final (`.replace(/\.\s*$/, '')`), preservando o restante do conteúdo. Não toca em outras chaves.

---

## Arquivos a modificar
- `src/pages/Goals.tsx` (1 linha)
- `src/pages/Index.tsx` (autoplay effect)
- `src/i18n/locales/*.json` × 12 (tagline_1, tagline_2)

Sem mudanças de lógica de negócio, schema ou novas dependências.