import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFriendships, useFriendProfiles, useRespondFriendRequest, useRemoveFriend } from "@/hooks/useFriendships";
import { useUnreadDMByUser } from "@/hooks/useDirectMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DirectChatDialog } from "./DirectChatDialog";
import { FriendProfileModal } from "./FriendProfileModal";
import { PlanBadge, PlanAvatarRing } from "@/components/rooms/PlanBadge";
import { MessageCircle, Check, X, UserMinus, Clock } from "lucide-react";

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function FriendsList() {
  const { t } = useTranslation();
  const { accepted, pendingReceived, pendingSent, getFriendUserId } = useFriendships();
  const respond = useRespondFriendRequest();
  const removeFriend = useRemoveFriend();
  const { data: unreadByUser = {} } = useUnreadDMByUser();
  const [chatFriend, setChatFriend] = useState<{ userId: string; name: string } | null>(null);
  const [profileFriend, setProfileFriend] = useState<{ userId: string; name: string; avatarUrl?: string } | null>(null);

  const friendUserIds = accepted.map(f => getFriendUserId(f));
  const pendingUserIds = [...pendingReceived, ...pendingSent].map(f => getFriendUserId(f));
  const allUserIds = [...friendUserIds, ...pendingUserIds];
  const { data: profiles = [] } = useFriendProfiles(allUserIds);

  const getProfile = (userId: string) => profiles.find((p: any) => p.user_id === userId);

  return (
    <div className="space-y-6">
      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("friends.pending_requests")}
              <Badge variant="destructive" className="ml-auto">{pendingReceived.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReceived.map((f) => {
              const profile = getProfile(getFriendUserId(f));
              return (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                      <AvatarFallback>{(profile?.display_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{profile?.display_name || t("rooms.anonymous")}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-500/10"
                      onClick={() => respond.mutate({ id: f.id, status: "accepted" })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => respond.mutate({ id: f.id, status: "rejected" })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("friends.sent_requests")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingSent.map((f) => {
              const profile = getProfile(getFriendUserId(f));
              return (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                      <AvatarFallback>{(profile?.display_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-sm">{profile?.display_name || t("rooms.anonymous")}</span>
                      <p className="text-xs text-muted-foreground">{t("friends.waiting")}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Accepted friends */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("friends.my_friends")} ({accepted.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t("friends.no_friends_yet")}</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {accepted.map((f) => {
                  const friendId = getFriendUserId(f);
                  const profile = getProfile(friendId);
                  const unread = unreadByUser[friendId] || 0;
                  const planTier = profile?.plan_tier || "free";
                  return (
                    <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => setProfileFriend({ userId: friendId, name: profile?.display_name || t("rooms.anonymous"), avatarUrl: profile?.avatar_url })}
                      >
                        <PlanAvatarRing tier={planTier}>
                          <Avatar className="h-10 w-10">
                            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                            <AvatarFallback>{(profile?.display_name || "?")[0]}</AvatarFallback>
                          </Avatar>
                        </PlanAvatarRing>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{profile?.display_name || t("rooms.anonymous")}</span>
                            <PlanBadge tier={planTier} />
                          </div>
                          {profile?.total_seconds ? (
                            <p className="text-xs text-muted-foreground">{formatHours(profile.total_seconds)} {t("friends.total_study")}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8 relative"
                          onClick={() => setChatFriend({ userId: friendId, name: profile?.display_name || t("rooms.anonymous") })}>
                          <MessageCircle className="h-4 w-4" />
                          {unread > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeFriend.mutate(f.id)}>
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Chat Dialog */}
      {chatFriend && (
        <DirectChatDialog
          open={!!chatFriend}
          onOpenChange={(open) => !open && setChatFriend(null)}
          friendUserId={chatFriend.userId}
          friendName={chatFriend.name}
        />
      )}

      {profileFriend && (
        <FriendProfileModal
          open={!!profileFriend}
          onOpenChange={(open) => !open && setProfileFriend(null)}
          userId={profileFriend.userId}
          displayName={profileFriend.name}
          avatarUrl={profileFriend.avatarUrl}
        />
      )}
    </div>
  );
}
