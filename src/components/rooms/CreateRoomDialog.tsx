import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, GraduationCap, Briefcase, Sparkles, Lock, Globe, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useFriendships, useFriendProfiles } from "@/hooks/useFriendships";

const ROOM_TYPES = [
  { value: "study", icon: GraduationCap, labelKey: "rooms.type_study" },
  { value: "reading", icon: BookOpen, labelKey: "rooms.type_reading" },
  { value: "work", icon: Briefcase, labelKey: "rooms.type_work" },
  { value: "custom", icon: Sparkles, labelKey: "rooms.type_custom" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { getMaxRooms, getMaxMembersPerRoom, tier } = useSubscription();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState("study");
  const [password, setPassword] = useState("");
  const [rules, setRules] = useState("");
  const [country, setCountry] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [ownedRoomCount, setOwnedRoomCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const { accepted, getFriendUserId } = useFriendships();
  const friendUserIds = accepted.map(f => getFriendUserId(f));
  const { data: friendProfiles = [] } = useFriendProfiles(friendUserIds);

  const maxRooms = getMaxRooms();
  const limitReached = ownedRoomCount >= maxRooms;

  useEffect(() => {
    if (open && user) {
      setLoadingCount(true);
      supabase
        .from("study_rooms")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .then(({ count }) => {
          setOwnedRoomCount(count ?? 0);
          setLoadingCount(false);
        });
    }
  }, [open, user]);

  const isPublic = !password.trim();

  const passwordTooShort = password.trim().length > 0 && password.trim().length < 6;

  const handleCreate = async () => {
    if (!name.trim() || passwordTooShort) return;
    setIsPending(true);
    try {
      const { data: roomId, error } = await supabase.rpc("create_room_with_password", {
        _name: name.trim(),
        _description: description.trim() || null,
        _room_type: roomType,
        _is_public: isPublic,
        _password: password.trim() || null,
        _rules: rules.trim() || null,
        _country: country || null,
      });
      if (error) throw error;
      // Invite selected friends
      if (selectedFriends.length > 0 && roomId) {
        await Promise.all(
          selectedFriends.map((friendId) =>
            supabase.from("room_invitations").insert({
              room_id: roomId,
              inviter_id: user!.id,
              invitee_id: friendId,
            })
          )
        );
      }
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: t("rooms.room_created") });
      setName("");
      setDescription("");
      setRoomType("study");
      setPassword("");
      setRules("");
      setCountry("");
      setSelectedFriends([]);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rooms.create_room")}</DialogTitle>
        </DialogHeader>

        {!loadingCount && limitReached ? (
          <div className="py-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("rooms.room_limit_reached", { max: maxRooms, plan: tier.charAt(0).toUpperCase() + tier.slice(1) })}
            </p>
            <Button asChild>
              <Link to="/pricing">{t("rooms.upgrade_for_more")}</Link>
            </Button>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground mb-1">
            {t("rooms.rooms_used", { used: ownedRoomCount, max: maxRooms })}
          </div>
          <div className="space-y-2">
            <Label>{t("rooms.room_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("rooms.name_placeholder")} />
          </div>

          <div className="space-y-2">
            <Label>{t("rooms.room_type")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setRoomType(type.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-sm transition-all",
                    roomType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <type.icon className="h-4 w-4" />
                  {t(type.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t("rooms.country")}
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder={t("rooms.select_country")} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("rooms.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("rooms.description_placeholder")}
              rows={2}
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              {t("rooms.password_optional")}
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("rooms.password_create_placeholder")}
            />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {passwordTooShort ? (
                <span className="text-destructive">{t("rooms.password_min_length")}</span>
              ) : isPublic ? (
                <>
                  <Globe className="h-3 w-3 text-green-500" />
                  {t("rooms.no_password_public")}
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 text-orange-500" />
                  {t("rooms.has_password_private")}
                </>
              )}
            </div>
          </div>

          {/* Invite Friends */}
          {accepted.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t("friends.invite_friends")}
              </Label>
              <ScrollArea className="max-h-32 rounded-md border p-2">
                <div className="space-y-1.5">
                  {accepted.map((f) => {
                    const friendId = getFriendUserId(f);
                    const profile = (friendProfiles as any[]).find((p: any) => p.user_id === friendId);
                    const checked = selectedFriends.includes(friendId);
                    return (
                      <label key={f.id} className="flex items-center gap-2.5 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setSelectedFriends(prev =>
                              v ? [...prev, friendId] : prev.filter(id => id !== friendId)
                            );
                          }}
                        />
                        <Avatar className="h-6 w-6">
                          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                          <AvatarFallback className="text-[10px]">{(profile?.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{profile?.display_name || t("rooms.anonymous")}</span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
              {selectedFriends.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFriends.length} {t("friends.selected")}
                </p>
              )}
            </div>
          )}

          {/* Rules */}
          <div className="space-y-2">
            <Label>{t("rooms.rules_label")}</Label>
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder={t("rooms.rules_placeholder")}
              rows={2}
            />
          </div>
        </div>
        )}
        {!limitReached && (
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isPending || passwordTooShort}>
            {t("common.create")}
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
