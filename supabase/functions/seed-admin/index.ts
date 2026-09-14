import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.25.76";
import bcrypt from "npm:bcryptjs@3.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const BodySchema = z.object({
  action: z.enum(["stats", "set_presence", "seed_users", "seed_rooms", "seed_history", "purge"]),
  payload: z.object({ offset: z.number().int().min(0).max(1000).optional(), enabled: z.boolean().optional() }).optional(),
});

const locales = [
  ["pt-BR", "America/Sao_Paulo", "BR"], ["en-US", "America/New_York", "US"],
  ["es-ES", "Europe/Madrid", "ES"], ["fr-FR", "Europe/Paris", "FR"],
  ["de-DE", "Europe/Berlin", "DE"], ["it-IT", "Europe/Rome", "IT"],
  ["ja-JP", "Asia/Tokyo", "JP"], ["ko-KR", "Asia/Seoul", "KR"],
  ["zh-CN", "Asia/Shanghai", "CN"], ["ru-RU", "Europe/Moscow", "RU"],
  ["ar-SA", "Asia/Riyadh", "SA"], ["id-ID", "Asia/Jakarta", "ID"],
] as const;

const names: Record<string, string[]> = {
  "pt-BR": ["Ana Clara", "Lucas Mendes", "Mariana R.", "João Pedro", "Bia Costa", "Rafael Lima", "Camila Nunes", "Gustavo A.", "Lívia Rocha", "Matheus Reis", "Nicky M.", "Davi Santos", "Isabela F.", "Pedro Henrique", "Júlia Alves", "Bruno Tavares", "Larissa Melo", "Caio Viana", "Amanda Freitas", "Vitor Hugo", "Carol Dias", "Felipe Martins", "Renata Souza", "Diego Oliveira", "Letícia Ramos", "Thiago Moreira", "Sofia Barros", "Eduardo Pires", "Luana Castro", "Gabriel Lopes", "Nath Santos", "André Luiz", "Milena Prado", "Henrique M.", "Yasmin Duarte", "Rodrigo Vieira"],
  "en-US": ["Emma Wilson", "Noah Carter", "Maya Chen", "Liam Brooks", "Ava Thompson", "Ethan Cole", "Sophie Reed", "Jack Miller", "Olivia Park", "Ben Walker", "Chloe Adams", "Leo Martin", "Grace Hall", "Ryan Scott", "Zoe Turner", "Sam Taylor", "Ella Moore", "Daniel Kim", "Nora Davis", "Alex Morgan"],
  "es-ES": ["Lucía García", "Hugo Martín", "Sofía López", "Mateo Ruiz", "Paula Sánchez", "Álvaro Díaz", "Carmen Romero", "Diego Navarro", "Elena Torres", "Javier Moreno", "Irene Vega", "Pablo Gil", "Marta León", "Raúl Castro", "Nerea Ortiz"],
  "fr-FR": ["Camille Martin", "Louis Bernard", "Léa Dubois", "Hugo Robert", "Chloé Laurent", "Jules Moreau", "Manon Simon", "Nathan Michel", "Inès Leroy", "Arthur Roux", "Zoé Fournier", "Lucas Girard", "Emma André", "Tom Mercier"],
  "de-DE": ["Mia Müller", "Leon Schmidt", "Emilia Weber", "Finn Wagner", "Hannah Becker", "Paul Hoffmann", "Lina Schäfer", "Jonas Koch", "Lea Bauer", "Noah Klein", "Clara Wolf", "Felix Braun", "Marie Vogel", "Luca Krüger"],
  "it-IT": ["Giulia Rossi", "Marco Romano", "Sofia Ferrari", "Luca Esposito", "Aurora Bianchi", "Matteo Ricci", "Alice Marino", "Davide Greco", "Emma Bruno", "Andrea Gallo", "Beatrice Costa", "Simone Conti"],
  "ja-JP": ["佐藤 葵", "鈴木 陽太", "高橋 美咲", "田中 蓮", "伊藤 結衣", "渡辺 翔", "山本 凛", "中村 悠真", "小林 さくら", "加藤 大輝", "吉田 七海", "山田 湊"],
  "ko-KR": ["김서연", "이민준", "박지우", "최현우", "정하윤", "강도윤", "조수빈", "윤시우", "장예은", "임준서", "한유진", "오태민"],
  "zh-CN": ["王欣怡", "李浩然", "张雨桐", "刘子轩", "陈思涵", "杨宇航", "赵佳琪", "黄俊杰", "周诗雨", "吴天佑", "徐梦瑶", "孙博文"],
  "ru-RU": ["Анна Иванова", "Михаил Смирнов", "София Кузнецова", "Артём Попов", "Мария Соколова", "Даниил Волков", "Полина Лебедева", "Иван Козлов", "Алиса Новикова", "Егор Морозов"],
  "ar-SA": ["سارة أحمد", "محمد العتيبي", "نورة القحطاني", "عبدالله الدوسري", "ريم الشهري", "خالد الغامدي", "لين الزهراني", "يوسف الحربي", "جود المطيري", "عمر السبيعي"],
  "id-ID": ["Ayu Lestari", "Rizky Pratama", "Siti Rahma", "Dimas Saputra", "Putri Ananda", "Fajar Hidayat", "Nadia Safitri", "Arif Nugroho", "Intan Permata", "Bagas Wijaya"],
};

