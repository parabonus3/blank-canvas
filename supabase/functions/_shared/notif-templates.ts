// Notification templates: 12 languages, multiple variations per kind.
// Variables: {{room_name}}, {{streak_days}}, {{remaining_h}}, {{challenge_name}},
// {{hours_left}}, {{days}}, {{hours}}, {{sessions}}, {{friend_name}}, {{friend_count}},
// {{sender_name}}.

export type NotifKind =
  | "test"
  | "room_goal_reminder"
  | "streak_risk"
  | "room_challenge_deadline"
  | "re_engagement"
  | "weekly_recap"
  | "friend_activity"
  | "chat_mentions"
  | "friend_request"
  | "friend_accepted"
  | "board_invite"
  | "task_assigned"
  | "task_comment"
  | "morning_kickoff"
  | "task_due_today";

type LangPack = Partial<Record<NotifKind, { title: string; body: string }[]>>;

const T: Record<string, LangPack> = {
  "pt-BR": {
    test: [{ title: "🔔 TimeZoni", body: "Notificações ativadas! Vamos focar?" }],
    room_goal_reminder: [
      { title: "📚 Ainda dá tempo!", body: "Sua meta de hoje em {{room_name}} te espera." },
      { title: "⏰ Faltam {{remaining_h}}h", body: "Bata sua meta em {{room_name}} antes da meia-noite." },
      { title: "🎯 Seus colegas já contabilizaram", body: "Não fique para trás em {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Sua ofensiva está em risco", body: "Não perca {{streak_days}} dias seguidos! Bastam 10 minutos." },
      { title: "❄️ Ofensiva de {{streak_days}} dias", body: "Contabilize hoje pra não quebrar a sequência." },
      { title: "🏆 {{streak_days}} dias e contando", body: "Você chegou longe. Não pare agora!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Sprint final!", body: "O desafio {{challenge_name}} acaba em {{hours_left}}h." },
      { title: "⏳ Última chamada", body: "Faltam {{hours_left}}h para fechar {{challenge_name}}." },
      { title: "💪 Reta final", body: "Bora terminar {{challenge_name}} antes do prazo!" },
    ],
    re_engagement: [
      { title: "👀 Sentimos sua falta", body: "Faz {{days}} dias… que tal uma sessão rapidinha?" },
      { title: "🌱 Suas plantinhas pedem água", body: "Volte hoje e mantenha o ritmo!" },
      { title: "✨ Que bom te ver de novo", body: "Comece com 15 minutos. O resto vem." },
    ],
    weekly_recap: [
      { title: "📊 Resumo da semana", body: "Você focou {{hours}}h em {{sessions}} sessões. Bora pra próxima?" },
      { title: "🗓️ Como foi sua semana?", body: "{{hours}}h de foco na conta. Confira o detalhado." },
      { title: "🚀 Semana fechada!", body: "{{sessions}} sessões, {{hours}}h totais. Veja o resumo." },
    ],
    friend_activity: [
      { title: "👥 Seus amigos focaram hoje", body: "{{friend_count}} amigos treinaram. Sua vez!" },
      { title: "🎉 {{friend_name}} completou {{hours}}h hoje", body: "Não fique de fora — vamos focar!" },
      { title: "🔥 Movimento entre amigos", body: "{{friend_count}} amigos no ritmo hoje. Bora junto!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} mencionou você", body: "Nova menção em {{room_name}}." },
      { title: "@ Você foi citado em {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "en-US": {
    test: [{ title: "🔔 TimeZoni", body: "Notifications are on! Time to focus?" }],
    room_goal_reminder: [
      { title: "📚 There's still time", body: "Your daily goal in {{room_name}} is waiting." },
      { title: "⏰ {{remaining_h}}h left", body: "Hit your goal in {{room_name}} before midnight." },
      { title: "🎯 Your peers already logged time", body: "Don't fall behind in {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Your streak is at risk", body: "Don't lose your {{streak_days}}-day streak! Just 10 minutes." },
      { title: "❄️ {{streak_days}}-day streak", body: "Log a session today to keep it alive." },
      { title: "🏆 {{streak_days}} days and counting", body: "You've come far. Don't stop now!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Final sprint!", body: "Challenge {{challenge_name}} ends in {{hours_left}}h." },
      { title: "⏳ Last call", body: "{{hours_left}}h left to close {{challenge_name}}." },
      { title: "💪 Home stretch", body: "Let's finish {{challenge_name}} before time's up!" },
    ],
    re_engagement: [
      { title: "👀 We miss you", body: "It's been {{days}} days… how about a quick session?" },
      { title: "🌱 Your plants are thirsty", body: "Come back today and keep the rhythm!" },
      { title: "✨ Good to see you again", body: "Start with 15 minutes. The rest follows." },
    ],
    weekly_recap: [
      { title: "📊 Weekly recap", body: "You focused {{hours}}h across {{sessions}} sessions. Onward!" },
      { title: "🗓️ How was your week?", body: "{{hours}}h logged. Check the details." },
      { title: "🚀 Week wrapped!", body: "{{sessions}} sessions, {{hours}}h total. See the recap." },
    ],
    friend_activity: [
      { title: "👥 Your friends focused today", body: "{{friend_count}} friends studied. Your turn!" },
      { title: "🎉 {{friend_name}} logged {{hours}}h today", body: "Don't fall behind — let's focus!" },
      { title: "🔥 Friends in motion", body: "{{friend_count}} friends kept the rhythm today. Join in!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} mentioned you", body: "New mention in {{room_name}}." },
      { title: "@ You were mentioned in {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "es-ES": {
    test: [{ title: "🔔 TimeZoni", body: "¡Notificaciones activadas! ¿Listo para enfocarte?" }],
    room_goal_reminder: [
      { title: "📚 Aún hay tiempo", body: "Tu meta diaria en {{room_name}} te espera." },
      { title: "⏰ Quedan {{remaining_h}}h", body: "Cumple tu meta en {{room_name}} antes de medianoche." },
      { title: "🎯 Tus compañeros ya registraron", body: "No te quedes atrás en {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Tu racha está en riesgo", body: "¡No pierdas tus {{streak_days}} días! Solo 10 minutos." },
      { title: "❄️ Racha de {{streak_days}} días", body: "Registra una sesión hoy para mantenerla." },
      { title: "🏆 {{streak_days}} días y contando", body: "Has llegado lejos. ¡No pares ahora!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 ¡Sprint final!", body: "El reto {{challenge_name}} termina en {{hours_left}}h." },
      { title: "⏳ Última llamada", body: "Quedan {{hours_left}}h para cerrar {{challenge_name}}." },
      { title: "💪 Recta final", body: "¡Vamos a cerrar {{challenge_name}} a tiempo!" },
    ],
    re_engagement: [
      { title: "👀 Te extrañamos", body: "Han pasado {{days}} días… ¿qué tal una sesión rápida?" },
      { title: "🌱 Tus plantas tienen sed", body: "Vuelve hoy y mantén el ritmo." },
      { title: "✨ Qué bueno verte", body: "Empieza con 15 minutos. Lo demás llega solo." },
    ],
    weekly_recap: [
      { title: "📊 Resumen semanal", body: "Enfocaste {{hours}}h en {{sessions}} sesiones. ¡A por más!" },
      { title: "🗓️ ¿Cómo fue tu semana?", body: "{{hours}}h registradas. Mira el detalle." },
      { title: "🚀 ¡Semana cerrada!", body: "{{sessions}} sesiones, {{hours}}h totales." },
    ],
    friend_activity: [
      { title: "👥 Tus amigos se enfocaron hoy", body: "{{friend_count}} amigos estudiaron. ¡Tu turno!" },
      { title: "🎉 {{friend_name}} registró {{hours}}h hoy", body: "No te quedes atrás — ¡a enfocarte!" },
      { title: "🔥 Amigos en movimiento", body: "{{friend_count}} amigos hoy. ¡Únete!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} te mencionó", body: "Nueva mención en {{room_name}}." },
      { title: "@ Fuiste mencionado en {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "fr-FR": {
    test: [{ title: "🔔 TimeZoni", body: "Notifications activées ! On se concentre ?" }],
    room_goal_reminder: [
      { title: "📚 Il reste du temps", body: "Votre objectif du jour dans {{room_name}} vous attend." },
      { title: "⏰ {{remaining_h}}h restantes", body: "Atteignez votre objectif dans {{room_name}} avant minuit." },
      { title: "🎯 Vos pairs ont déjà avancé", body: "Ne restez pas à la traîne dans {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Votre série est en danger", body: "Ne perdez pas vos {{streak_days}} jours ! 10 minutes suffisent." },
      { title: "❄️ Série de {{streak_days}} jours", body: "Enregistrez une session aujourd'hui." },
      { title: "🏆 {{streak_days}} jours d'affilée", body: "Vous êtes allé loin. Ne lâchez pas !" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Sprint final !", body: "Le défi {{challenge_name}} se termine dans {{hours_left}}h." },
      { title: "⏳ Dernier appel", body: "Il reste {{hours_left}}h pour {{challenge_name}}." },
      { title: "💪 Dernière ligne droite", body: "Finissons {{challenge_name}} à temps !" },
    ],
    re_engagement: [
      { title: "👀 Vous nous manquez", body: "Cela fait {{days}} jours… une petite session ?" },
      { title: "🌱 Vos plantes ont soif", body: "Revenez aujourd'hui et gardez le rythme." },
      { title: "✨ Ravi de vous revoir", body: "Commencez par 15 minutes. La suite viendra." },
    ],
    weekly_recap: [
      { title: "📊 Récap de la semaine", body: "{{hours}}h de focus en {{sessions}} sessions. On continue !" },
      { title: "🗓️ Quelle semaine ?", body: "{{hours}}h enregistrées. Voir le détail." },
      { title: "🚀 Semaine bouclée !", body: "{{sessions}} sessions, {{hours}}h au total." },
    ],
    friend_activity: [
      { title: "👥 Vos amis ont bossé aujourd'hui", body: "{{friend_count}} amis ont étudié. À vous !" },
      { title: "🎉 {{friend_name}} a fait {{hours}}h aujourd'hui", body: "Ne restez pas à la traîne !" },
      { title: "🔥 Amis en action", body: "{{friend_count}} amis dans le rythme. Rejoignez-les !" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} vous a mentionné", body: "Nouvelle mention dans {{room_name}}." },
      { title: "@ Vous avez été mentionné dans {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "de-DE": {
    test: [{ title: "🔔 TimeZoni", body: "Benachrichtigungen aktiv! Bereit zum Fokussieren?" }],
    room_goal_reminder: [
      { title: "📚 Noch ist Zeit", body: "Dein Tagesziel in {{room_name}} wartet." },
      { title: "⏰ {{remaining_h}}h verbleiben", body: "Erreiche dein Ziel in {{room_name}} vor Mitternacht." },
      { title: "🎯 Andere haben schon geloggt", body: "Bleib nicht zurück in {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Deine Serie ist gefährdet", body: "Verliere keine {{streak_days}} Tage! 10 Minuten reichen." },
      { title: "❄️ {{streak_days}}-Tage-Serie", body: "Logge heute eine Session, um sie zu halten." },
      { title: "🏆 {{streak_days}} Tage in Folge", body: "Du bist weit gekommen. Mach weiter!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Endspurt!", body: "Challenge {{challenge_name}} endet in {{hours_left}}h." },
      { title: "⏳ Letzter Aufruf", body: "Noch {{hours_left}}h für {{challenge_name}}." },
      { title: "💪 Zielgerade", body: "Lass uns {{challenge_name}} rechtzeitig abschließen!" },
    ],
    re_engagement: [
      { title: "👀 Wir vermissen dich", body: "Schon {{days}} Tage… wie wäre eine kurze Session?" },
      { title: "🌱 Deine Pflanzen brauchen Wasser", body: "Komm heute zurück und halte den Rhythmus." },
      { title: "✨ Schön, dich zu sehen", body: "Starte mit 15 Minuten. Der Rest folgt." },
    ],
    weekly_recap: [
      { title: "📊 Wochenrückblick", body: "{{hours}}h Fokus in {{sessions}} Sessions. Weiter so!" },
      { title: "🗓️ Wie war deine Woche?", body: "{{hours}}h geloggt. Details ansehen." },
      { title: "🚀 Woche abgeschlossen!", body: "{{sessions}} Sessions, insgesamt {{hours}}h." },
    ],
    friend_activity: [
      { title: "👥 Deine Freunde waren fokussiert", body: "{{friend_count}} Freunde haben gelernt. Du bist dran!" },
      { title: "🎉 {{friend_name}} hat heute {{hours}}h geschafft", body: "Bleib nicht zurück!" },
      { title: "🔥 Freunde in Bewegung", body: "{{friend_count}} Freunde heute im Rhythmus. Mach mit!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} hat dich erwähnt", body: "Neue Erwähnung in {{room_name}}." },
      { title: "@ Erwähnung in {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "it-IT": {
    test: [{ title: "🔔 TimeZoni", body: "Notifiche attivate! Pronto a concentrarti?" }],
    room_goal_reminder: [
      { title: "📚 C'è ancora tempo", body: "Il tuo obiettivo in {{room_name}} ti aspetta." },
      { title: "⏰ Mancano {{remaining_h}}h", body: "Raggiungi il tuo obiettivo in {{room_name}}." },
      { title: "🎯 I tuoi compagni hanno già loggato", body: "Non restare indietro in {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 La tua streak è a rischio", body: "Non perdere {{streak_days}} giorni! Bastano 10 minuti." },
      { title: "❄️ Streak di {{streak_days}} giorni", body: "Registra una sessione oggi." },
      { title: "🏆 {{streak_days}} giorni di fila", body: "Sei arrivato lontano. Non fermarti!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Sprint finale!", body: "La sfida {{challenge_name}} finisce tra {{hours_left}}h." },
      { title: "⏳ Ultima chiamata", body: "Restano {{hours_left}}h per {{challenge_name}}." },
      { title: "💪 Dirittura d'arrivo", body: "Chiudiamo {{challenge_name}} in tempo!" },
    ],
    re_engagement: [
      { title: "👀 Ci manchi", body: "Sono passati {{days}} giorni… una sessione veloce?" },
      { title: "🌱 Le tue piante hanno sete", body: "Torna oggi e mantieni il ritmo." },
      { title: "✨ Bello rivederti", body: "Inizia con 15 minuti. Il resto arriva." },
    ],
    weekly_recap: [
      { title: "📊 Riepilogo settimanale", body: "{{hours}}h di focus in {{sessions}} sessioni. Avanti!" },
      { title: "🗓️ Com'è andata la settimana?", body: "{{hours}}h registrate. Guarda i dettagli." },
      { title: "🚀 Settimana chiusa!", body: "{{sessions}} sessioni, {{hours}}h totali." },
    ],
    friend_activity: [
      { title: "👥 I tuoi amici si sono concentrati oggi", body: "{{friend_count}} amici hanno studiato. Tocca a te!" },
      { title: "🎉 {{friend_name}} ha fatto {{hours}}h oggi", body: "Non restare indietro!" },
      { title: "🔥 Amici in movimento", body: "{{friend_count}} amici oggi. Unisciti!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} ti ha menzionato", body: "Nuova menzione in {{room_name}}." },
      { title: "@ Menzione in {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "ja-JP": {
    test: [{ title: "🔔 TimeZoni", body: "通知をオンにしました！集中しましょう。" }],
    room_goal_reminder: [
      { title: "📚 まだ間に合います", body: "{{room_name}} の今日の目標が残っています。" },
      { title: "⏰ あと{{remaining_h}}時間", body: "深夜までに {{room_name}} の目標を達成しよう。" },
      { title: "🎯 仲間はもう記録しました", body: "{{room_name}} で遅れないように。" },
    ],
    streak_risk: [
      { title: "🔥 連続記録が危険", body: "{{streak_days}}日連続を失わないで！10分でOK。" },
      { title: "❄️ {{streak_days}}日連続", body: "今日も記録してキープしよう。" },
      { title: "🏆 {{streak_days}}日継続中", body: "ここまで来たんです。止まらないで！" },
    ],
    room_challenge_deadline: [
      { title: "🚨 ラストスパート！", body: "チャレンジ {{challenge_name}} はあと{{hours_left}}時間。" },
      { title: "⏳ 最終コール", body: "{{challenge_name}} まで残り{{hours_left}}時間。" },
      { title: "💪 直線コース", body: "{{challenge_name}} を時間内に終わらせよう！" },
    ],
    re_engagement: [
      { title: "👀 お久しぶりです", body: "{{days}}日経ちました。短いセッションどう？" },
      { title: "🌱 植物が水を欲しがっています", body: "今日戻ってリズムを保とう。" },
      { title: "✨ また会えて嬉しい", body: "15分から始めよう。あとは続きます。" },
    ],
    weekly_recap: [
      { title: "📊 週間まとめ", body: "{{sessions}}セッションで{{hours}}時間集中しました！" },
      { title: "🗓️ 今週はどうでしたか？", body: "{{hours}}時間記録。詳細を確認しよう。" },
      { title: "🚀 一週間完了！", body: "{{sessions}}セッション、合計{{hours}}時間。" },
    ],
    friend_activity: [
      { title: "👥 友達が今日集中しました", body: "{{friend_count}}人の友達が学習中。あなたの番！" },
      { title: "🎉 {{friend_name}} が今日{{hours}}時間", body: "遅れないように！" },
      { title: "🔥 友達が動いています", body: "{{friend_count}}人が今日リズム中。参加しよう！" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} があなたにメンション", body: "{{room_name}} で新しいメンション。" },
      { title: "@ {{room_name}} でメンション", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "ko-KR": {
    test: [{ title: "🔔 TimeZoni", body: "알림이 켜졌습니다! 집중할 시간이에요." }],
    room_goal_reminder: [
      { title: "📚 아직 시간이 있어요", body: "{{room_name}}의 오늘 목표가 기다리고 있어요." },
      { title: "⏰ {{remaining_h}}시간 남음", body: "자정 전에 {{room_name}} 목표를 달성하세요." },
      { title: "🎯 동료들은 이미 기록했어요", body: "{{room_name}}에서 뒤처지지 마세요." },
    ],
    streak_risk: [
      { title: "🔥 연속 기록 위험", body: "{{streak_days}}일 연속을 잃지 마세요! 10분이면 됩니다." },
      { title: "❄️ {{streak_days}}일 연속", body: "오늘 세션을 기록해 유지하세요." },
      { title: "🏆 {{streak_days}}일 째", body: "여기까지 왔어요. 멈추지 마세요!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 마지막 스퍼트!", body: "챌린지 {{challenge_name}}이 {{hours_left}}시간 후 종료." },
      { title: "⏳ 마지막 호출", body: "{{challenge_name}}까지 {{hours_left}}시간." },
      { title: "💪 결승선", body: "{{challenge_name}}을 제때 끝냅시다!" },
    ],
    re_engagement: [
      { title: "👀 보고 싶어요", body: "{{days}}일 지났어요. 짧은 세션 어때요?" },
      { title: "🌱 식물이 목말라요", body: "오늘 돌아와 리듬을 유지하세요." },
      { title: "✨ 다시 봐서 반가워요", body: "15분으로 시작하세요. 나머지는 따라옵니다." },
    ],
    weekly_recap: [
      { title: "📊 주간 요약", body: "{{sessions}}세션 동안 {{hours}}시간 집중했어요!" },
      { title: "🗓️ 이번 주 어땠나요?", body: "{{hours}}시간 기록. 상세 보기." },
      { title: "🚀 한 주 마감!", body: "{{sessions}}세션, 총 {{hours}}시간." },
    ],
    friend_activity: [
      { title: "👥 친구들이 오늘 집중했어요", body: "{{friend_count}}명의 친구가 학습 중. 당신 차례!" },
      { title: "🎉 {{friend_name}}이 오늘 {{hours}}시간", body: "뒤처지지 마세요!" },
      { title: "🔥 친구들이 움직여요", body: "{{friend_count}}명이 오늘 리듬 중. 함께해요!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}}이 당신을 언급", body: "{{room_name}}의 새 언급." },
      { title: "@ {{room_name}}에서 언급", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "zh-CN": {
    test: [{ title: "🔔 TimeZoni", body: "通知已开启！开始专注吧。" }],
    room_goal_reminder: [
      { title: "📚 还有时间", body: "{{room_name}} 今天的目标在等你。" },
      { title: "⏰ 还剩 {{remaining_h}} 小时", body: "午夜前完成 {{room_name}} 的目标。" },
      { title: "🎯 同伴们已经记录", body: "别在 {{room_name}} 落后。" },
    ],
    streak_risk: [
      { title: "🔥 连续打卡有危险", body: "别丢掉 {{streak_days}} 天连续！10 分钟就够。" },
      { title: "❄️ {{streak_days}} 天连续", body: "今天记录一次保持下去。" },
      { title: "🏆 {{streak_days}} 天连续", body: "走了这么远，别停下！" },
    ],
    room_challenge_deadline: [
      { title: "🚨 最后冲刺！", body: "挑战 {{challenge_name}} 还剩 {{hours_left}} 小时。" },
      { title: "⏳ 最后通知", body: "{{challenge_name}} 还有 {{hours_left}} 小时。" },
      { title: "💪 冲刺阶段", body: "按时完成 {{challenge_name}}！" },
    ],
    re_engagement: [
      { title: "👀 想你了", body: "已经 {{days}} 天了，来一次短会话？" },
      { title: "🌱 植物渴了", body: "今天回来保持节奏。" },
      { title: "✨ 很高兴再见", body: "从 15 分钟开始，其他自然跟上。" },
    ],
    weekly_recap: [
      { title: "📊 周回顾", body: "本周你专注了 {{hours}} 小时，共 {{sessions}} 次会话。" },
      { title: "🗓️ 这周怎么样？", body: "{{hours}} 小时已记录。查看详情。" },
      { title: "🚀 一周结束！", body: "{{sessions}} 次会话，共 {{hours}} 小时。" },
    ],
    friend_activity: [
      { title: "👥 你的朋友今天专注了", body: "{{friend_count}} 位朋友在学习。到你了！" },
      { title: "🎉 {{friend_name}} 今天完成 {{hours}} 小时", body: "别落后！" },
      { title: "🔥 朋友都在行动", body: "{{friend_count}} 位朋友今天保持节奏。加入吧！" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} 提到了你", body: "{{room_name}} 有新提及。" },
      { title: "@ 在 {{room_name}} 被提及", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "ru-RU": {
    test: [{ title: "🔔 TimeZoni", body: "Уведомления включены! Поработаем?" }],
    room_goal_reminder: [
      { title: "📚 Ещё есть время", body: "Ваша цель в {{room_name}} ждёт." },
      { title: "⏰ Осталось {{remaining_h}}ч", body: "Закройте цель в {{room_name}} до полуночи." },
      { title: "🎯 Коллеги уже отметились", body: "Не отставайте в {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Серия под угрозой", body: "Не теряйте {{streak_days}} дней! Хватит 10 минут." },
      { title: "❄️ Серия {{streak_days}} дней", body: "Зафиксируйте сессию сегодня." },
      { title: "🏆 {{streak_days}} дней подряд", body: "Вы далеко зашли. Не останавливайтесь!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Финальный рывок!", body: "Челлендж {{challenge_name}} закроется через {{hours_left}}ч." },
      { title: "⏳ Последний шанс", body: "До конца {{challenge_name}} осталось {{hours_left}}ч." },
      { title: "💪 Финишная прямая", body: "Закроем {{challenge_name}} вовремя!" },
    ],
    re_engagement: [
      { title: "👀 Скучаем", body: "Прошло {{days}} дней… короткая сессия?" },
      { title: "🌱 Растения хотят пить", body: "Вернитесь сегодня и держите ритм." },
      { title: "✨ Рады видеть снова", body: "Начните с 15 минут. Остальное приложится." },
    ],
    weekly_recap: [
      { title: "📊 Итоги недели", body: "Вы сфокусировались {{hours}}ч за {{sessions}} сессий." },
      { title: "🗓️ Как прошла неделя?", body: "{{hours}}ч записано. Детали внутри." },
      { title: "🚀 Неделя закрыта!", body: "{{sessions}} сессий, {{hours}}ч всего." },
    ],
    friend_activity: [
      { title: "👥 Друзья фокусировались сегодня", body: "{{friend_count}} друзей учились. Ваша очередь!" },
      { title: "🎉 {{friend_name}} провёл {{hours}}ч сегодня", body: "Не отставайте!" },
      { title: "🔥 Друзья в движении", body: "{{friend_count}} друзей в ритме. Присоединяйтесь!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} упомянул вас", body: "Новое упоминание в {{room_name}}." },
      { title: "@ Упоминание в {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "ar-SA": {
    test: [{ title: "🔔 TimeZoni", body: "تم تفعيل الإشعارات! هيا للتركيز." }],
    room_goal_reminder: [
      { title: "📚 لا يزال هناك وقت", body: "هدفك اليومي في {{room_name}} ينتظرك." },
      { title: "⏰ تبقى {{remaining_h}} ساعة", body: "حقق هدفك في {{room_name}} قبل منتصف الليل." },
      { title: "🎯 زملاؤك سجلوا بالفعل", body: "لا تتأخر في {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 سلسلتك في خطر", body: "لا تفقد {{streak_days}} يومًا! تكفي 10 دقائق." },
      { title: "❄️ سلسلة {{streak_days}} يوم", body: "سجل جلسة اليوم للحفاظ عليها." },
      { title: "🏆 {{streak_days}} يومًا متتاليًا", body: "وصلت بعيدًا. لا تتوقف الآن!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 السباق الأخير!", body: "ينتهي تحدي {{challenge_name}} خلال {{hours_left}} ساعة." },
      { title: "⏳ آخر فرصة", body: "تبقى {{hours_left}} ساعة لإغلاق {{challenge_name}}." },
      { title: "💪 خط النهاية", body: "لننهِ {{challenge_name}} في الوقت!" },
    ],
    re_engagement: [
      { title: "👀 نفتقدك", body: "مرت {{days}} أيام… ما رأيك في جلسة سريعة؟" },
      { title: "🌱 نباتاتك عطشى", body: "ارجع اليوم وحافظ على الإيقاع." },
      { title: "✨ سعداء برؤيتك", body: "ابدأ بـ 15 دقيقة. الباقي يأتي." },
    ],
    weekly_recap: [
      { title: "📊 ملخص الأسبوع", body: "ركزت {{hours}} ساعة في {{sessions}} جلسات." },
      { title: "🗓️ كيف كان أسبوعك؟", body: "{{hours}} ساعة مسجلة. اطلع على التفاصيل." },
      { title: "🚀 انتهى الأسبوع!", body: "{{sessions}} جلسات، إجمالي {{hours}} ساعة." },
    ],
    friend_activity: [
      { title: "👥 أصدقاؤك ركزوا اليوم", body: "{{friend_count}} أصدقاء درسوا. دورك!" },
      { title: "🎉 {{friend_name}} أنجز {{hours}} ساعة اليوم", body: "لا تتأخر!" },
      { title: "🔥 الأصدقاء في حركة", body: "{{friend_count}} أصدقاء في الإيقاع. انضم!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} ذكرك", body: "إشارة جديدة في {{room_name}}." },
      { title: "@ تمت الإشارة إليك في {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
  "id-ID": {
    test: [{ title: "🔔 TimeZoni", body: "Notifikasi aktif! Saatnya fokus." }],
    room_goal_reminder: [
      { title: "📚 Masih ada waktu", body: "Target harianmu di {{room_name}} menunggu." },
      { title: "⏰ Sisa {{remaining_h}} jam", body: "Capai targetmu di {{room_name}} sebelum tengah malam." },
      { title: "🎯 Rekanmu sudah mencatat", body: "Jangan ketinggalan di {{room_name}}." },
    ],
    streak_risk: [
      { title: "🔥 Streak-mu terancam", body: "Jangan kehilangan {{streak_days}} hari! Cukup 10 menit." },
      { title: "❄️ Streak {{streak_days}} hari", body: "Catat sesi hari ini untuk menjaganya." },
      { title: "🏆 {{streak_days}} hari berturut", body: "Sudah jauh. Jangan berhenti sekarang!" },
    ],
    room_challenge_deadline: [
      { title: "🚨 Sprint akhir!", body: "Tantangan {{challenge_name}} berakhir dalam {{hours_left}} jam." },
      { title: "⏳ Panggilan terakhir", body: "Sisa {{hours_left}} jam untuk {{challenge_name}}." },
      { title: "💪 Garis akhir", body: "Ayo selesaikan {{challenge_name}} tepat waktu!" },
    ],
    re_engagement: [
      { title: "👀 Kami merindukanmu", body: "Sudah {{days}} hari… sesi singkat?" },
      { title: "🌱 Tanamanmu haus", body: "Kembali hari ini dan jaga ritme." },
      { title: "✨ Senang bertemu lagi", body: "Mulai dengan 15 menit. Sisanya menyusul." },
    ],
    weekly_recap: [
      { title: "📊 Ringkasan mingguan", body: "Kamu fokus {{hours}} jam dalam {{sessions}} sesi." },
      { title: "🗓️ Bagaimana mingguanmu?", body: "{{hours}} jam tercatat. Lihat detailnya." },
      { title: "🚀 Minggu selesai!", body: "{{sessions}} sesi, total {{hours}} jam." },
    ],
    friend_activity: [
      { title: "👥 Temanmu fokus hari ini", body: "{{friend_count}} teman belajar. Giliranmu!" },
      { title: "🎉 {{friend_name}} mencatat {{hours}} jam hari ini", body: "Jangan tertinggal!" },
      { title: "🔥 Teman-teman bergerak", body: "{{friend_count}} teman dalam ritme. Ayo gabung!" },
    ],
    chat_mentions: [
      { title: "💬 {{sender_name}} menyebutmu", body: "Sebutan baru di {{room_name}}." },
      { title: "@ Disebut di {{room_name}}", body: "{{sender_name}}: {{content}}" },
    ],
  },
};

// ---- Social / task notifications (instant + morning kickoff) ----
// Vars: {{friend_name}}, {{board_title}}, {{task_title}}, {{task_count}}, {{content}}
const S: Record<string, LangPack> = {
  "pt-BR": {
    friend_request: [
      { title: "🤝 {{friend_name}} quer ser seu amigo", body: "Aceite e acompanhem o foco um do outro." },
      { title: "👋 Novo pedido de amizade", body: "{{friend_name}} quer focar junto com você." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} aceitou seu convite", body: "Agora vocês estão conectados. Bora focar!" },
      { title: "✅ Nova amizade", body: "{{friend_name}} entrou na sua lista de amigos." },
    ],
    board_invite: [
      { title: "📋 Convite para {{board_title}}", body: "{{friend_name}} quer você nesse quadro." },
      { title: "🚀 {{friend_name}} te convidou", body: "Entre no quadro {{board_title}} e organize com o time." },
    ],
    task_assigned: [
      { title: "🎯 Nova tarefa para você", body: "{{friend_name}} te colocou em “{{task_title}}”." },
      { title: "📌 Você foi atribuído", body: "“{{task_title}}” está esperando por você." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} comentou", body: "Em “{{task_title}}”: {{content}}" },
      { title: "🗨️ Novo comentário", body: "{{friend_name}} respondeu em “{{task_title}}”." },
    ],
    morning_kickoff: [
      { title: "☀️ Bom dia! {{task_count}} tarefas te esperam", body: "Comece por “{{task_title}}” e ganhe o dia." },
      { title: "🌅 Que tal começar agora?", body: "{{task_count}} tarefas em aberto. 25 minutos já mudam tudo." },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}” vence hoje", body: "Ainda dá tempo de finalizar." },
      { title: "🔔 Prazo hoje", body: "{{task_count}} tarefas vencem hoje. Bora fechar?" },
    ],
  },
  "en-US": {
    friend_request: [
      { title: "🤝 {{friend_name}} wants to connect", body: "Accept and follow each other's focus." },
      { title: "👋 New friend request", body: "{{friend_name}} wants to focus with you." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} accepted your request", body: "You're connected now. Let's focus!" },
      { title: "✅ New friendship", body: "{{friend_name}} joined your friends list." },
    ],
    board_invite: [
      { title: "📋 Invite to {{board_title}}", body: "{{friend_name}} wants you on this board." },
      { title: "🚀 {{friend_name}} invited you", body: "Join {{board_title}} and organize with the team." },
    ],
    task_assigned: [
      { title: "🎯 New task for you", body: "{{friend_name}} added you to “{{task_title}}”." },
      { title: "📌 You've been assigned", body: "“{{task_title}}” is waiting for you." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} commented", body: "On “{{task_title}}”: {{content}}" },
      { title: "🗨️ New comment", body: "{{friend_name}} replied on “{{task_title}}”." },
    ],
    morning_kickoff: [
      { title: "☀️ Good morning! {{task_count}} tasks await", body: "Start with “{{task_title}}” and own the day." },
      { title: "🌅 Ready to start?", body: "{{task_count}} open tasks. 25 focused minutes change everything." },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}” is due today", body: "There's still time to finish it." },
      { title: "🔔 Due today", body: "{{task_count}} tasks are due today. Let's close them." },
    ],
  },
  "es-ES": {
    friend_request: [
      { title: "🤝 {{friend_name}} quiere conectar", body: "Acepta y sigan el enfoque del otro." },
      { title: "👋 Nueva solicitud de amistad", body: "{{friend_name}} quiere enfocarse contigo." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} aceptó tu solicitud", body: "Ya están conectados. ¡A enfocarse!" },
      { title: "✅ Nueva amistad", body: "{{friend_name}} está en tu lista de amigos." },
    ],
    board_invite: [
      { title: "📋 Invitación a {{board_title}}", body: "{{friend_name}} te quiere en este tablero." },
      { title: "🚀 {{friend_name}} te invitó", body: "Únete a {{board_title}} y organiza con el equipo." },
    ],
    task_assigned: [
      { title: "🎯 Nueva tarea para ti", body: "{{friend_name}} te asignó “{{task_title}}”." },
      { title: "📌 Te asignaron", body: "“{{task_title}}” te está esperando." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} comentó", body: "En “{{task_title}}”: {{content}}" },
      { title: "🗨️ Nuevo comentario", body: "{{friend_name}} respondió en “{{task_title}}”." },
    ],
    morning_kickoff: [
      { title: "☀️ ¡Buenos días! {{task_count}} tareas te esperan", body: "Empieza por “{{task_title}}”." },
      { title: "🌅 ¿Empezamos?", body: "{{task_count}} tareas abiertas. 25 minutos bastan." },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}” vence hoy", body: "Aún hay tiempo de terminar." },
      { title: "🔔 Vence hoy", body: "{{task_count}} tareas vencen hoy. ¡A cerrarlas!" },
    ],
  },
  "fr-FR": {
    friend_request: [
      { title: "🤝 {{friend_name}} veut vous ajouter", body: "Acceptez et suivez vos progrès mutuels." },
      { title: "👋 Nouvelle demande d'ami", body: "{{friend_name}} veut se concentrer avec vous." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} a accepté", body: "Vous êtes connectés. On se concentre !" },
      { title: "✅ Nouvelle amitié", body: "{{friend_name}} rejoint vos amis." },
    ],
    board_invite: [
      { title: "📋 Invitation à {{board_title}}", body: "{{friend_name}} vous veut sur ce tableau." },
      { title: "🚀 {{friend_name}} vous a invité", body: "Rejoignez {{board_title}} et organisez avec l'équipe." },
    ],
    task_assigned: [
      { title: "🎯 Nouvelle tâche pour vous", body: "{{friend_name}} vous a ajouté à « {{task_title}} »." },
      { title: "📌 Tâche assignée", body: "« {{task_title}} » vous attend." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} a commenté", body: "Sur « {{task_title}} » : {{content}}" },
      { title: "🗨️ Nouveau commentaire", body: "{{friend_name}} a répondu sur « {{task_title}} »." },
    ],
    morning_kickoff: [
      { title: "☀️ Bonjour ! {{task_count}} tâches vous attendent", body: "Commencez par « {{task_title}} »." },
      { title: "🌅 On démarre ?", body: "{{task_count}} tâches ouvertes. 25 minutes suffisent." },
    ],
    task_due_today: [
      { title: "⏰ « {{task_title}} » est due aujourd'hui", body: "Il reste du temps pour la finir." },
      { title: "🔔 Échéance aujourd'hui", body: "{{task_count}} tâches à boucler aujourd'hui." },
    ],
  },
  "de-DE": {
    friend_request: [
      { title: "🤝 {{friend_name}} möchte dich hinzufügen", body: "Annehmen und gemeinsam fokussieren." },
      { title: "👋 Neue Freundschaftsanfrage", body: "{{friend_name}} will mit dir lernen." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} hat angenommen", body: "Ihr seid verbunden. Los geht's!" },
      { title: "✅ Neue Freundschaft", body: "{{friend_name}} ist jetzt in deiner Liste." },
    ],
    board_invite: [
      { title: "📋 Einladung zu {{board_title}}", body: "{{friend_name}} will dich in diesem Board." },
      { title: "🚀 {{friend_name}} hat dich eingeladen", body: "Tritt {{board_title}} bei und organisiere mit dem Team." },
    ],
    task_assigned: [
      { title: "🎯 Neue Aufgabe für dich", body: "{{friend_name}} hat dich zu „{{task_title}}“ hinzugefügt." },
      { title: "📌 Aufgabe zugewiesen", body: "„{{task_title}}“ wartet auf dich." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} hat kommentiert", body: "Zu „{{task_title}}“: {{content}}" },
      { title: "🗨️ Neuer Kommentar", body: "{{friend_name}} hat auf „{{task_title}}“ geantwortet." },
    ],
    morning_kickoff: [
      { title: "☀️ Guten Morgen! {{task_count}} Aufgaben warten", body: "Starte mit „{{task_title}}“." },
      { title: "🌅 Bereit zu starten?", body: "{{task_count}} offene Aufgaben. 25 Minuten reichen." },
    ],
    task_due_today: [
      { title: "⏰ „{{task_title}}“ ist heute fällig", body: "Noch ist Zeit, sie abzuschließen." },
      { title: "🔔 Heute fällig", body: "{{task_count}} Aufgaben sind heute fällig." },
    ],
  },
  "it-IT": {
    friend_request: [
      { title: "🤝 {{friend_name}} vuole connettersi", body: "Accetta e seguitevi a vicenda." },
      { title: "👋 Nuova richiesta di amicizia", body: "{{friend_name}} vuole concentrarsi con te." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} ha accettato", body: "Ora siete connessi. Concentriamoci!" },
      { title: "✅ Nuova amicizia", body: "{{friend_name}} è nella tua lista amici." },
    ],
    board_invite: [
      { title: "📋 Invito a {{board_title}}", body: "{{friend_name}} ti vuole in questa bacheca." },
      { title: "🚀 {{friend_name}} ti ha invitato", body: "Entra in {{board_title}} e organizza col team." },
    ],
    task_assigned: [
      { title: "🎯 Nuova attività per te", body: "{{friend_name}} ti ha aggiunto a “{{task_title}}”." },
      { title: "📌 Attività assegnata", body: "“{{task_title}}” ti aspetta." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} ha commentato", body: "Su “{{task_title}}”: {{content}}" },
      { title: "🗨️ Nuovo commento", body: "{{friend_name}} ha risposto su “{{task_title}}”." },
    ],
    morning_kickoff: [
      { title: "☀️ Buongiorno! {{task_count}} attività ti aspettano", body: "Inizia da “{{task_title}}”." },
      { title: "🌅 Pronto a iniziare?", body: "{{task_count}} attività aperte. Bastano 25 minuti." },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}” scade oggi", body: "C'è ancora tempo per finirla." },
      { title: "🔔 Scadenza oggi", body: "{{task_count}} attività scadono oggi." },
    ],
  },
  "ja-JP": {
    friend_request: [
      { title: "🤝 {{friend_name}} から友達申請", body: "承認してお互いの集中を追いかけよう。" },
      { title: "👋 新しい友達申請", body: "{{friend_name}} が一緒に集中したいそうです。" },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} が承認しました", body: "つながりました。集中しよう！" },
      { title: "✅ 新しい友達", body: "{{friend_name}} が友達リストに加わりました。" },
    ],
    board_invite: [
      { title: "📋 {{board_title}} への招待", body: "{{friend_name}} があなたを誘っています。" },
      { title: "🚀 {{friend_name}} が招待しました", body: "{{board_title}} に参加してチームで整理しよう。" },
    ],
    task_assigned: [
      { title: "🎯 新しいタスク", body: "{{friend_name}} が「{{task_title}}」に追加しました。" },
      { title: "📌 担当になりました", body: "「{{task_title}}」が待っています。" },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} がコメント", body: "「{{task_title}}」: {{content}}" },
      { title: "🗨️ 新しいコメント", body: "{{friend_name}} が「{{task_title}}」に返信しました。" },
    ],
    morning_kickoff: [
      { title: "☀️ おはよう！タスクが{{task_count}}件", body: "「{{task_title}}」から始めよう。" },
      { title: "🌅 始めますか？", body: "未完了{{task_count}}件。25分で変わります。" },
    ],
    task_due_today: [
      { title: "⏰ 「{{task_title}}」は今日締切", body: "まだ間に合います。" },
      { title: "🔔 今日が期限", body: "{{task_count}}件が今日締切です。" },
    ],
  },
  "ko-KR": {
    friend_request: [
      { title: "🤝 {{friend_name}}님의 친구 요청", body: "수락하고 서로의 집중을 응원하세요." },
      { title: "👋 새 친구 요청", body: "{{friend_name}}님이 함께 집중하고 싶어 해요." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}}님이 수락했어요", body: "이제 연결되었습니다. 집중해요!" },
      { title: "✅ 새로운 친구", body: "{{friend_name}}님이 친구 목록에 추가됐어요." },
    ],
    board_invite: [
      { title: "📋 {{board_title}} 초대", body: "{{friend_name}}님이 이 보드에 초대했어요." },
      { title: "🚀 {{friend_name}}님의 초대", body: "{{board_title}}에 참여해 팀과 정리하세요." },
    ],
    task_assigned: [
      { title: "🎯 새 작업이 있어요", body: "{{friend_name}}님이 “{{task_title}}”에 추가했어요." },
      { title: "📌 담당자로 지정됨", body: "“{{task_title}}”이 기다리고 있어요." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}}님의 댓글", body: "“{{task_title}}”: {{content}}" },
      { title: "🗨️ 새 댓글", body: "{{friend_name}}님이 “{{task_title}}”에 답했어요." },
    ],
    morning_kickoff: [
      { title: "☀️ 좋은 아침! 작업 {{task_count}}개", body: "“{{task_title}}”부터 시작해요." },
      { title: "🌅 시작할까요?", body: "미완료 {{task_count}}개. 25분이면 충분해요." },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}” 오늘 마감", body: "아직 끝낼 시간이 있어요." },
      { title: "🔔 오늘 마감", body: "{{task_count}}개 작업이 오늘 마감입니다." },
    ],
  },
  "zh-CN": {
    friend_request: [
      { title: "🤝 {{friend_name}} 想加你为好友", body: "接受并互相关注专注进度。" },
      { title: "👋 新的好友请求", body: "{{friend_name}} 想和你一起专注。" },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} 接受了你的请求", body: "你们已连接，开始专注吧！" },
      { title: "✅ 新的好友", body: "{{friend_name}} 已加入你的好友列表。" },
    ],
    board_invite: [
      { title: "📋 邀请加入 {{board_title}}", body: "{{friend_name}} 想让你加入这个看板。" },
      { title: "🚀 {{friend_name}} 邀请了你", body: "加入 {{board_title}}，和团队一起整理。" },
    ],
    task_assigned: [
      { title: "🎯 有新任务", body: "{{friend_name}} 把你加入了“{{task_title}}”。" },
      { title: "📌 任务已分配", body: "“{{task_title}}”正在等你。" },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} 发表了评论", body: "在“{{task_title}}”：{{content}}" },
      { title: "🗨️ 新评论", body: "{{friend_name}} 回复了“{{task_title}}”。" },
    ],
    morning_kickoff: [
      { title: "☀️ 早安！还有 {{task_count}} 个任务", body: "从“{{task_title}}”开始吧。" },
      { title: "🌅 现在开始？", body: "{{task_count}} 个未完成任务，25 分钟就够。" },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}”今天到期", body: "还来得及完成。" },
      { title: "🔔 今天到期", body: "{{task_count}} 个任务今天到期。" },
    ],
  },
  "ru-RU": {
    friend_request: [
      { title: "🤝 {{friend_name}} хочет добавить вас", body: "Примите и следите за прогрессом друг друга." },
      { title: "👋 Новая заявка в друзья", body: "{{friend_name}} хочет заниматься вместе." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} принял(а) заявку", body: "Вы теперь друзья. За работу!" },
      { title: "✅ Новая дружба", body: "{{friend_name}} в вашем списке друзей." },
    ],
    board_invite: [
      { title: "📋 Приглашение в {{board_title}}", body: "{{friend_name}} зовёт вас на эту доску." },
      { title: "🚀 {{friend_name}} пригласил(а) вас", body: "Присоединяйтесь к {{board_title}}." },
    ],
    task_assigned: [
      { title: "🎯 Новая задача для вас", body: "{{friend_name}} добавил(а) вас в «{{task_title}}»." },
      { title: "📌 Задача назначена", body: "«{{task_title}}» ждёт вас." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} оставил(а) комментарий", body: "В «{{task_title}}»: {{content}}" },
      { title: "🗨️ Новый комментарий", body: "{{friend_name}} ответил(а) в «{{task_title}}»." },
    ],
    morning_kickoff: [
      { title: "☀️ Доброе утро! Задач: {{task_count}}", body: "Начните с «{{task_title}}»." },
      { title: "🌅 Начнём?", body: "{{task_count}} открытых задач. Хватит 25 минут." },
    ],
    task_due_today: [
      { title: "⏰ «{{task_title}}» — срок сегодня", body: "Ещё есть время закончить." },
      { title: "🔔 Срок сегодня", body: "Сегодня истекает срок у {{task_count}} задач." },
    ],
  },
  "ar-SA": {
    friend_request: [
      { title: "🤝 {{friend_name}} يريد إضافتك", body: "اقبل وتابعا تركيز بعضكما." },
      { title: "👋 طلب صداقة جديد", body: "{{friend_name}} يريد التركيز معك." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} قبل طلبك", body: "أصبحتما متصلين. هيا للتركيز!" },
      { title: "✅ صداقة جديدة", body: "{{friend_name}} أصبح في قائمة أصدقائك." },
    ],
    board_invite: [
      { title: "📋 دعوة إلى {{board_title}}", body: "{{friend_name}} يريدك في هذه اللوحة." },
      { title: "🚀 {{friend_name}} دعاك", body: "انضم إلى {{board_title}} ونظّم مع الفريق." },
    ],
    task_assigned: [
      { title: "🎯 مهمة جديدة لك", body: "{{friend_name}} أضافك إلى «{{task_title}}»." },
      { title: "📌 تم إسناد مهمة", body: "«{{task_title}}» في انتظارك." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} علّق", body: "على «{{task_title}}»: {{content}}" },
      { title: "🗨️ تعليق جديد", body: "{{friend_name}} رد على «{{task_title}}»." },
    ],
    morning_kickoff: [
      { title: "☀️ صباح الخير! لديك {{task_count}} مهام", body: "ابدأ بـ «{{task_title}}»." },
      { title: "🌅 هل نبدأ؟", body: "{{task_count}} مهام مفتوحة. 25 دقيقة تكفي." },
    ],
    task_due_today: [
      { title: "⏰ «{{task_title}}» تنتهي اليوم", body: "ما زال هناك وقت لإنهائها." },
      { title: "🔔 الموعد اليوم", body: "{{task_count}} مهام تنتهي اليوم." },
    ],
  },
  "id-ID": {
    friend_request: [
      { title: "🤝 {{friend_name}} ingin berteman", body: "Terima dan saling pantau fokus kalian." },
      { title: "👋 Permintaan pertemanan baru", body: "{{friend_name}} ingin fokus bersamamu." },
    ],
    friend_accepted: [
      { title: "🎉 {{friend_name}} menerima permintaanmu", body: "Kalian terhubung. Ayo fokus!" },
      { title: "✅ Teman baru", body: "{{friend_name}} masuk daftar temanmu." },
    ],
    board_invite: [
      { title: "📋 Undangan ke {{board_title}}", body: "{{friend_name}} mengajakmu ke papan ini." },
      { title: "🚀 {{friend_name}} mengundangmu", body: "Gabung ke {{board_title}} dan atur bersama tim." },
    ],
    task_assigned: [
      { title: "🎯 Tugas baru untukmu", body: "{{friend_name}} menambahkanmu ke “{{task_title}}”." },
      { title: "📌 Kamu ditugaskan", body: "“{{task_title}}” menunggumu." },
    ],
    task_comment: [
      { title: "💬 {{friend_name}} berkomentar", body: "Di “{{task_title}}”: {{content}}" },
      { title: "🗨️ Komentar baru", body: "{{friend_name}} membalas di “{{task_title}}”." },
    ],
    morning_kickoff: [
      { title: "☀️ Selamat pagi! {{task_count}} tugas menunggu", body: "Mulai dari “{{task_title}}”." },
      { title: "🌅 Siap mulai?", body: "{{task_count}} tugas terbuka. 25 menit sudah cukup." },
    ],
    task_due_today: [
      { title: "⏰ “{{task_title}}” jatuh tempo hari ini", body: "Masih sempat menyelesaikannya." },
      { title: "🔔 Tenggat hari ini", body: "{{task_count}} tugas jatuh tempo hari ini." },
    ],
  },
};

function render(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

export function pickTemplate(
  kind: NotifKind,
  lang: string | null | undefined,
  vars: Record<string, string | number>,
): { title: string; body: string } {
  const normalized = (lang || "en-US").replace("_", "-");
  const short = normalized.slice(0, 2);
  const list =
    T[normalized]?.[kind] ||
    S[normalized]?.[kind] ||
    T[short]?.[kind] ||
    S[short]?.[kind] ||
    T["en-US"][kind] ||
    S["en-US"][kind] ||
    T["en-US"]["test"]!;
  const choice = list[Math.floor(Math.random() * list.length)];
  return { title: render(choice.title, vars), body: render(choice.body, vars) };
}
