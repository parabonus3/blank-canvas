import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Crown, UserPlus, Copy, Check } from "lucide-react";
import {
  useBoardMembers,
  useInviteToBoard,
  useRemoveBoardMember,
  useMyFriendCode,
} from "@/hooks/useBoardCollab";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boardId: string;
  isOwner: boolean;
}

export function BoardInviteDialog({ open, onOpenChange, boardId, isOwner }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const { data: members = [] } = useBoardMembers(boardId);
  const { data: myCode } = useMyFriendCode();
  const invite = useInviteToBoard();
  const removeMember = useRemoveBoardMember();

  const send = async () => {
    if (!code.trim()) return;
    try {
      await invite.mutateAsync({ boardId, friendCode: code });
      setCode("");
    } catch {}
  };

  const copyMyCode = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      toast({ title: t("kanban.copied") });
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{t("kanban.manage_members")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Your friend code */}
          {myCode && (
            <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
              <Label className="text-xs">{t("kanban.your_friend_code")}</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-background border px-2 py-1.5 text-sm font-mono font-semibold tracking-wider">
                  {myCode}
                </code>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={copyMyCode}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="space-y-2">
              <Label>{t("kanban.invite_by_code")}</Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t("kanban.friend_code_placeholder") as string}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  className="font-mono"
                />
                <Button onClick={send} disabled={!code.trim() || invite.isPending}>
                  <UserPlus className="h-4 w-4 me-1" />
                  {t("kanban.invite")}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {t("kanban.members")} ({members.length})
            </Label>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {members.map((m) => {
                const initials = (m.display_name || "?").trim().slice(0, 2).toUpperCase();
                return (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border bg-card/50">
                    <Avatar className="h-9 w-9">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {m.display_name || "—"}
                        {m.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {t(`kanban.member_role_${m.role}`, m.role)}
                      </div>
                    </div>
                    {isOwner && m.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember.mutate({ memberId: m.id, boardId })}
                        aria-label={t("kanban.remove_member") as string}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