const rooms = [
  ["pt-BR","BR","Reta Final ENEM 2027","Revisão diária, simulados e constância até a aprovação.","study"],["pt-BR","BR","OAB 1ª Fase — Foco Total","Questões, lei seca e revisão sem distrações.","study"],["pt-BR","BR","Concurso INSS 2027","Grupo focado em previdenciário, português e RLM.","study"],["pt-BR","BR","PF e PRF — Missão Aprovação","Ciclo de estudos para carreiras policiais.","study"],["pt-BR","BR","Banco do Brasil & Caixa","Conhecimentos bancários, vendas e tecnologia.","study"],["pt-BR","BR","Residência Médica — R1","Rotina de questões e revisão para residência.","study"],["pt-BR","BR","FUVEST • USP 2027","Leituras obrigatórias e preparação para a Fuvest.","reading"],["pt-BR","BR","TRT e Tribunais","Foco conjunto para concursos de tribunais.","study"],["pt-BR","BR","EsPCEx • AFA • ESA","Preparação militar com disciplina diária.","study"],["pt-BR","BR","Dev em Evolução","Algoritmos, projetos e entrevistas técnicas.","work"],["pt-BR","BR","Medicina — Ciclo Básico","Anatomia, fisiologia e constância no primeiro ano.","study"],["pt-BR","BR","Inglês Todos os Dias","Leitura e conversação com uma hora diária.","custom"],
  ["en-US","US","SAT 2027 Study Crew","Daily practice for Math, Reading and Writing.","study"],["en-US","US","MCAT Deep Focus","Focused blocks for Bio, Chem, CARS and review.","study"],["en-US","US","LSAT Logic Lab","Timed sections, review and consistent practice.","study"],["en-US","US","CPA Exam Candidates","Study sessions for all four CPA sections.","study"],["en-US","US","NCLEX Study Circle","Questions, rationales and calm daily progress.","study"],["en-US","US","Software Interview Prep","DSA practice, system design and mock interviews.","work"],["en-US","US","PhD Writing Room","Quiet accountability for papers and dissertations.","work"],
  ["es-ES","ES","EBAU 2027 — Meta Universidad","Preparación constante para la selectividad.","study"],["es-ES","ES","Oposiciones Administración","Temario, test y repasos para conseguir la plaza.","study"],["es-ES","MX","UNAM • IPN Aspirantes","Estudio diario para el examen de admisión.","study"],["es-ES","AR","UBA — Finales sin Pausa","Comunidad para preparar finales y parciales.","study"],["es-ES","ES","MIR España","Preguntas, simulacros y repaso para el MIR.","study"],["es-ES","MX","Certificaciones Tech en Español","Cloud, datos y desarrollo con práctica constante.","work"],["es-ES","AR","Lectura y Escritura Académica","Un espacio tranquilo para leer y avanzar la tesis.","reading"],
  ["fr-FR","FR","PASS/LAS Médecine","Travail régulier pour réussir la première année.","study"],["fr-FR","FR","Concours Fonction Publique","Préparation structurée aux concours administratifs.","study"],["fr-FR","FR","Bac 2027 — Objectif Mention","Révisions quotidiennes et entraide jusqu'au bac.","study"],["fr-FR","FR","Prépa Grandes Écoles","Blocs de travail intensif pour CPGE.","study"],["fr-FR","FR","CRPE • CAPES — Entraide","Révisions, annales et préparation des oraux.","study"],["fr-FR","FR","Lecture & Mémoire","Lire, rédiger et avancer chaque jour en silence.","reading"],
  ["de-DE","DE","Abitur 2027 Lerngruppe","Gemeinsam strukturiert für das Abitur lernen.","study"],["de-DE","DE","Medizin Staatsexamen","Konzentrierte Lernblöcke für M1 und M2.","study"],["de-DE","DE","Jura Staatsexamen","Fälle, Karteikarten und konsequente Wiederholung.","study"],["de-DE","DE","Ausbildung & IHK Prüfung","Gemeinsam auf die Abschlussprüfung vorbereiten.","study"],["de-DE","DE","Meisterprüfung Fokusraum","Lernpläne und tägliche konzentrierte Einheiten.","work"],["de-DE","DE","Deutschprüfung C1/C2","Lesen, Schreiben und Prüfungstraining.","reading"],
  ["it-IT","IT","Maturità 2027","Studio quotidiano verso l'esame di maturità.","study"],["it-IT","IT","Test Medicina","Quiz, teoria e simulazioni per l'ammissione.","study"],["it-IT","IT","Concorsi Pubblici Italia","Preparazione costante per i concorsi pubblici.","study"],["it-IT","IT","Esami Universitari","Sessioni concentrate per esami e appelli.","study"],["it-IT","IT","Abilitazione Professionale","Studio organizzato per l'esame di Stato.","work"],["it-IT","IT","Lettura Quotidiana","Un capitolo al giorno, senza distrazioni.","reading"],
  ["ja-JP","JP","共通テスト2027 集中部屋","毎日の積み重ねで志望校合格を目指す。","study"],["ja-JP","JP","公務員試験 勉強会","過去問と復習を中心に集中する部屋。","study"],["ja-JP","JP","資格勉強・社会人集中室","仕事の後に静かに資格勉強を続ける。","work"],["ja-JP","JP","ITパスポート・基本情報","午前と午後の対策を毎日少しずつ進める。","work"],["ja-JP","JP","大学院入試・研究室","院試対策と研究計画を着実に進める。","study"],["ja-JP","JP","読書クラブ・静かな時間","毎日一章、落ち着いて読書を続ける。","reading"],
  ["ko-KR","KR","2027 수능 집중반","매일 꾸준히 공부하며 목표 대학에 도전해요.","study"],["ko-KR","KR","공무원 시험 스터디","기출 문제와 회독을 함께 관리하는 방.","study"],["ko-KR","KR","취업 코딩테스트 준비","알고리즘과 면접 준비에 집중합니다.","work"],["ko-KR","KR","NCS 취업 준비방","직업기초능력과 전공 시험을 함께 준비해요.","work"],["ko-KR","KR","TOEIC 목표 달성","매일 듣기와 독해를 꾸준히 연습합니다.","study"],["ko-KR","KR","국가고시 집중 스터디","기출과 복습으로 합격까지 함께합니다.","study"],
  ["zh-CN","CN","2027高考自习室","每天专注学习，一起向理想大学前进。","study"],["zh-CN","CN","考研上岸计划","专业课、英语和政治的长期自习室。","study"],["zh-CN","CN","公务员考试备考","行测申论每日打卡与专注学习。","study"],["zh-CN","CN","法考冲刺学习组","系统复习、真题训练和每日打卡。","study"],["zh-CN","CN","教师资格证备考","综合素质和教育知识一起稳步复习。","study"],["zh-CN","CN","编程学习与面试","算法、项目和技术面试专注空间。","work"],
  ["ru-RU","RU","ЕГЭ 2027 — Подготовка","Ежедневная подготовка и практика к ЕГЭ.","study"],["ru-RU","RU","Экзамены в университете","Тихая комната для сессии и зачётов.","study"],["ru-RU","RU","ОГЭ — Уверенный результат","Практика заданий и спокойная подготовка каждый день.","study"],["ru-RU","RU","Программирование и алгоритмы","Задачи, проекты и подготовка к собеседованиям.","work"],["ru-RU","RU","Диплом и научная работа","Пишем понемногу каждый день без отвлечений.","work"],["ru-RU","RU","Читаем каждый день","Одна глава в день в тихой компании.","reading"],
  ["ar-SA","SA","القدرات والتحصيلي 2027","مذاكرة يومية منظمة لاختبارات القبول.","study"],["ar-SA","SA","طلاب الطب — تركيز","جلسات هادئة لمراجعة مواد الطب.","study"],["ar-SA","SA","اختبارات الجامعة","مراجعة يومية واستعداد منظم للاختبارات.","study"],["ar-SA","SA","IELTS هدفنا","تدريب مستمر على القراءة والكتابة والاستماع.","study"],["ar-SA","SA","البرمجة والمقابلات التقنية","خوارزميات ومشاريع واستعداد للمقابلات.","work"],["ar-SA","SA","نادي القراءة اليومي","نقرأ كل يوم بهدوء ونشارك التقدم.","reading"],
  ["id-ID","ID","UTBK SNBT 2027","Belajar konsisten dan latihan soal menuju kampus impian.","study"],["id-ID","ID","CPNS Pejuang NIP","Fokus belajar TIU, TWK, dan TKP bersama.","study"],["id-ID","ID","Ujian Kedokteran","Belajar terarah dan latihan soal kedokteran.","study"],["id-ID","ID","Skripsi Fokus Harian","Menulis sedikit demi sedikit sampai selesai.","work"],["id-ID","ID","TOEFL & IELTS Bersama","Latihan bahasa Inggris konsisten setiap hari.","study"],["id-ID","ID","Coding dan Interview","Algoritma, proyek, dan persiapan wawancara.","work"],
] as const;

