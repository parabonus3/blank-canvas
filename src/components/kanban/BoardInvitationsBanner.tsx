import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Mail, KanbanSquare, Loader2 } from "lucide-react";
import {
  useMyBoardInvitations,
  useAcceptBoardInvitation,
  useRejectBoardInvitation,
} from "@/hooks/useBoardCollab";

function initials(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "?";
  return n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function useRelativeTime() {
  const { i18n, t } = useTranslation();
  return (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return "";
    const mins = Math.round(diff / 60000);
    try {
      const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });
      if (Math.abs(mins) < 1) return t("common.just_now", "agora");
      if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
      const hours = Math.round(mins / 60);
      if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
      return rtf.format(-Math.round(hours / 24), "day");
    } catch {
      return "";
    }
  };
}

export function BoardInvitationsBanner() {
  const { t } = useTranslation();
  const { data: invitations = [] } = useMyBoardInvitations();
  const accept = useAcceptBoardInvitation();
  const reject = useRejectBoardInvitation();
  const rel = useRelativeTime();

  if (!invitations.length) return null;

  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/20 px-3 py-2 sm:px-4">
        <Mail className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold">
          {t("kanban.invites_pending_title", "Convites para colaborar")}
        </span>
        <span className="ms-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
          {invitations.length}
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {invitations.map((inv) => {
          const busy =
            (accept.isPending && accept.variables === inv.id) ||
            (reject.isPending && reject.variables === inv.id);
          return (
            <div key={inv.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0 border border-border/60">
                  {inv.inviter_avatar ? <AvatarImage src={inv.inviter_avatar} alt={inv.inviter_name || ""} /> : null}
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials(inv.inviter_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{inv.inviter_name || t("common.someone", "Alguém")}</span>{" "}
                    <span className="text-muted-foreground">
                      {t("kanban.invite_cta", "te convidou para colaborar")}
                    </span>
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                    <KanbanSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{inv.board_title || t("kanban.board", "Quadro")}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rel(inv.created_at)}</p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={busy}
                  onClick={() => reject.mutate(inv.id)}
                >
                  <X className="h-4 w-4 me-1.5" />
                  {t("kanban.decline", "Recusar")}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={busy}
                  onClick={() => accept.mutate(inv.id)}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 me-1.5" />
                  )}
                  {t("kanban.accept", "Aceitar")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
