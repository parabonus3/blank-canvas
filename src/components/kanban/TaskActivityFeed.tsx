import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTaskActivity, activityLabel } from "@/hooks/useTaskActivity";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";

interface Props {
  taskId: string;
  dateLocale: any;
  /** map userId -> nome, para ações que citam outra pessoa */
  nameFor?: (userId: string) => string;
}

export function TaskActivityFeed({ taskId, dateLocale, nameFor }: Props) {
  const { t } = useTranslation();
  const { data: rows = [], isLoading } = useTaskActivity(taskId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-6">{t("common.loading", "Carregando...")}</p>;
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <History className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("activity.empty", "Nenhuma atividade registrada ainda")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const initials = (row.display_name || "?").trim().slice(0, 2).toUpperCase();
        return (
          <div key={row.id} className="flex gap-2.5">
            <Avatar className="h-7 w-7 shrink-0">
              {row.avatar_url && <AvatarImage src={row.avatar_url} />}
              <AvatarFallback className="bg-primary/15 text-primary text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug break-words">
                <span className="font-semibold">{row.display_name || "—"}</span>{" "}
                <span className="text-muted-foreground">{activityLabel(row, t as any, nameFor)}</span>
              </p>
              <span className="text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: dateLocale })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