function tier(i: number) { return i % 29 === 0 ? "premium" : i % 11 === 0 ? "pro" : "free"; }

const roomCopy: Record<string, { goal: string; status: string; messages: string[] }> = {
  "pt-BR": { goal: "Meta semanal", status: "Focando", messages: ["Bom estudo, pessoal!", "Meta de hoje iniciada 💪", "Vamos manter a constância!"] },
  "en-US": { goal: "Weekly goal", status: "Focusing", messages: ["Good focus, everyone!", "Starting today's goal 💪", "Let's stay consistent!"] },
  "es-ES": { goal: "Meta semanal", status: "Enfocado", messages: ["¡Buen estudio a todos!", "Empiezo la meta de hoy 💪", "¡Mantengamos la constancia!"] },
  "fr-FR": { goal: "Objectif hebdomadaire", status: "Concentré", messages: ["Bonne session à tous !", "Je commence mon objectif du jour 💪", "Gardons le rythme !"] },
  "de-DE": { goal: "Wochenziel", status: "Im Fokus", messages: ["Gutes Lernen euch allen!", "Ich starte mein Tagesziel 💪", "Bleiben wir dran!"] },
  "it-IT": { goal: "Obiettivo settimanale", status: "Concentrato", messages: ["Buono studio a tutti!", "Inizio l'obiettivo di oggi 💪", "Continuiamo con costanza!"] },
  "ja-JP": { goal: "週間目標", status: "集中中", messages: ["今日も頑張りましょう！", "今日の目標を始めます 💪", "一緒に続けましょう！"] },
  "ko-KR": { goal: "주간 목표", status: "집중 중", messages: ["오늘도 힘내서 공부해요!", "오늘 목표 시작합니다 💪", "꾸준히 함께해요!"] },
  "zh-CN": { goal: "每周目标", status: "专注中", messages: ["大家一起加油！", "开始今天的目标 💪", "坚持就是进步！"] },
  "ru-RU": { goal: "Цель на неделю", status: "В фокусе", messages: ["Всем продуктивной учёбы!", "Начинаю цель на сегодня 💪", "Продолжаем в том же духе!"] },
  "ar-SA": { goal: "الهدف الأسبوعي", status: "في تركيز", messages: ["دراسة موفقة للجميع!", "بدأت هدف اليوم 💪", "لنستمر بثبات!"] },
  "id-ID": { goal: "Target mingguan", status: "Sedang fokus", messages: ["Selamat belajar semuanya!", "Mulai target hari ini 💪", "Tetap konsisten bersama!"] },
};

