import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminUserDetails } from "@/hooks/useAdmin";

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
