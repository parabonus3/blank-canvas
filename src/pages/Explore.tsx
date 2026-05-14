import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GridNav } from "@/components/ui/grid-nav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Wifi, Clock, GraduationCap, BookOpen, Briefcase, Sparkles, Trophy, Globe, Search, Radio, Calendar, CalendarDays, BarChart3, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { JoinPasswordDialog } from "@/components/rooms/JoinPasswordDialog";
import { PlanBadge, PlanAvatarRing } from "@/components/rooms/PlanBadge";
import { useJoinPublicRoom } from "@/hooks/useRooms";
import { COUNTRIES, getFlagByCode } from "@/lib/countries";
import { RoomFrame } from "@/components/RoomFrame";

const typeIcons: Record<string, any> = {
  study: GraduationCap,
  reading: BookOpen,
  work: Briefcase,
  custom: Sparkles,
};

const CATEGORIES = [
  { value: "all", labelKey: "explore.all_categories" },
  { value: "study", labelKey: "rooms.type_study" },
  { value: "reading", labelKey: "rooms.type_reading" },
  { value: "work", labelKey: "rooms.type_work" },
  { value: "custom", labelKey: "rooms.type_custom" },
];

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type RankingPeriod = "now" | "today" | "week" | "all";

export default function Explore() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rooms");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [period, setPeriod] = useState<RankingPeriod>("now");
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; roomId: string; roomName: string }>({ open: false, roomId: "", roomName: "" });
  const joinPublicRoom = useJoinPublicRoom();

  // Room ranking query
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["publicRoomsRanking", category, search, countryFilter, period],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_public_rooms_ranking_by_period", {
        _period: period,
        _category: category === "all" ? null : category,
        _search: search.trim() || null,
        _country: countryFilter === "all" ? null : countryFilter,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && activeTab === "rooms",
  });

  // User ranking query
  const { data: userRanking = [], isLoading: usersLoading } = useQuery({
    queryKey: ["globalUserRanking", period],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_global_user_ranking", {
        _period: period,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && activeTab === "users",
  });

  const handleJoin = async (room: any) => {
    const { data: hasPassword } = await supabase.rpc("room_has_password", { _room_id: room.room_id });
    if (hasPassword) {
      setPasswordDialog({ open: true, roomId: room.room_id, roomName: room.name });
      return;
    }
    try {
      const roomId = await joinPublicRoom.mutateAsync({ roomId: room.room_id });
      if (roomId) navigate(`/rooms/${roomId}`);
    } catch {
      navigate("/rooms");
    }
  };

  const handlePasswordJoin = async (password: string) => {
    const roomId = await joinPublicRoom.mutateAsync({ roomId: passwordDialog.roomId, password });
    if (roomId) navigate(`/rooms/${roomId}`);
  };

  const getSecondaryMetric = (room: any) => {
    if (period === "today" || period === "week") {
      return { label: t("explore.period_hours"), value: formatHours(room.period_seconds || 0) };
    }
    return { label: t("explore.total_hours"), value: formatHours(room.total_seconds || 0) };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {t("explore.title")}
          </h1>
          <p className="text-muted-foreground">{t("explore.subtitle")}</p>
        </div>

        {/* Main category: Rooms vs Users */}
        <GridNav
          items={[
            { value: "rooms", label: t("explore.tab_rooms"), icon: Users },
            { value: "users", label: t("explore.tab_users"), icon: Trophy },
          ]}
          value={activeTab}
          onChange={setActiveTab}
          columns="grid-cols-2"
          className="max-w-sm"
        />

        {/* Period filter */}
        <GridNav
          items={[
            { value: "now", label: t("explore.tab_now"), icon: Radio },
            { value: "today", label: t("explore.tab_today"), icon: Calendar },
            { value: "week", label: t("explore.tab_week"), icon: CalendarDays },
            { value: "all", label: t("explore.tab_total"), icon: BarChart3 },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as RankingPeriod)}
          columns="grid-cols-4"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden">
            <TabsTrigger value="rooms" />
            <TabsTrigger value="users" />
          </TabsList>

          {/* ── ROOMS TAB ── */}
          <TabsContent value="rooms">
            {/* Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("explore.search_placeholder")}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={category === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategory(cat.value)}
                  >
                    {t(cat.labelKey)}
                  </Button>
                ))}
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder={t("explore.all_countries")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">{t("explore.all_countries")}</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {roomsLoading ? (
              <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">{t("explore.no_public_rooms")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room: any, index: number) => {
                  const Icon = typeIcons[room.room_type] || Sparkles;
                  const isTop3 = index < 3;
                  const medals = ["🥇", "🥈", "🥉"];
                  const flag = getFlagByCode(room.country);
                  const metric = getSecondaryMetric(room);

                  const isPrivate = room.is_public === false;
                  return (
                    <RoomFrame
                      key={room.room_id}
                      background={!isPrivate ? room.room_background : null}
                      rounded="rounded-xl"
                      className={cn("transition-all hover:shadow-md", isPrivate && "opacity-90")}
                    >
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-[inherit] p-4 flex flex-col sm:flex-row sm:items-center gap-4",
                        isTop3 && "ring-1 ring-primary/30"
                      )}
                    >
                      <div className="relative z-10 flex items-center gap-3 sm:w-12 shrink-0">
                        {isTop3 ? (
                          <span className="text-2xl">{medals[index]}</span>
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground w-8 text-center">#{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isPrivate ? (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                          )}
                          {!isPrivate && flag && <span className="text-base shrink-0">{flag}</span>}
                          <h3 className={cn("font-semibold truncate", isPrivate && "italic text-muted-foreground")}>{room.name}</h3>
                          {!isPrivate && index < 10 && (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded-full font-medium shrink-0 flex items-center gap-0.5">
                              <Trophy className="h-3 w-3" /> Top 10
                            </span>
                          )}
                        </div>
                        {!isPrivate && room.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{room.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                        {!isPrivate && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{room.member_count}</span>
                          </div>
                        )}
                        {!isPrivate && (
                          <div className="flex items-center gap-1">
                            <Wifi className="h-3.5 w-3.5 text-green-500" />
                            <span>{room.online_count}</span>
                          </div>
                        )}
                        {room.studying_count > 0 && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <BookOpen className="h-3.5 w-3.5 animate-pulse" />
                            <span>{room.studying_count}</span>
                          </div>
                        )}
                        {!isPrivate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{metric.value}</span>
                          </div>
                        )}
                      </div>
                      {isPrivate ? (
                        <Button size="sm" variant="outline" disabled className="shrink-0">
                          <Lock className="h-3.5 w-3.5 mr-1" /> {t("rooms.private") || "Privada"}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleJoin(room)} className="shrink-0">
                          {t("rooms.join")}
                        </Button>
                      )}
                    </div>
                    </RoomFrame>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── USERS TAB ── */}
          <TabsContent value="users">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("explore.user_ranking_title")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("explore.user_ranking_desc")}</p>
            </div>

            {usersLoading ? (
              <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
            ) : userRanking.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <User className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">{t("explore.no_users_found")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userRanking.map((u: any, index: number) => {
                  const isTop3 = index < 3;
                  const medals = ["🥇", "🥈", "🥉"];
                  const isMe = u.user_id === user?.id;
                  const initials = u.is_anonymous ? "?" : (u.display_name || "U").charAt(0).toUpperCase();

                  return (
                    <div
                      key={u.user_id}
                      className={cn(
                        "relative overflow-hidden rounded-xl border bg-card p-4 flex items-center gap-3 sm:gap-4 transition-all hover:shadow-md",
                        isTop3 && "border-yellow-500/30",
                        isMe && "ring-2 ring-primary/40 bg-primary/5"
                      )}
                    >
                      {/* Position */}
                      <div className="w-8 shrink-0 text-center">
                        {isTop3 ? (
                          <span className="text-2xl">{medals[index]}</span>
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar with plan ring + flair */}
                      <AvatarFlair
                        tier={u.is_anonymous ? "free" : u.plan_tier}
                        flairId={u.avatar_flair}
                        compact
                      >
                        <PlanAvatarRing tier={u.is_anonymous ? "free" : u.plan_tier}>
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                            {u.avatar_url && !u.is_anonymous ? (
                              <AvatarImage src={u.avatar_url} alt={u.display_name || ""} />
                            ) : null}
                            <AvatarFallback className={cn(
                              "text-sm font-bold",
                              u.is_anonymous ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                            )}>
                              {u.is_anonymous ? <Lock className="h-4 w-4" /> : initials}
                            </AvatarFallback>
                          </Avatar>
                        </PlanAvatarRing>
                      </AvatarFlair>

                      {/* Name + badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-semibold truncate",
                            u.is_anonymous && "italic text-muted-foreground"
                          )}>
                            {u.is_anonymous ? t("explore.anonymous_user") : (u.display_name || t("explore.anonymous_user"))}
                          </span>
                          {isMe && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">
                              {t("explore.your_position")}
                            </span>
                          )}
                          {!u.is_anonymous && <PlanBadge tier={u.plan_tier} />}
                        </div>
                        {period === "now" && (
                          <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                            <BookOpen className="h-3 w-3 animate-pulse" />
                            {t("explore.studying_now")}
                          </p>
                        )}
                      </div>

                      {/* Hours */}
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold text-foreground">{formatHours(u.total_seconds || 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <JoinPasswordDialog
        open={passwordDialog.open}
        onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}
        roomName={passwordDialog.roomName}
        onSubmit={handlePasswordJoin}
      />
    </MainLayout>
  );
}
