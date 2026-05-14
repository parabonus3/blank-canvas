import { MainLayout } from "@/components/layout/MainLayout";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AMBIENT_SOUNDS } from "@/lib/sounds";
import { Music, Volume2, Timer, Globe, Camera, User, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGroupedTimezones, getTimezoneLabel, formatInTimezone } from "@/lib/timezone";
import { getDateLocale } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarFlairPicker } from "@/components/settings/AvatarFlairPicker";

import { AvatarCropDialog } from "@/components/settings/AvatarCropDialog";

const groupedTimezones = getGroupedTimezones();

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [reminderInterval, setReminderInterval] = useState("60");
  const [reminderSound, setReminderSound] = useState(true);
  const [reminderNotification, setReminderNotification] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isStatsPublic, setIsStatsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  
  // Configurações de som ambiente
  const [ambientSound, setAmbientSound] = useState<string | null>(null);
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [autoplayOnTimer, setAutoplayOnTimer] = useState(false);

  // Configurações Pomodoro
  const [pomodoroWorkDuration, setPomodoroWorkDuration] = useState(25);
  const [pomodoroShortBreak, setPomodoroShortBreak] = useState(5);
  const [pomodoroLongBreak, setPomodoroLongBreak] = useState(15);
  const [pomodoroCyclesBeforeLong, setPomodoroCyclesBeforeLong] = useState(4);
  const [pomodoroAutoStartBreaks, setPomodoroAutoStartBreaks] = useState(false);
  const [pomodoroAutoStartWork, setPomodoroAutoStartWork] = useState(false);

  // Timezone
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [currentTime, setCurrentTime] = useState("");

  // Detect checkout success or portal return
  useEffect(() => {
    const isCheckoutSuccess = searchParams.get("checkout") === "success";
    const isPortalReturn = searchParams.get("portal") === "returned";
    
    if (isCheckoutSuccess || isPortalReturn) {
      refreshSubscription();
      if (isCheckoutSuccess) {
        toast({
          title: t("pricing.checkout_success_title"),
          description: t("pricing.checkout_success"),
        });
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setReminderInterval(String(profile.reminder_interval));
      setReminderSound(profile.reminder_sound);
      setReminderNotification(profile.reminder_notification);
      setAmbientSound(profile.ambient_sound);
      setAmbientVolume(profile.ambient_volume ?? 0.5);
      setAutoplayOnTimer(profile.autoplay_on_timer ?? false);
      setTimezone((profile as any).timezone || "America/Sao_Paulo");
      setAvatarUrl(profile.avatar_url || null);
      setIsStatsPublic(profile.is_stats_public ?? false);
      
      // Pomodoro settings
      setPomodoroWorkDuration(profile.pomodoro_work_duration ?? 25);
      setPomodoroShortBreak(profile.pomodoro_short_break ?? 5);
      setPomodoroLongBreak(profile.pomodoro_long_break ?? 15);
      setPomodoroCyclesBeforeLong(profile.pomodoro_cycles_before_long ?? 4);
      setPomodoroAutoStartBreaks(profile.pomodoro_auto_start_breaks ?? false);
      setPomodoroAutoStartWork(profile.pomodoro_auto_start_work ?? false);
    }
  }, [profile]);

  // Update current time display every second
  useEffect(() => {
    const updateTime = () => {
      const locale = getDateLocale(i18n.language);
      setCurrentTime(formatInTimezone(new Date(), "HH:mm:ss - EEEE, d MMMM yyyy", { timezone, locale }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone, i18n.language]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset input value so same file can be picked again
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: t("settings.invalid_image"), variant: "destructive" });
      return;
    }

    setPendingFile(file);
    setCropOpen(true);
  };

  const uploadCroppedAvatar = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCache);

      await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCache } as any)
        .eq("user_id", user.id);

      toast({ title: t("settings.avatar_updated") });
      setCropOpen(false);
      setPendingFile(null);
    } catch (err: any) {
      toast({ title: t("settings.avatar_error"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateProfile.mutate({
      display_name: displayName || null,
      reminder_interval: parseInt(reminderInterval),
      reminder_sound: reminderSound,
      reminder_notification: reminderNotification,
      ambient_sound: ambientSound,
      ambient_volume: ambientVolume,
      autoplay_on_timer: autoplayOnTimer,
      pomodoro_work_duration: pomodoroWorkDuration,
      pomodoro_short_break: pomodoroShortBreak,
      pomodoro_long_break: pomodoroLongBreak,
      pomodoro_cycles_before_long: pomodoroCyclesBeforeLong,
      pomodoro_auto_start_breaks: pomodoroAutoStartBreaks,
      pomodoro_auto_start_work: pomodoroAutoStartWork,
      timezone,
      is_stats_public: isStatsPublic,
    } as any);
  };

  const selectedSound = AMBIENT_SOUNDS.find(s => s.id === ambientSound);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        {/* Profile with Avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>{t('settings.profile_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t('settings.avatar')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.avatar_desc')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? t('common.loading') : t('settings.change_photo')}
                </Button>
              </div>
            </div>

            <div>
              <Label>{t('settings.email')}</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div>
              <Label>{t('settings.display_name')}</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('settings.display_name_placeholder')} />
            </div>
          </CardContent>
        </Card>

        {/* Avatar Flair Picker (Pro/Premium animated effects, Discord-style) */}
        <AvatarFlairPicker displayName={displayName} avatarUrl={avatarUrl} />

        {/* Profile Background (wallpaper) Picker — visible to all, gated by tier */}
        <ProfileBackgroundPicker />

        {/* Avatar crop dialog (zoom + reposition before upload) */}
        <AvatarCropDialog
          open={cropOpen}
          file={pendingFile}
          saving={uploading}
          onCancel={() => { setCropOpen(false); setPendingFile(null); }}
          onConfirm={uploadCroppedAvatar}
        />

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('settings.privacy')}
            </CardTitle>
            <CardDescription>{t('settings.privacy_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.public_stats')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.public_stats_desc')}</p>
              </div>
              <Switch checked={isStatsPublic} onCheckedChange={setIsStatsPublic} />
            </div>
          </CardContent>
        </Card>

        {/* Date & Time / Timezone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.date_time')}
            </CardTitle>
            <CardDescription>{t('settings.date_time_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('settings.timezone')}</Label>
              <p className="text-sm text-muted-foreground mb-2">{t('settings.timezone_desc')}</p>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue>
                    {getTimezoneLabel(timezone)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(groupedTimezones).sort(([a], [b]) => a.localeCompare(b)).map(([region, tzList]) => (
                    <div key={region}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {region}
                      </div>
                      {tzList.map(tz => (
                        <SelectItem key={tz} value={tz}>
                          {getTimezoneLabel(tz)}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-lg bg-muted/50 p-3">
              <Label className="text-xs text-muted-foreground">{t('settings.current_time')}</Label>
              <p className="text-lg font-mono font-semibold mt-1">{currentTime}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.reminders')}</CardTitle>
            <CardDescription>{t('settings.reminders_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>{t('settings.reminder_interval')}</Label>
              <Select value={reminderInterval} onValueChange={setReminderInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">{t('settings.minutes_30')}</SelectItem>
                  <SelectItem value="60">{t('settings.hour_1')}</SelectItem>
                  <SelectItem value="120">{t('settings.hours_2')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.sound')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.sound_desc')}</p>
              </div>
              <Switch checked={reminderSound} onCheckedChange={setReminderSound} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.notification')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.notification_desc')}</p>
              </div>
              <Switch checked={reminderNotification} onCheckedChange={setReminderNotification} />
            </div>
          </CardContent>
        </Card>

        {/* Pomodoro Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              🍅 {t('settings.pomodoro')}
            </CardTitle>
            <CardDescription>{t('settings.pomodoro_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('settings.focus_duration')}</Label>
                <Input type="number" min={1} max={120} value={pomodoroWorkDuration} onChange={e => setPomodoroWorkDuration(parseInt(e.target.value) || 25)} />
              </div>
              <div>
                <Label>{t('settings.short_break_duration')}</Label>
                <Input type="number" min={1} max={60} value={pomodoroShortBreak} onChange={e => setPomodoroShortBreak(parseInt(e.target.value) || 5)} />
              </div>
              <div>
                <Label>{t('settings.long_break_duration')}</Label>
                <Input type="number" min={1} max={120} value={pomodoroLongBreak} onChange={e => setPomodoroLongBreak(parseInt(e.target.value) || 15)} />
              </div>
              <div>
                <Label>{t('settings.cycles_before_long')}</Label>
                <Input type="number" min={1} max={10} value={pomodoroCyclesBeforeLong} onChange={e => setPomodoroCyclesBeforeLong(parseInt(e.target.value) || 4)} />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.auto_start_breaks')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.auto_start_breaks_desc')}</p>
              </div>
              <Switch checked={pomodoroAutoStartBreaks} onCheckedChange={setPomodoroAutoStartBreaks} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.auto_start_focus')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.auto_start_focus_desc')}</p>
              </div>
              <Switch checked={pomodoroAutoStartWork} onCheckedChange={setPomodoroAutoStartWork} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              {t('settings.ambient_sounds')}
            </CardTitle>
            <CardDescription>{t('settings.ambient_sounds_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>{t('settings.default_sound')}</Label>
              <p className="text-sm text-muted-foreground mb-2">{t('settings.default_sound_desc')}</p>
              <Select value={ambientSound || "none"} onValueChange={(v) => setAmbientSound(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.none')}>
                    {selectedSound ? (
                      <span className="flex items-center gap-2">
                        <span>{selectedSound.icon}</span>
                        <span>{t(selectedSound.nameKey)}</span>
                      </span>
                    ) : (
                      t('settings.none')
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('settings.none')}</SelectItem>
                  {AMBIENT_SOUNDS.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      <span className="flex items-center gap-2">
                        <span>{sound.icon}</span>
                        <span>{t(sound.nameKey)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  {t('settings.default_volume')}
                </Label>
                <span className="text-sm text-muted-foreground">{Math.round(ambientVolume * 100)}%</span>
              </div>
              <Slider
                value={[ambientVolume]}
                onValueChange={(v) => setAmbientVolume(v[0])}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.auto_start')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.auto_start_desc')}</p>
              </div>
              <Switch 
                checked={autoplayOnTimer} 
                onCheckedChange={setAutoplayOnTimer}
                disabled={!ambientSound}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={updateProfile.isPending} className="w-full">
          {updateProfile.isPending ? t('settings.saving') : t('settings.save_settings')}
        </Button>
      </div>
    </MainLayout>
  );
}
