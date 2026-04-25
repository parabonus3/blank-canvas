# Plano: copy melhor + categoria unissex + "Mostrar mais" para todos

## 1. Nova copy sem travessão (12 idiomas)

Trocar `settings.avatar_flair.description_free` por uma frase mais natural, sem travessão:

| Idioma | Nova copy |
|---|---|
| pt-BR | "Efeitos animados exclusivos para destacar seu avatar. Disponível nos planos Pro e Premium." |
| en-US | "Exclusive animated effects to highlight your avatar. Available on Pro and Premium plans." |
| es-ES | "Efectos animados exclusivos para destacar tu avatar. Disponible en los planes Pro y Premium." |
| fr-FR | "Des effets animés exclusifs pour mettre en valeur votre avatar. Disponible avec les plans Pro et Premium." |
| ja-JP | "アバターを際立たせる限定アニメーションエフェクト。ProプランとPremiumプランでご利用いただけます。" |
| de-DE | "Exklusive animierte Effekte, um deinen Avatar hervorzuheben. Verfügbar in den Plänen Pro und Premium." |
| it-IT | "Effetti animati esclusivi per mettere in risalto il tuo avatar. Disponibile nei piani Pro e Premium." |
| ru-RU | "Эксклюзивные анимированные эффекты для выделения вашего аватара. Доступно в планах Pro и Premium." |
| ar-SA | "تأثيرات متحركة حصرية لإبراز صورتك الرمزية. متاحة في خطط Pro و Premium." |
| ko-KR | "아바타를 돋보이게 하는 독점 애니메이션 효과. Pro 및 Premium 플랜에서 이용 가능합니다." |
| zh-CN | "独家动画特效，让你的头像与众不同。Pro 和 Premium 套餐可用。" |
| id-ID | "Efek animasi eksklusif untuk menonjolkan avatar Anda. Tersedia di paket Pro dan Premium." |

## 2. Renomear categoria "Femininos" para "Floral" (unissex)

A categoria atual reúne efeitos de pétalas, pérola e borboleta — todos têm tema floral/natureza. "Floral" funciona como termo unissex em quase todos idiomas.

Atualizar `settings.avatar_flair.categories.feminine` em **todos os 12 idiomas**:
- pt-BR/en/es/fr/de/it/id: "Floral" / "Floreale"
- ja: "フローラル" • ko: "플로럴" • zh: "花卉" • ru: "Флораль" • ar: "زهري"

Atualizar também:
- `settings.avatar_flair.free_cta_subtitle` (substituir "Femininos" por "Floral" em cada idioma)
- `pricing.feature_avatar_flair_pro` (mesma substituição) em todos os 12 idiomas

Os IDs internos dos flairs (`pro-blossom`, `premium-rose`, etc.) **não mudam** — só o rótulo da categoria.

## 3. Botão "Mostrar mais" também para usuários free

No `AvatarFlairPicker.tsx`, remover a condição `!isFree` em volta do botão de expandir. Resultado:

- Free vê os 4 Clássicos (já bloqueados/blur com a CTA "Ver planos") + botão **"Mostrar mais (+14 efeitos)"**.
- Ao clicar, expande Dark, Floral e Especiais — todos renderizados com o mesmo `pointer-events-none opacity-70 blur-[1.5px]` que já existe via `isFree` em `renderCategory`, então o usuário pode **ver** todos os efeitos sem conseguir clicar (gerando desejo de upgrade).

Sem outras mudanças no comportamento. A CTA "Desbloqueie efeitos animados no seu avatar / Ver planos" continua aparecendo no rodapé.

## Arquivos afetados

- `src/i18n/locales/{pt-BR,en-US,es-ES,fr-FR,ja-JP,de-DE,ar-SA,ko-KR,zh-CN,it-IT,ru-RU,id-ID}.json` (3 chaves cada)
- `src/components/settings/AvatarFlairPicker.tsx` (remover guard `!isFree` do botão expandir)

## Resultado esperado

Usuário free abre Configurações → Estilo do Avatar:
- Lê uma copy convidativa, natural, sem travessão.
- Vê os 4 Clássicos com blur + botão **"Mostrar mais (+14 efeitos)"**.
- Clica e visualiza todos Dark, Floral e Especiais bloqueados, criando vontade de assinar.
- A categoria antes chamada "Femininos" aparece como "Floral" — neutra, qualquer pessoa usa sem constrangimento.
