import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Link, UserPlus } from "lucide-react";
import { useInviteMember } from "@/hooks/useRoomInvitations";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  inviteCode: string;
}

export function InviteMemberDialog({ open, onOpenChange, roomId, inviteCode }: Props) {
  const { t } = useTranslation();
  const [friendCode, setFriendCode] = useState("");
  const inviteMember = useInviteMember();
  const { toast } = useToast();

  const inviteLink = `${window.location.origin}/rooms?join=${inviteCode}`;

  const handleInvite = async () => {
    if (!friendCode.trim()) return;
    await inviteMember.mutateAsync({ roomId, friendCode: friendCode.trim() });
    setFriendCode("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("rooms.copied") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("rooms.invite_member")}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code">{t("rooms.by_friend_code")}</TabsTrigger>
            <TabsTrigger value="link">{t("rooms.by_link")}</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("rooms.friend_code")}</Label>
              <div className="flex gap-2">
                <Input
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  placeholder="TZ-XXXXXX"
                />
                <Button onClick={handleInvite} disabled={!friendCode.trim() || inviteMember.isPending}>
                  {t("rooms.send_invite")}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("rooms.invite_code")}</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <code className="flex-1 text-sm font-mono">{inviteCode}</code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(inviteCode)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("rooms.invite_link")}</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-xs truncate">{inviteLink}</span>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(inviteLink)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
