import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { ptBR, enUS, es, fr, de, it, ja, ko, zhCN, ar, ru, id as idLocale } from "date-fns/locale";

const LOCALES: Record<string, any> = {
  "pt-BR": ptBR, "en-US": enUS, "es-ES": es, "fr-FR": fr, "de-DE": de, "it-IT": it,
  "ja-JP": ja, "ko-KR": ko, "zh-CN": zhCN, "ar-SA": ar, "ru-RU": ru, "id-ID": idLocale,
};

export function DueDateBadge({ dueDate, completed }: { dueDate: string; completed?: boolean }) {
  const { i18n, t } = useTranslation();
  const locale = LOCALES[i18n.language] || enUS;
  const d = new Date(dueDate);

  let label = format(d, "d MMM", { locale });
  let className = "text-muted-foreground bg-muted border-border";

  if (!completed) {
    if (isPast(d) && !isToday(d)) {
      className = "text-red-500 bg-red-500/10 border-red-500/30";
      label = t("kanban.overdue", "Atrasada");
    } else if (isToday(d)) {
      className = "text-orange-500 bg-orange-500/10 border-orange-500/30";
      label = t("kanban.today", "Hoje");
    } else if (isTomorrow(d)) {
      className = "text-blue-500 bg-blue-500/10 border-blue-500/30";
      label = t("kanban.tomorrow", "Amanhã");
    } else {
      const days = differenceInDays(d, new Date());
      if (days <= 7) {
        className = "text-yellow-600 bg-yellow-500/10 border-yellow-500/30";
      }
    }
  } else {
    className = "text-green-500 bg-green-500/10 border-green-500/30";
  }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-medium text-[10px] px-1.5 py-0.5", className)}>
      <Calendar className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