const roomTargets = Object.fromEntries(locales.map(([locale]) => [locale, rooms.filter((room) => room[0] === locale).length]));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: authData } = await admin.auth.getUser(token);
    const caller = authData.user?.id;
    if (!caller) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await admin.from("user_roles").select("id").eq("user_id", caller).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);
    const { action, payload } = parsed.data;

    if (action === "stats") {
      const { data: stats, error } = await admin.rpc("seed_admin_stats");
      if (error) throw error;
      const localeStats = Array.isArray(stats?.locales) ? stats.locales : [];
      return json({
        ...stats,
        target_rooms: rooms.length,
        locales: localeStats.map((item: Record<string, unknown>) => ({
          ...item,
          target_rooms: roomTargets[String(item.locale)] ?? 0,
        })),
      });
    }
    if (action === "set_presence") {
      await admin.from("seed_config").upsert({ key: "presence", value: { enabled: payload?.enabled ?? false }, updated_at: new Date().toISOString() });
      if (!payload?.enabled) await admin.from("room_members").update({ is_online: false, is_timer_active: false, status_text: null }).in("room_id", (await admin.from("study_rooms").select("id").eq("is_seed", true)).data?.map((x) => x.id) ?? []);
      return json({ ok: true });
    }
    if (action === "seed_users") {
      const offset = payload?.offset ?? 0;
      const total = 796;
      const created: string[] = [];
      for (let i = offset; i < Math.min(offset + 5, total); i++) {
        const loc = locales[i % locales.length];
        const pool = names[loc[0]];
        const displayName = pool[Math.floor(i / locales.length) % pool.length] + (Math.floor(i / (locales.length * pool.length)) ? ` ${Math.floor(i / (locales.length * pool.length)) + 1}` : "");
        const email = `demo-${String(i + 1).padStart(4, "0")}-${crypto.randomUUID().slice(0, 6)}@seed.timezoni.internal`;
        const { data, error } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: false, user_metadata: { display_name: displayName } });
        if (error || !data.user) throw error ?? new Error("Could not create demo user");
        await admin.from("profiles").update({ display_name: displayName, timezone: loc[1], plan_tier: tier(i), trial_ends_at: null, onboarding_completed: true, is_stats_public: true, last_known_streak: 2 + (i * 7) % 94 }).eq("user_id", data.user.id);
        await admin.from("projects").insert({ user_id: data.user.id, name: loc[0] === "pt-BR" ? "Estudos" : "Focus", description: "", color: ["#2563eb", "#16a34a", "#d97706", "#db2777"][i % 4] });
        await admin.from("seed_entities").insert({ kind: "user", entity_id: data.user.id, locale: loc[0] });
        created.push(data.user.id);
      }
      return json({ created: created.length, next_offset: offset + created.length, done: offset + created.length >= total });
    }
    if (action === "seed_rooms") {
      const offset = payload?.offset ?? 0;
      const batchEnd = Math.min(offset + 5, rooms.length);
      const { data: users } = await admin.from("seed_entities").select("entity_id,locale").eq("kind", "user").order("created_at");
      if (!users?.length) return json({ error: "Create demo users first" }, 400);
      const { data: existingRooms } = await admin.from("study_rooms").select("name").eq("is_seed", true);
      const existingNames = new Set((existingRooms ?? []).map((room) => room.name));
      let created = 0;
      for (let r = offset; r < batchEnd; r++) {
        const spec = rooms[r];
        if (existingNames.has(spec[2])) continue;
        const candidates = users.filter((u) => u.locale === spec[0]);
        if (!candidates.length) continue;
        const owner = candidates[r % candidates.length].entity_id;
        const memberCount = 7 + ((r * 11 + 3) % 28);
        const { data: room, error } = await admin.from("study_rooms").insert({ name: spec[2], description: spec[3], room_type: spec[4], owner_id: owner, max_members: 50, is_active: true, is_public: true, country: spec[1], rules: spec[3], goal_hours: 12 + (r * 7) % 37, goal_label: roomCopy[spec[0]].goal, chat_mode: "open", password_hash: await bcrypt.hash(crypto.randomUUID() + crypto.randomUUID(), 8), is_seed: true }).select("id").single();
        if (error || !room) throw error ?? new Error("Room creation failed");
        await admin.from("seed_entities").insert({ kind: "room", entity_id: room.id, locale: spec[0] });
        const members = [...new Set([owner, ...Array.from({ length: memberCount - 1 }, (_, j) => candidates[(r * 7 + j + 1) % candidates.length].entity_id)])];
        await admin.from("room_members").insert(members.map((userId, j) => ({ room_id: room.id, user_id: userId, role: userId === owner ? "owner" : "member", joined_at: new Date(Date.now() - (4 + ((r * 17 + j * 5) % 82)) * 86400000).toISOString() })));
        await admin.from("room_messages").insert(members.slice(0, 3).map((userId, j) => ({ room_id: room.id, user_id: userId, content: roomCopy[spec[0]].messages[j], created_at: new Date(Date.now() - (r + j + 1) * 3600000).toISOString() })));
        await admin.from("room_activity_log").insert(members.slice(0, 5).map((userId, j) => ({ room_id: room.id, user_id: userId, action_type: j ? "member_joined" : "room_created", created_at: new Date(Date.now() - (r + j + 1) * 7200000).toISOString() })));
        created++;
      }
      return json({ ok: true, created, next_offset: batchEnd, done: batchEnd >= rooms.length });
    }
    if (action === "seed_history") {
      const offset = payload?.offset ?? 0;
      const { data: users } = await admin.from("seed_entities").select("entity_id,locale").eq("kind", "user").order("created_at").range(offset, offset + 4);
      const userIds = users?.map((user) => user.entity_id) ?? [];
      const { data: existingHistory } = userIds.length ? await admin.from("time_entries").select("user_id").in("user_id", userIds) : { data: [] };
      const usersWithHistory = new Set((existingHistory ?? []).map((row) => row.user_id));
      const { data: memberships } = await admin.from("room_members").select("user_id,room_id").in("user_id", users?.map((u) => u.entity_id) ?? []);
      const { data: projects } = await admin.from("projects").select("id,user_id").in("user_id", users?.map((u) => u.entity_id) ?? []);
      const rows: Record<string, unknown>[] = [];
      for (const [ui, u] of (users ?? []).entries()) {
        if (usersWithHistory.has(u.entity_id)) continue;
        const project = projects?.find((p) => p.user_id === u.entity_id)?.id;
        const member = memberships?.find((m) => m.user_id === u.entity_id);
        if (!project || !member) continue;
        for (let d = 0; d < 72; d++) {
          if ((d + ui + offset) % 7 === 5 || (d * 13 + ui + offset) % 11 === 0) continue;
          const sessions = 1 + ((d + ui) % 3 === 0 ? 1 : 0);
          for (let s = 0; s < sessions; s++) {
            const mins = 18 + ((d * 17 + ui * 13 + s * 29 + offset) % 101);
            const hour = 6 + ((d * 5 + ui * 3 + s * 7) % 16);
            const start = new Date();
            start.setUTCDate(start.getUTCDate() - d);
            const timezone = locales.find(([locale]) => locale === u.locale)?.[1] ?? "UTC";
            const localHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }).format(start));
            start.setUTCHours((hour - localHour + start.getUTCHours() + 24) % 24, 3 + ((d * 19 + ui * 7) % 53), 0, 0);
            const end = new Date(start.getTime() + mins * 60000);
            rows.push({ user_id: u.entity_id, project_id: project, room_id: member.room_id, start_time: start.toISOString(), end_time: end.toISOString(), duration: mins * 60, notes: "Sessão de foco", paused_seconds: 0, confirmed_intervals: 0, last_heartbeat_at: end.toISOString() });
          }
        }
      }
      for (let i = 0; i < rows.length; i += 500) { const { error } = await admin.from("time_entries").insert(rows.slice(i, i + 500)); if (error) throw error; }
      return json({ created: rows.length, next_offset: offset + (users?.length ?? 0), done: (users?.length ?? 0) < 5 || offset + (users?.length ?? 0) >= 796 });
    }
    if (action === "purge") {
      const { data: demoUsers } = await admin.from("seed_entities").select("entity_id").eq("kind", "user");
      const { data: demoRooms } = await admin.from("study_rooms").select("id").eq("is_seed", true);
      const roomIds = demoRooms?.map((x) => x.id) ?? [];
      if (roomIds.length) await admin.from("study_rooms").delete().in("id", roomIds);
      for (const u of demoUsers ?? []) await admin.auth.admin.deleteUser(u.entity_id);
      await admin.from("seed_entities").delete().in("kind", ["room", "user"]);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("[seed-admin]", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});