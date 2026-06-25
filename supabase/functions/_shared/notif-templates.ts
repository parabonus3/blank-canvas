// Notification templates: 12 languages, 3 variations per kind.
// Variables: {{room_name}}, {{streak_days}}, {{remaining_h}}, {{challenge_name}}, {{hours_left}}, {{days}}.

export type NotifKind =
  | "test"
  | "room_goal_reminder"
  | "streak_risk"
  | "room_challenge_deadline"
  | "re_engagement"
  | "weekly_recap";

type LangPack = Record<NotifKind, { title: string; body: string }[]>;

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
      { title: "📊 Resumo da semana", body: "Veja seu progresso na sala {{room_name}}." },
      { title: "🗓️ Como foi sua semana?", body: "Confira seus números e planeje a próxima." },
      { title: "🚀 Semana fechada!", body: "Dá uma olhada no que você conquistou." },
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
      { title: "📊 Weekly recap", body: "Check your progress in {{room_name}}." },
      { title: "🗓️ How was your week?", body: "See your numbers and plan the next." },
      { title: "🚀 Week wrapped!", body: "Take a look at what you accomplished." },
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
      { title: "📊 Resumen semanal", body: "Mira tu progreso en {{room_name}}." },
      { title: "🗓️ ¿Cómo fue tu semana?", body: "Revisa tus números y planea la próxima." },
      { title: "🚀 ¡Semana cerrada!", body: "Echa un vistazo a lo que lograste." },
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
      { title: "📊 Récap de la semaine", body: "Voyez vos progrès dans {{room_name}}." },
      { title: "🗓️ Quelle semaine ?", body: "Consultez vos chiffres et préparez la suite." },
      { title: "🚀 Semaine bouclée !", body: "Regardez ce que vous avez accompli." },
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
      { title: "📊 Wochenrückblick", body: "Sieh deinen Fortschritt in {{room_name}}." },
      { title: "🗓️ Wie war deine Woche?", body: "Schau dir die Zahlen an und plane weiter." },
      { title: "🚀 Woche abgeschlossen!", body: "Wirf einen Blick auf deine Erfolge." },
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
      { title: "📊 Riepilogo settimanale", body: "Vedi i tuoi progressi in {{room_name}}." },
      { title: "🗓️ Com'è andata la settimana?", body: "Controlla i numeri e pianifica." },
      { title: "🚀 Settimana chiusa!", body: "Guarda cosa hai ottenuto." },
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
      { title: "📊 週間まとめ", body: "{{room_name}} の進捗を確認しよう。" },
      { title: "🗓️ 今週はどうでしたか？", body: "数字を見て来週を計画しよう。" },
      { title: "🚀 一週間完了！", body: "達成したものを見てみよう。" },
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
      { title: "📊 주간 요약", body: "{{room_name}}의 진행 상황을 확인하세요." },
      { title: "🗓️ 이번 주 어땠나요?", body: "수치를 보고 다음 주를 계획하세요." },
      { title: "🚀 한 주 마감!", body: "성취를 살펴보세요." },
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
      { title: "📊 周回顾", body: "查看你在 {{room_name}} 的进展。" },
      { title: "🗓️ 这周怎么样？", body: "看看数据，规划下一周。" },
      { title: "🚀 一周结束！", body: "看看你完成了什么。" },
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
      { title: "📊 Итоги недели", body: "Посмотрите прогресс в {{room_name}}." },
      { title: "🗓️ Как прошла неделя?", body: "Проверьте цифры и спланируйте следующую." },
      { title: "🚀 Неделя закрыта!", body: "Взгляните на достижения." },
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
      { title: "📊 ملخص الأسبوع", body: "اطلع على تقدمك في {{room_name}}." },
      { title: "🗓️ كيف كان أسبوعك؟", body: "راجع الأرقام وخطط للأسبوع القادم." },
      { title: "🚀 انتهى الأسبوع!", body: "ألقِ نظرة على إنجازاتك." },
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
      { title: "📊 Ringkasan mingguan", body: "Lihat progresmu di {{room_name}}." },
      { title: "🗓️ Bagaimana mingguanmu?", body: "Cek angka dan rencanakan minggu depan." },
      { title: "🚀 Minggu selesai!", body: "Lihat apa yang sudah kamu capai." },
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
  const pack = T[normalized] || T[normalized.slice(0, 2)] || T["en-US"];
  const list = pack[kind] || T["en-US"][kind];
  const choice = list[Math.floor(Math.random() * list.length)];
  return { title: render(choice.title, vars), body: render(choice.body, vars) };
}
