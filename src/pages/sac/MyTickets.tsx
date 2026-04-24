import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMyTickets } from "@/hooks/useSupportTickets";
import { SacLayout } from "@/components/sac/SacLayout";
import { TicketStatusBadge } from "@/components/sac/TicketStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function MyTickets() {
  const { t } = useTranslation();
  const { data: tickets = [], isLoading } = useMyTickets();

  return (
    <SacLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t("support.my_tickets")}</h1>
          <Link to="/sac/new">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t("support.new_ticket")}</Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : tickets.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("support.no_tickets")}</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket: any) => {
              const hasUnread = ticket.last_user_read_at
                ? new Date(ticket.updated_at) > new Date(ticket.last_user_read_at)
                : ticket.status !== "open"; // if never read and has been updated
              return (
                <Link key={ticket.id} to={`/sac/tickets/${ticket.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {hasUnread && (
                            <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-blue-500" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{ticket.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <TicketStatusBadge status={ticket.status} />
                          <span className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), "dd/MM")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </SacLayout>
  );
}
