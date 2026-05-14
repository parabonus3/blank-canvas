import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GridNav, GridNavItem } from "@/components/ui/grid-nav";
import { ArrowLeft, UserPlus, Copy, Link, LogOut, LayoutDashboard, MessageCircle, Settings2, Bell, BellOff, Shield } from "lucide-react";
import { playMemberJoined, playMemberLeft } from "@/lib/soundEffects";
import { playLiveChat } from "@/lib/uiSounds";
import { useRooms } from "@/hooks/useRooms";
import { useRoomMembers, useLeaveRoom } from "@/hooks/useRoomMembers";
import { useRoomMessages } from "@/hooks/useRoomMessages";
import { RoomMemberGrid } from "@/components/rooms/RoomMemberGrid";
import { RoomRankingSidebar } from "@/components/rooms/RoomRankingSidebar";
import { RoomLiveBanner } from "@/components/rooms/RoomLiveBanner";
import { RoomChat } from "@/components/rooms/RoomChat";
import { RoomGoalProgress } from "@/components/rooms/RoomGoalProgress";
import { RoomStatsHeader } from "@/components/rooms/RoomStatsHeader";
import { PinnedMessage } from "@/components/rooms/PinnedMessage";
import { InviteMemberDialog } from "@/components/rooms/InviteMemberDialog";
import { RoomActivityFeed } from "@/components/rooms/RoomActivityFeed";
import { RoomFocusSession } from "@/components/rooms/RoomFocusSession";
import { RoomSettingsTab } from "@/components/rooms/RoomSettingsTab";
import { RoomHeatmap } from "@/components/rooms/RoomHeatmap";
import { Wallpaper } from "@/components/Wallpaper";
import { RoomStreakBadge } from "@/components/rooms/RoomStreakBadge";
import { useQuery as useRQ } from "@tanstack/react-query";
import { RoomAchievements } from "@/components/rooms/RoomAchievements";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function RoomDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rooms = [] } = useRooms();
  const room = rooms.find((r) => r.id === id);
  const [inviteCode, setInviteCode] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    supabase.rpc("get_room_invite_code", { _room_id: id }).then(({ data }) => {
      if (data) setInviteCode(data);
    });
  }, [id]);
  const { data: members = [], isLoading } = useRoomMembers(id);
  const leaveRoom = useLeaveRoom();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const lastSeenAtRef = useRef<string>(new Date().toISOString());

  const memberProfiles = useMemo(() => {
    const map = new Map<string, { display_name?: string; avatar_url?: string }>();
    members.forEach((m) => map.set(m.user_id, { display_name: m.display_name, avatar_url: m.avatar_url }));
    return map;
  }, [members]);

  const myMember = useMemo(() => members.find(m => m.user_id === user?.id), [members, user]);
  const myJoinedAt = myMember?.joined_at;

  const notificationsOn = myMember?.notifications_enabled !== false;

  // Fetch messages for unread badge (filtered by joinedAt)
  const { data: allMessages = [] } = useRoomMessages(id, { notificationsEnabled: notificationsOn, joinedAt: myJoinedAt });

  // Track unread count when not on chat tab
  const unreadCount = useMemo(() => {
    if (activeTab === "chat") return 0;
    const lastSeen = lastSeenAtRef.current;
    return allMessages.filter(m => m.user_id !== user?.id && m.created_at > lastSeen).length;
  }, [allMessages, activeTab, user?.id]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (value === "chat") {
      lastSeenAtRef.current = new Date().toISOString();
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`room-focus-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "study_rooms", filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_members", filter: `room_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["roomMembers", id] });
        if (notificationsOn) playMemberJoined();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_members", filter: `room_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["roomMembers", id] });
        if (notificationsOn) playMemberLeft();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_members", filter: `room_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["roomMembers", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient, notificationsOn]);

  // Detecta transição de focus_session_joined: false -> true para qualquer membro
  // (exceto o próprio usuário) e toca o som "live-chat". Comparar o array de membros
  // é mais confiável que confiar no payload.old do Realtime.
  const prevJoinedRef = useRef<Map<string, boolean>>(new Map());
  const hasInitializedJoinedRef = useRef(false);
  useEffect(() => {
    if (!members || members.length === 0) return;
    const prev = prevJoinedRef.current;
    const next = new Map<string, boolean>();
    members.forEach((m: any) => next.set(m.user_id, !!m.focus_session_joined));

    // Na primeira execução, apenas inicializa o estado base (sem tocar som)
    if (!hasInitializedJoinedRef.current) {
      prevJoinedRef.current = next;
      hasInitializedJoinedRef.current = true;
      return;
    }

    if (notificationsOn) {
      next.forEach((joined, userId) => {
        const wasJoined = prev.get(userId) === true;
        if (joined && !wasJoined && userId !== user?.id) {
          playLiveChat();
        }
      });
    }
    prevJoinedRef.current = next;
  }, [members, notificationsOn, user?.id]);


  const isMember = useMemo(() => members.some(m => m.user_id === user?.id), [members, user]);

  // Room streak for stats header
  const { data: roomStreak = 0 } = useRQ({
    queryKey: ["roomStreak", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_room_streak", { _room_id: id! });
      if (error) throw error;
      return (data || 0) as number;
    },
    enabled: !!id,
    staleTime: 60000,
  });

  if (!isLoading && !room) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t("rooms.room_not_found")}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("rooms.back_to_rooms")}
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!isLoading && room && !isMember) {
    navigate("/rooms");
    return null;
  }

  const isOwner = room?.owner_id === user?.id;
  const isOwnerOrMod = isOwner || myMember?.role === "moderator";

  const handleLeave = async () => {
    if (!id) return;
    await leaveRoom.mutateAsync(id);
    navigate("/rooms");
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast({ title: t("rooms.copied") });
    }
  };

  const copyInviteLink = () => {
    if (inviteCode) {
      const link = `${window.location.origin}/room-preview/${inviteCode}${user ? `?ref=${user.id}` : ""}`;
      navigator.clipboard.writeText(link);
      toast({ title: t("rooms.copied") });
    }
  };

  const toggleNotifications = async () => {
    if (!myMember || !id || !user) return;
    const newVal = !(myMember.notifications_enabled ?? true);
    
    // Request browser notification permission when enabling
    if (newVal && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    await supabase.from("room_members").update({ notifications_enabled: newVal }).eq("room_id", id).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["roomMembers", id] });
  };

  return (
    <MainLayout>
      {/* Room wallpaper: fixed-position layer behind the entire content area */}
      {(room as any)?.room_background && (room as any).room_background !== "none" && (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
          <Wallpaper background={(room as any).room_background} variant="page" overlay={0.7} />
        </div>
      )}
      <div className="relative z-[1] space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{room?.name || "..."}</h1>
              {room && <RoomStreakBadge roomId={room.id} />}
            </div>
            {room?.description && (
              <p className="text-sm text-muted-foreground">{room.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="icon" onClick={toggleNotifications} title={t("rooms.toggle_notifications")}>
              {myMember?.notifications_enabled !== false ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="outline" size="sm" onClick={copyInviteCode} disabled={!inviteCode}>
              <Copy className="h-3.5 w-3.5 sm:me-1.5" />
              <span className="hidden sm:inline">{inviteCode || "..."}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              <Link className="h-3.5 w-3.5 sm:me-1.5" />
              <span className="hidden sm:inline">{t("rooms.copy_link")}</span>
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 sm:me-1.5" />
              <span className="hidden sm:inline">{t("rooms.invite")}</span>
            </Button>
            {!isOwner && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={handleLeave}>
                <LogOut className="h-3.5 w-3.5 sm:me-1.5" />
                <span className="hidden sm:inline">{t("rooms.leave")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Rules banner */}
        {room && (room as any).rules && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary">{t("rooms.rules_label")}</p>
              <p className="text-sm text-foreground whitespace-pre-line">{(room as any).rules}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <GridNav
            items={[
              { value: "overview", label: t("rooms.tab_overview"), icon: LayoutDashboard },
              { value: "chat", label: t("rooms.tab_chat"), icon: MessageCircle, badge: unreadCount > 0 ? unreadCount : undefined },
              ...(isOwnerOrMod ? [{ value: "settings", label: t("rooms.tab_settings"), icon: Settings2 }] as GridNavItem[] : []),
            ]}
            value={activeTab}
            onChange={handleTabChange}
            columns="grid-cols-2 sm:grid-cols-3"
          />

          <TabsContent value="overview" className="mt-4">
            {/* LIVE Banner */}
            <RoomLiveBanner
              members={members}
              hasFocusSession={!!(room as any)?.focus_session_end_at && new Date((room as any).focus_session_end_at) > new Date()}
            />

            <div className="flex flex-col lg:flex-row gap-6 mt-4">
              {/* Main classroom area */}
              <div className="flex-1 min-w-0 space-y-0">
                {/* Stats */}
                <RoomStatsHeader
                  roomId={id}
                  members={members}
                  roomType={room?.room_type || "study"}
                  goalHours={room?.goal_hours}
                  goalLabel={room?.goal_label}
                  roomStreak={roomStreak}
                />

                {/* Chalkboard section */}
                <div className="classroom-chalkboard p-5 mt-4 space-y-4">
                  {room && !isOwner && room.pinned_message && (
                    <div className="chalk-text text-sm opacity-90 border-b border-white/10 pb-3">
                      📌 {room.pinned_message}
                    </div>
                  )}

                  {room && (
                    <RoomFocusSession
                      roomId={room.id}
                      focusSessionEndAt={(room as any).focus_session_end_at}
                      focusSessionDuration={(room as any).focus_session_duration}
                      focusSessionStartedBy={(room as any).focus_session_started_by}
                      focusSessionStartAt={(room as any).focus_session_start_at}
                      memberProfiles={memberProfiles}
                      isChalkboard
                      members={members}
                    />
                  )}

                  {room?.goal_hours && (
                    <RoomGoalProgress
                      goalHours={room.goal_hours}
                      goalLabel={room.goal_label}
                      members={members}
                      isChalkboard
                      roomId={room.id}
                    />
                  )}

                  {/* No focus & no goal — show a chalk welcome */}
                  {!room?.goal_hours && !(room as any)?.focus_session_end_at && (
                    <div className="chalk-text text-center py-4 opacity-70 text-sm">
                      📚 {t("rooms.studying_now")}
                    </div>
                  )}
                </div>

                {/* Floor + Desks area */}
                <div className="classroom-floor rounded-b-xl p-5 pt-8">
                  <div className="classroom-wall rounded-xl p-5">
                    <RoomMemberGrid members={members} roomId={id!} isOwnerOrMod={isOwnerOrMod} />
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-80 shrink-0 space-y-6">
                <RoomRankingSidebar members={members} roomId={id} />
                <RoomAchievements roomId={id!} members={members} />
                <RoomHeatmap roomId={id!} />
                <RoomActivityFeed roomId={id!} memberProfiles={memberProfiles} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <div className="h-[600px]">
              <RoomChat
                roomId={id!}
                memberProfiles={memberProfiles}
                chatMode={(room as any)?.chat_mode || "open"}
                myRole={myMember?.role || "member"}
                isMuted={myMember?.is_muted || false}
                notificationsEnabled={notificationsOn}
                joinedAt={myJoinedAt}
              />
            </div>
          </TabsContent>

          {isOwnerOrMod && room && (
            <TabsContent value="settings" className="mt-4">
              <RoomSettingsTab room={room} isOwner={isOwner} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {room && (
        <InviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          roomId={room.id}
          inviteCode={inviteCode}
        />
      )}
    </MainLayout>
  );
}
