import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTicketReplies, useReplyToTicket } from "@/hooks/useSupportTickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { format } from "date-fns";

interface Props {
  ticketId: string;
  isAgent: boolean;
}

export function TicketChat({ ticketId, isAgent }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: replies = [] } = useTicketReplies(ticketId);
  const replyMutation = useReplyToTicket();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  const handleSend = () => {
    if (!message.trim() || !user) return;
    replyMutation.mutate({
      ticket_id: ticketId,
      content: message.trim(),
      user_id: user.id,
      is_agent: isAgent,
    });
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {replies.map((r: any) => (
          <div
            key={r.id}
            className={`flex ${r.is_agent ? "justify-start" : "justify-end"}`}
          >
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              r.is_agent
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground"
            }`}>
              <p className="whitespace-pre-wrap">{r.content}</p>
              <span className="block text-[10px] opacity-60 mt-1">
                {r.is_agent ? t("support.agent") : t("support.you")} · {format(new Date(r.created_at), "HH:mm")}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("support.type_message")}
          className="min-h-[40px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || replyMutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
