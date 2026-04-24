import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { FriendsList } from "@/components/friends/FriendsList";
import { AddFriendDialog } from "@/components/friends/AddFriendDialog";
import { useProfile } from "@/hooks/useProfile";
import { UserPlus, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Friends() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!profile?.friend_code) return;
    navigator.clipboard.writeText(profile.friend_code);
    setCopied(true);
    toast({ title: t("friends.code_copied") });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("friends.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("friends.subtitle")}</p>
          </div>
          <Button onClick={() => setShowAddFriend(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("friends.add_friend")}</span>
          </Button>
        </div>

        {/* My friend code */}
        {profile?.friend_code && (
          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">{t("friends.my_code")}</p>
              <p className="font-mono font-bold text-lg">{profile.friend_code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-1.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("friends.copied") : t("friends.copy")}
            </Button>
          </div>
        )}

        <FriendsList />

        <AddFriendDialog open={showAddFriend} onOpenChange={setShowAddFriend} />
      </div>
    </MainLayout>
  );
}
