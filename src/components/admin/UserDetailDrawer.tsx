import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Shield, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAdminUserDetails, useAdminGrantStreakFreezes } from "@/hooks/useAdmin";

interface Props {
  userId: string | null;
  onClose: () => void;
}

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function UserDetailDrawer({ userId, onClose }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminUserDetails(userId);
  const grantFreezes = useAdminGrantStreakFreezes();

  const [amount, setAmount] = useState<string>("1");
  const [reason, setReason] = useState<string>("");

  const handleGrant = async () => {
    if (!userId) return;
    const amt = parseInt(amount, 10);
    if (!amt || amt < 1) return;
    await grantFreezes.mutateAsync({ user_id: userId, amount: amt, reason: reason || undefined });
    setAmount("1");
    setReason("");
  };

  const purchased = data?.purchased_freezes || { balance: 0, total_purchased: 0, total_used: 0 };

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("admin.user_details")}</SheetTitle>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{data.auth?.email}</span></div>
                <div><span className="text-muted-foreground">{t("admin.name")}:</span> {data.profile?.display_name || "—"}</div>
                <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{data.auth?.id}</code></div>
                {data.profile?.friend_code && (
                  <div><span className="text-muted-foreground">{t("admin.friend_code")}:</span> {data.profile.friend_code}</div>
                )}
                <div><span className="text-muted-foreground">{t("admin.created_at")}:</span> {data.auth?.created_at && format(new Date(data.auth.created_at), "dd/MM/yyyy HH:mm")}</div>
                <div><span className="text-muted-foreground">{t("admin.last_signin")}:</span> {data.auth?.last_sign_in_at ? format(new Date(data.auth.last_sign_in_at), "dd/MM/yyyy HH:mm") : "—"}</div>
                <div><span className="text-muted-foreground">{t("admin.timezone")}:</span> {data.profile?.timezone || "—"}</div>
                {data.profile?.is_banned && (
                  <div className="pt-2">
                    <Badge variant="destructive">{t("admin.banned")}</Badge>
                    {data.profile.banned_reason && (
                      <p className="text-xs text-muted-foreground mt-1">{data.profile.banned_reason}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">{t("admin.total_focus")}</p>
                  <p className="text-xl font-bold">{formatHours(data.total_seconds || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">{t("admin.rooms_joined")}</p>
                  <p className="text-xl font-bold">{data.room_count || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Streak Freezes admin grant */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">{t("admin.streak_freezes.title", "Defensivas (Streak Freezes)")}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">{t("admin.streak_freezes.balance", "Saldo")}</p>
                    <p className="text-lg font-bold text-primary">{purchased.balance}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">{t("admin.streak_freezes.total_purchased", "Total recebido")}</p>
                    <p className="text-lg font-bold">{purchased.total_purchased}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">{t("admin.streak_freezes.total_used", "Usadas")}</p>
                    <p className="text-lg font-bold">{purchased.total_used}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs">{t("admin.streak_freezes.grant", "Conceder defensivas (admin)")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t("admin.streak_freezes.amount", "Quantidade")}
                      className="w-24"
                    />
                    <Button
                      size="sm"
                      onClick={handleGrant}
                      disabled={grantFreezes.isPending || !amount}
                      className="flex-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {grantFreezes.isPending
                        ? t("common.loading", "Carregando...")
                        : t("admin.streak_freezes.grant_button", "Conceder")}
                    </Button>
                  </div>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("admin.streak_freezes.reason", "Motivo (opcional)")}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                {data.freeze_history?.length ? (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground">{t("admin.streak_freezes.history", "Histórico recente")}</p>
                    {data.freeze_history.map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant={h.currency === "admin_grant" ? "secondary" : "outline"} className="text-[10px]">
                            {h.currency === "admin_grant"
                              ? t("admin.streak_freezes.source_admin", "Admin")
                              : t("admin.streak_freezes.source_stripe", "Stripe")}
                          </Badge>
                          <span className="font-medium">+{h.freezes_added}</span>
                        </div>
                        <span className="text-muted-foreground">{format(new Date(h.created_at), "dd/MM/yyyy")}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">{t("admin.recent_tickets")}</p>
                {data.tickets?.length ? (
                  <div className="space-y-2">
                    {data.tickets.map((tk: any) => (
                      <div key={tk.id} className="text-xs border-l-2 border-primary pl-2">
                        <p className="font-medium truncate">{tk.subject}</p>
                        <p className="text-muted-foreground">
                          {tk.status} · {format(new Date(tk.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("admin.no_tickets")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
