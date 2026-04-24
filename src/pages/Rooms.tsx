import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, BookOpen, GraduationCap, Briefcase, Sparkles, DoorOpen, Copy } from "lucide-react";
import { getFlagByCode } from "@/lib/countries";
import { useRooms } from "@/hooks/useRooms";
import { useJoinByInviteCode } from "@/hooks/useRoomInvitations";
import { CreateRoomDialog } from "@/components/rooms/CreateRoomDialog";
import { RoomInvitations } from "@/components/rooms/RoomInvitations";
import { JoinPasswordDialog } from "@/components/rooms/JoinPasswordDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = {
  study: GraduationCap,
  reading: BookOpen,
  work: Briefcase,
  custom: Sparkles,
};

export default function Rooms() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: rooms = [], isLoading } = useRooms();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const joinByCode = useJoinByInviteCode();
  const { toast } = useToast();

  // Password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState("");
  const [pendingRoomName, setPendingRoomName] = useState("");

  // Handle join link
  useEffect(() => {
    const code = searchParams.get("join");
    if (code) {
      attemptJoin(code);
    }
  }, [searchParams]);

  const attemptJoin = async (code: string) => {
    if (!code.trim()) return;
    try {
      // Find room to check for password
      const { data: roomInfo } = await supabase.rpc("find_room_by_invite_code", { _code: code.toUpperCase() });
      if (!roomInfo || roomInfo.length === 0) {
        toast({ title: t("rooms.invalid_code"), variant: "destructive" });
        return;
      }
      const roomId = roomInfo[0].id;
      const roomName = roomInfo[0].name;

      // Check if room has password
      const { data: hasPassword } = await supabase.rpc("room_has_password", { _room_id: roomId });
      if (hasPassword) {
        setPendingJoinCode(code);
        setPendingRoomName(roomName);
        setPasswordDialogOpen(true);
        return;
      }

      // No password, join directly
      joinByCode.mutate({ code });
    } catch {
      joinByCode.mutate({ code });
    }
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    attemptJoin(joinCode.trim());
    setJoinCode("");
  };

  const handlePasswordSubmit = async (password: string) => {
    await joinByCode.mutateAsync({ code: pendingJoinCode, password });
  };

  const copyFriendCode = () => {
    if (profile?.friend_code) {
      navigator.clipboard.writeText(profile.friend_code);
      toast({ title: t("rooms.copied") });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("rooms.title")}</h1>
            <p className="text-muted-foreground">{t("rooms.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("rooms.create_room")}
            </Button>
          </div>
        </div>

        {/* Friend Code */}
        {profile?.friend_code && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("rooms.your_friend_code")}</p>
              <p className="text-xs text-muted-foreground">{t("rooms.share_code_desc")}</p>
            </div>
            <button
              onClick={copyFriendCode}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 font-mono text-sm font-bold hover:bg-muted transition-colors"
            >
              {profile.friend_code}
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Join by code */}
        <div className="flex gap-2">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder={t("rooms.join_code_placeholder")}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={handleJoin} disabled={!joinCode.trim() || joinByCode.isPending}>
            <DoorOpen className="h-4 w-4 mr-2" />
            {t("rooms.join")}
          </Button>
        </div>

        {/* Pending Invitations */}
        <RoomInvitations />

        {/* Room List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("rooms.no_rooms")}</p>
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              {t("rooms.create_first")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const Icon = typeIcons[room.room_type] || Sparkles;
              const isOwner = room.owner_id === user?.id;
              return (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="text-left rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold line-clamp-1">
                          {getFlagByCode(room.country)} {room.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {t(`rooms.type_${room.room_type}`)}
                        </p>
                      </div>
                    </div>
                    {isOwner && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {t("rooms.owner")}
                      </span>
                    )}
                  </div>
                  {room.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{room.member_count || 0} {t("rooms.members")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />

      <JoinPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        roomName={pendingRoomName}
        onSubmit={handlePasswordSubmit}
        isPending={joinByCode.isPending}
      />
    </MainLayout>
  );
}
