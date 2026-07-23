import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Crown, UserPlus } from "lucide-react";
import {
  useBoardMembers,
  useInviteToBoard,
  useRemoveBoardMember,
} from "@/hooks/useBoardCollab";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boardId: string;
  isOwner: boolean;
}

export function BoardInviteDialog({ open, onOpenChange, boardId, isOwner }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const { data: members = [] } = useBoardMembers(boardId);
  const invite = useInviteToBoard();
  const removeMember = useRemoveBoardMember();

  const send = async () => {
    if (!code.trim()) return;
    await invite.mutateAsync({ boardId, friendCode: code });
    setCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("kanban.members", "Membros")}</DialogTitle>
        </DialogHeader>

        {isOwner && (
          <div className="space-y-2">
            <Label>{t("kanban.invite_by_code", "Convidar por código de amigo")}</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TZ-XXXXXX"
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <Button onClick={send} disabled={!code.trim() || invite.isPending}>
                <UserPlus className="h-4 w-4 me-1" />
                {t("kanban.invite", "Convidar")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("kanban.members", "Membros")} ({members.length})</Label>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {members.map((m) => {
              const initials = (m.display_name || "?").trim().slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                  <Avatar className="h-8 w-8">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {m.display_name || "—"}
                      {m.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.role}</div>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeMember.mutate({ memberId: m.id, boardId })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
