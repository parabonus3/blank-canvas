import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Mail } from "lucide-react";
import {
  useMyBoardInvitations,
  useAcceptBoardInvitation,
  useRejectBoardInvitation,
} from "@/hooks/useBoardCollab";

export function BoardInvitationsBanner() {
  const { t } = useTranslation();
  const { data: invitations = [] } = useMyBoardInvitations();
  const accept = useAcceptBoardInvitation();
  const reject = useRejectBoardInvitation();

  if (!invitations.length) return null;

  return (
    <Card className="p-3 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{t("kanban.pending_invites", "Convites pendentes")} ({invitations.length})</span>
      </div>
      <div className="space-y-1.5">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center gap-2 p-2 rounded-md bg-background/70">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{inv.board_title || "—"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {t("kanban.invited_by", "Convidado por")} {inv.inviter_name || "—"}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => reject.mutate(inv.id)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => accept.mutate(inv.id)}>
              <Check className="h-4 w-4 me-1" />
              {t("kanban.accept", "Aceitar")}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
