import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PinnedMessage } from "@/components/rooms/PinnedMessage";
import { EditGoalDialog } from "@/components/rooms/EditGoalDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Target, Trash2, Globe, Shield, MessageSquare, UserX, VolumeX, Volume2, Crown, Lock, LockOpen, Flag, Pencil } from "lucide-react";
import { StudyRoom, useDeleteRoom } from "@/hooks/useRooms";
import { COUNTRIES, getFlagByCode } from "@/lib/countries";
import { useRoomMembers } from "@/hooks/useRoomMembers";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RoomFramePicker } from "@/components/rooms/RoomFramePicker";

interface Props {
  room: StudyRoom;
  isOwner: boolean;
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function RoomSettingsTab({ room, isOwner }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [goalOpen, setGoalOpen] = useState(false);
  const deleteRoom = useDeleteRoom();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPublic, setIsPublic] = useState(room.is_public || false);
  const [chatMode, setChatMode] = useState((room as any).chat_mode || "open");
  const [rules, setRules] = useState((room as any).rules || "");
  const [rulesDirty, setRulesDirty] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("room_has_password", { _room_id: room.id }).then(({ data }) => {
      if (!cancelled) setHasPassword(!!data);
    });
    return () => { cancelled = true; };
  }, [room.id]);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [roomCountry, setRoomCountry] = useState<string>(room.country || "");
  const [countrySaving, setCountrySaving] = useState(false);
  const [roomName, setRoomName] = useState(room.name);
  const [roomNameSaving, setRoomNameSaving] = useState(false);
  const { data: members = [] } = useRoomMembers(room.id);

  // Determine current user role
  const myMember = members.find(m => m.user_id === user?.id);
  const isOwnerOrMod = isOwner || myMember?.role === "moderator";

  if (!isOwner && myMember?.role !== "moderator") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("rooms.settings_owner_only")}
      </div>
    );
  }

  const togglePublic = async (value: boolean) => {
    setIsPublic(value);
    await supabase.from("study_rooms").update({ is_public: value }).eq("id", room.id);
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };

  const updateChatMode = async (value: string) => {
    setChatMode(value);
    await supabase.from("study_rooms").update({ chat_mode: value }).eq("id", room.id);
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };

  const saveRules = async () => {
    await supabase.from("study_rooms").update({ rules: rules.trim() || null }).eq("id", room.id);
    setRulesDirty(false);
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    toast({ title: t("common.success") });
  };

  const handleKick = async (memberId: string) => {
    try {
      const { error } = await supabase.rpc("kick_room_member", { _room_id: room.id, _member_user_id: memberId });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["roomMembers", room.id] });
      toast({ title: t("rooms.member_kicked") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleToggleMute = async (memberId: string, isMuted: boolean) => {
    try {
      const { error } = await supabase.rpc("toggle_mute_member", { _room_id: room.id, _member_user_id: memberId, _muted: !isMuted });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["roomMembers", room.id] });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleSetRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc("set_member_role", { _room_id: room.id, _member_user_id: memberId, _role: newRole });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["roomMembers", room.id] });
      toast({ title: t("common.success") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const otherMembers = members.filter(m => m.user_id !== room.owner_id);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Room Name */}
      {isOwner && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            {t("rooms.room_name")}
          </h3>
          <div className="flex gap-2">
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t("rooms.room_name")}
              className="flex-1"
            />
            <Button
              size="sm"
              disabled={roomNameSaving || !roomName.trim() || roomName === room.name}
              onClick={async () => {
                setRoomNameSaving(true);
                try {
                  const { error } = await supabase.from("study_rooms").update({ name: roomName.trim() }).eq("id", room.id);
                  if (error) throw error;
                  queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  queryClient.invalidateQueries({ queryKey: ["room", room.id] });
                  toast({ title: t("common.success") });
                } catch (e: any) {
                  toast({ title: t("common.error"), description: e.message, variant: "destructive" });
                }
                setRoomNameSaving(false);
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}

      <PinnedMessage
        roomId={room.id}
        message={room.pinned_message || null}
        isOwner={isOwner}
      />

      {/* Rules */}
      {isOwner && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {t("rooms.rules_label")}
          </h3>
          <Textarea
            value={rules}
            onChange={(e) => { setRules(e.target.value); setRulesDirty(true); }}
            placeholder={t("rooms.rules_placeholder")}
            rows={3}
          />
          {rulesDirty && (
            <Button size="sm" onClick={saveRules}>{t("common.save")}</Button>
          )}
        </div>
      )}

      {/* Chat mode */}
      {isOwner && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            {t("rooms.chat_mode")}
          </h3>
          <Select value={chatMode} onValueChange={updateChatMode}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t("rooms.chat_mode_open")}</SelectItem>
              <SelectItem value="moderators_only">{t("rooms.chat_mode_mods")}</SelectItem>
              <SelectItem value="owner_only">{t("rooms.chat_mode_owner")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Public toggle */}
      {isOwner && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{t("rooms.public_room")}</h3>
                <p className="text-xs text-muted-foreground">{t("rooms.public_room_desc")}</p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={togglePublic} />
          </div>
        </div>
      )}

      {/* Room Country */}
      {isOwner && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            {t("rooms.country")}
          </h3>
          <div className="flex gap-2">
            <Select value={roomCountry} onValueChange={setRoomCountry}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("rooms.select_country")}>
                  {roomCountry ? `${getFlagByCode(roomCountry)} ${COUNTRIES.find(c => c.code === roomCountry)?.label}` : t("rooms.select_country")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">{t("rooms.no_country")}</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={countrySaving}
              onClick={async () => {
                setCountrySaving(true);
                try {
                  const val = roomCountry === "none" ? null : roomCountry || null;
                  const { error } = await supabase.from("study_rooms").update({ country: val }).eq("id", room.id);
                  if (error) throw error;
                  queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  toast({ title: t("common.success") });
                } catch (e: any) {
                  toast({ title: t("common.error"), description: e.message, variant: "destructive" });
                }
                setCountrySaving(false);
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}

      {/* Room Password */}
      {isOwner && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {hasPassword ? <Lock className="h-4 w-4 text-primary" /> : <LockOpen className="h-4 w-4 text-muted-foreground" />}
            {t("rooms.room_password")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {hasPassword ? t("rooms.has_password_private") : t("rooms.no_password_public")}
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder={t("rooms.new_password_placeholder")}
              className="flex-1"
            />
            {roomPassword.length > 0 && roomPassword.length < 6 && (
              <p className="text-xs text-destructive">{t("rooms.password_min_length")}</p>
            )}
            <Button
              size="sm"
              disabled={passwordSaving || (roomPassword.length > 0 && roomPassword.length < 6)}
              onClick={async () => {
                setPasswordSaving(true);
                try {
                  const { error } = await supabase.rpc("update_room_password", {
                    _room_id: room.id,
                    _password: roomPassword || null,
                  });
                  if (error) throw error;
                  setHasPassword(!!roomPassword);
                  setRoomPassword("");
                  queryClient.invalidateQueries({ queryKey: ["rooms"] });
                  toast({ title: t("common.success") });
                } catch (e: any) {
                  toast({ title: t("common.error"), description: e.message, variant: "destructive" });
                }
                setPasswordSaving(false);
              }}
            >
              {roomPassword ? t("rooms.set_password") : t("rooms.remove_password")}
            </Button>
          </div>
        </div>
      )}

      {/* Room background (wallpaper) — owner only */}
      {isOwner && (
        <RoomBackgroundPicker
          roomId={room.id}
          currentBackground={(room as any).room_background}
        />
      )}

      <div className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">{t("rooms.collective_goal")}</h3>
        <p className="text-sm text-muted-foreground">
          {room.goal_hours
            ? `${room.goal_label || t("rooms.collective_goal")}: ${room.goal_hours}h`
            : t("rooms.no_goal_set")}
        </p>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
            <Target className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.set_goal")}
          </Button>
        )}
      </div>

      {/* Member management */}
      {isOwnerOrMod && otherMembers.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("rooms.manage_members")}</h3>
          <div className="space-y-2">
            {otherMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar className="h-8 w-8">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className="text-xs">{getInitials(member.display_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{member.display_name || t("rooms.anonymous")}</span>
                    {member.role === "moderator" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Shield className="h-2.5 w-2.5 mr-0.5" /> MOD
                      </Badge>
                    )}
                    {(member as any).is_muted && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                        <VolumeX className="h-2.5 w-2.5 mr-0.5" /> {t("rooms.muted")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {/* Mute/unmute */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggleMute(member.user_id, (member as any).is_muted)}
                    title={(member as any).is_muted ? t("rooms.unmute") : t("rooms.mute")}
                  >
                    {(member as any).is_muted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  </Button>
                  {/* Promote/demote (owner only) */}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSetRole(member.user_id, member.role === "moderator" ? "member" : "moderator")}
                      title={member.role === "moderator" ? t("rooms.demote") : t("rooms.promote")}
                    >
                      <Crown className={cn("h-3.5 w-3.5", member.role === "moderator" && "text-yellow-500")} />
                    </Button>
                  )}
                  {/* Kick */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleKick(member.user_id)}
                    title={t("rooms.kick")}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {isOwner && (
        <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-destructive">{t("rooms.danger_zone")}</h3>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await deleteRoom.mutateAsync(room.id);
              navigate("/rooms");
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.delete_room")}
          </Button>
        </div>
      )}

      <EditGoalDialog
        open={goalOpen}
        onOpenChange={setGoalOpen}
        roomId={room.id}
        currentGoalHours={room.goal_hours}
        currentGoalLabel={room.goal_label}
      />
    </div>
  );
}
