import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { SacLayout } from "@/components/sac/SacLayout";
import { TicketFilters } from "@/components/sac/TicketFilters";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/sac/TicketStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { toast } from "sonner";

export default function SacDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: tickets = [], isLoading } = useSupportTickets();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Realtime: listen for new tickets and replies
  useEffect(() => {
    const channel = supabase
      .channel("sac-dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        toast.info(t("support.new_ticket_received"));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_replies" }, (payload: any) => {
        if (!payload.new?.is_agent) {
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
          toast.info(t("support.new_reply_received"));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, t]);

  const stats = useMemo(() => {
    const open = tickets.filter((t: any) => t.status === "open").length;
    const inProgress = tickets.filter((t: any) => t.status === "in_progress").length;
    const today = new Date().toDateString();
    const resolvedToday = tickets.filter((t: any) => t.status === "resolved" && new Date(t.updated_at).toDateString() === today).length;
    const avgWait = tickets.filter((t: any) => t.status === "open").reduce((sum: number, t: any) => {
      return sum + differenceInMinutes(new Date(), new Date(t.created_at));
    }, 0) / (open || 1);
    return { open, inProgress, resolvedToday, avgWait: Math.round(avgWait) };
  }, [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((t: any) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      return true;
    });
  }, [tickets, filterStatus, filterPriority, filterCategory]);

  const sorted = useMemo(() => {
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return [...filtered].sort((a: any, b: any) => {
      if (a.status === "closed" && b.status !== "closed") return 1;
      if (b.status === "closed" && a.status !== "closed") return -1;
      const pA = priorityOrder[a.priority] ?? 2;
      const pB = priorityOrder[b.priority] ?? 2;
      if (pA !== pB) return pA - pB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [filtered]);

  return (
    <SacLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("support.dashboard")}</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <Ticket className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold">{stats.open}</p>
              <p className="text-xs text-muted-foreground">{t("support.status_open")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">{t("support.status_in_progress")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold">{stats.resolvedToday}</p>
              <p className="text-xs text-muted-foreground">{t("support.resolved_today")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{stats.avgWait}<span className="text-sm font-normal">m</span></p>
              <p className="text-xs text-muted-foreground">{t("support.avg_wait")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TicketFilters
          status={filterStatus}
          priority={filterPriority}
          category={filterCategory}
          onStatusChange={setFilterStatus}
          onPriorityChange={setFilterPriority}
          onCategoryChange={setFilterCategory}
        />

        {/* Ticket queue */}
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : sorted.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("support.no_tickets")}</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {sorted.map((ticket: any) => (
              <Link key={ticket.id} to={`/sac/tickets/${ticket.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TicketPriorityBadge priority={ticket.priority} />
                          <TicketStatusBadge status={ticket.status} />
                        </div>
                        <p className="font-medium text-sm truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.email} · {t(`support.cat_${ticket.category}`)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(ticket.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SacLayout>
  );
}
