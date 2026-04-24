import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTicketDetail, useUpdateTicket, useMarkTicketRead } from "@/hooks/useSupportTickets";
import { useIsSupportAgent, useTicketUserInfo } from "@/hooks/useSupportAgents";
import { SacLayout } from "@/components/sac/SacLayout";
import { TicketChat } from "@/components/sac/TicketChat";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/sac/TicketStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { User, Mail, Calendar, Clock } from "lucide-react";

export default function TicketDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: ticket, isLoading } = useTicketDetail(id);
  const { isAgent } = useIsSupportAgent();
  const updateTicket = useUpdateTicket();
  const markRead = useMarkTicketRead();
  const { data: userInfo } = useTicketUserInfo(isAgent && ticket?.user_id ? ticket.user_id : null);

  // Mark ticket as read when user opens it
  useEffect(() => {
    if (ticket && user && ticket.user_id === user.id && !isAgent) {
      markRead.mutate(ticket.id);
    }
  }, [ticket?.id, user?.id]);

  if (isLoading) return <SacLayout><p className="text-muted-foreground">{t("common.loading")}</p></SacLayout>;
  if (!ticket) return <SacLayout><p className="text-muted-foreground">{t("support.ticket_not_found")}</p></SacLayout>;

  const handleStatusChange = (status: string) => {
    updateTicket.mutate({ id: ticket.id, status });
  };

  const handlePriorityChange = (priority: string) => {
    updateTicket.mutate({ id: ticket.id, priority });
  };

  return (
    <SacLayout>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chat */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-8rem)] max-h-[600px] lg:max-h-none">
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{ticket.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground">{ticket.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <TicketStatusBadge status={ticket.status} />
                    {isAgent && <TicketPriorityBadge priority={ticket.priority} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-5rem)]">
                {/* Initial message */}
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="h-[calc(100%-4rem)]">
                  <TicketChat ticketId={ticket.id} isAgent={isAgent} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar info - agent only */}
          {isAgent && (
            <div className="space-y-4">
              {/* Actions */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{t("support.actions")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">{t("support.status")}</label>
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("support.status_open")}</SelectItem>
                        <SelectItem value="in_progress">{t("support.status_in_progress")}</SelectItem>
                        <SelectItem value="resolved">{t("support.status_resolved")}</SelectItem>
                        <SelectItem value="closed">{t("support.status_closed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("support.priority")}</label>
                    <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("support.priority_low")}</SelectItem>
                        <SelectItem value="normal">{t("support.priority_normal")}</SelectItem>
                        <SelectItem value="high">{t("support.priority_high")}</SelectItem>
                        <SelectItem value="urgent">{t("support.priority_urgent")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* User info */}
              {userInfo?.profile && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{t("support.customer_info")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{userInfo.profile.display_name || t("support.no_name")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{ticket.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t("support.member_since")} {format(new Date(userInfo.profile.created_at), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{Math.round(userInfo.total_seconds / 3600)}h {t("support.total_time")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("support.plan")}:</span>
                      <span className="font-medium capitalize">{userInfo.profile.plan_tier}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </SacLayout>
  );
}
