import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Crown, UserPlus, Copy, Check, ChevronDown, Users, X, Clock } from "lucide-react";
import {
  useBoardMembers,
  useInviteToBoard,
  useRemoveBoardMember,
  useMyFriendCode,
  useBoardOutgoingInvitations,
  useCancelBoardInvitation,
  useInviteFriendToBoard,
} from "@/hooks/useBoardCollab";
import { useFriendships } from "@/hooks/useFriendships";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boardId: string;
  isOwner: boolean;
}

function useProfilesByIds(userIds: string[]) {
  return useQuery({
    queryKey: ["profiles_by_ids", userIds.sort().join(",")],
    queryFn: async () => {
      if (!userIds.length) return new Map<string, { display_name: string | null; avatar_url: string | null }>();
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      (data || []).forEach((p: any) => map.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }));
      return map;
    },
    enabled: userIds.length > 0,
  });
}

export function BoardInviteDialog({ open, onOpenChange, boardId, isOwner }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: members = [] } = useBoardMembers(boardId);
  const { data: myCode } = useMyFriendCode();
  const { accepted, getFriendUserId } = useFriendships();
  const { data: outgoing = [] } = useBoardOutgoingInvitations(boardId);
  const invite = useInviteToBoard();
  const inviteFriend = useInviteFriendToBoard();
  const cancelInvite = useCancelBoardInvitation();
  const removeMember = useRemoveBoardMember();

  const friendIds = accepted.map(f => getFriendUserId(f)).filter(Boolean);
  const { data: friendProfiles } = useProfilesByIds(friendIds);

  const memberByUser = new Map(members.map(m => [m.user_id, m]));
  const outgoingByUser = new Map(outgoing.map(o => [o.invitee_id, o]));

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
          <SheetTitle>
            {t("kanban.manage_members")}
            {members.length > 0 && (
              <span className="ms-2 text-sm font-normal text-muted-foreground">({members.length})</span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Friends list - primary way to invite */}
          {isOwner && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t("kanban.invite_friends", "Convidar amigos")}
                {friendIds.length > 0 && (
                  <span className="text-xs text-muted-foreground">({friendIds.length})</span>
                )}
              </Label>

              {friendIds.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-muted-foreground/60 mb-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {t("kanban.no_friends_yet", "Você ainda não tem amigos. Adicione amigos na aba Amigos primeiro.")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                  {friendIds.map(uid => {
                    const p = friendProfiles?.get(uid);
                    const name = p?.display_name || "—";
                    const initials = name.trim().slice(0, 2).toUpperCase();
                    const isMember = memberByUser.has(uid);
                    const pending = outgoingByUser.get(uid);

                    return (
                      <div key={uid} className={cn(
                        "flex items-center gap-2 p-2 rounded-md border transition-colors",
                        isMember ? "bg-primary/5 border-primary/30" : "bg-card/50"
                      )}>
                        <Avatar className="h-9 w-9">
                          {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {isMember
                              ? t("kanban.friend_status_member", "Já é membro")
                              : pending
                                ? t("kanban.friend_status_invited", "Convite pendente")
                                : t("kanban.friend_status_not_invited", "Não convidado")}
                          </div>
                        </div>
                        {isMember ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : pending ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            disabled={cancelInvite.isPending}
                            onClick={() => cancelInvite.mutate({ invitationId: pending.id, boardId })}
                          >
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{t("kanban.cancel_invite", "Cancelar")}</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 gap-1"
                            disabled={inviteFriend.isPending}
                            onClick={() => inviteFriend.mutate({ boardId, userId: uid })}
                          >
                            <UserPlus className="h-3 w-3" />
                            <span className="text-xs">{t("kanban.invite")}</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Your friend code (for others to invite you) */}
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

          {/* Advanced: invite by code (for non-friends) */}
          {isOwner && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
                {t("kanban.invite_by_code_advanced", "Convidar por código de amigo")}
              </button>
              {showAdvanced && (
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
              )}
            </div>
          )}

          {/* Current members list */}
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
