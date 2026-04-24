import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSendFriendRequest } from "@/hooks/useFriendships";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const sendRequest = useSendFriendRequest();
  const [code, setCode] = useState("");
  const [foundUser, setFoundUser] = useState<{ user_id: string; display_name: string } | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!code.trim()) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const { data, error } = await supabase.rpc("find_user_by_friend_code", { _code: code.trim().toUpperCase() });
      if (error) throw error;
      if (data && data.length > 0) {
        if (data[0].user_id === user?.id) {
          toast({ title: t("friends.cant_add_self"), variant: "destructive" });
        } else {
          setFoundUser(data[0]);
        }
      } else {
        toast({ title: t("friends.user_not_found"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleSend = () => {
    if (!foundUser) return;
    sendRequest.mutate(foundUser.user_id, {
      onSuccess: () => {
        setCode("");
        setFoundUser(null);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("friends.add_friend")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("friends.enter_code")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("friends.enter_code")}</Label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="TZ-XXXXXX"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching || !code.trim()} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {foundUser && (
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <span className="font-medium">{foundUser.display_name || t("rooms.anonymous")}</span>
              <Button size="sm" onClick={handleSend} disabled={sendRequest.isPending}>
                {t("friends.send_request")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
