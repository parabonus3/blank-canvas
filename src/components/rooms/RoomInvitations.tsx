import { useTranslation } from "react-i18next";
import { usePendingInvitations, useRespondInvitation } from "@/hooks/useRoomInvitations";
import { Button } from "@/components/ui/button";
import { Check, X, Mail } from "lucide-react";

export function RoomInvitations() {
  const { t } = useTranslation();
  const { data: invitations = [] } = usePendingInvitations();
  const respond = useRespondInvitation();

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Mail className="h-4 w-4" />
        {t("rooms.pending_invitations")} ({invitations.length})
      </h3>
      <div className="space-y-2">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{inv.room_name}</p>
              <p className="text-xs text-muted-foreground">
                {t("rooms.invited_to_join")}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => respond.mutate({ invitationId: inv.id, roomId: inv.room_id, accept: false })}
                disabled={respond.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => respond.mutate({ invitationId: inv.id, roomId: inv.room_id, accept: true })}
                disabled={respond.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                {t("rooms.accept")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
