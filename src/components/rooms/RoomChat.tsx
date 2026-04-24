import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRoomMessages, useSendMessage } from "@/hooks/useRoomMessages";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { playMessageSent } from "@/lib/soundEffects";
import { supabase } from "@/integrations/supabase/client";

function getAvatarColor(userId: string) {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500",
    "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getDateLabel(dateStr: string, t: any) {
  const date = new Date(dateStr);
  if (isToday(date)) return t("rooms.today");
  if (isYesterday(date)) return t("rooms.yesterday");
  return format(date, "dd/MM/yyyy");
}

interface Props {
  roomId: string;
  memberProfiles?: Map<string, { display_name?: string; avatar_url?: string }>;
  chatMode?: string;
  myRole?: string;
  isMuted?: boolean;
  notificationsEnabled?: boolean;
  joinedAt?: string;
}

export function RoomChat({ roomId, memberProfiles, chatMode = "open", myRole = "member", isMuted = false, notificationsEnabled = true, joinedAt }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: messages = [] } = useRoomMessages(roomId, { notificationsEnabled, joinedAt });
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<any>(null);

  // Typing indicator via Realtime Broadcast
  useEffect(() => {
    if (!roomId || !user) return;
    const channel = supabase.channel(`typing-${roomId}`);
    
    channel.on("broadcast", { event: "typing" }, (payload: any) => {
      const typerId = payload.payload?.user_id;
      const typerName = payload.payload?.display_name;
      if (typerId && typerId !== user.id && typerName) {
        setTypingUsers(prev => {
          if (!prev.includes(typerName)) return [...prev, typerName];
          return prev;
        });
        // Remove after 3s
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(n => n !== typerName));
        }, 3000);
      }
    }).subscribe();
    
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomId, user]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    const profile = memberProfiles?.get(user.id);
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id, display_name: profile?.display_name || "User" },
    });
  }, [user, memberProfiles]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Determine if user can send messages
  const canSend = useMemo(() => {
    if (isMuted) return false;
    if (chatMode === "owner_only" && myRole !== "owner") return false;
    if (chatMode === "moderators_only" && myRole !== "owner" && myRole !== "moderator") return false;
    return true;
  }, [chatMode, myRole, isMuted]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !canSend) return;
    sendMessage.mutate({ roomId, content: trimmed });
    playMessageSent();
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (canSend) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      broadcastTyping();
      typingTimeoutRef.current = setTimeout(() => {}, 2000);
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: typeof messages }[] = [];
    let currentDate = "";
    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {t("rooms.chat")}
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("rooms.no_messages")}
              </p>
            </div>
          )}
          {groupedMessages.map((group) => (
            <div key={group.date} className="space-y-2">
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground/60 font-medium px-2">
                  {getDateLabel(group.date, t)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {group.messages.map((msg, idx) => {
                const isMe = msg.user_id === user?.id;
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const isConsecutive = prevMsg?.user_id === msg.user_id;
                const profile = memberProfiles?.get(msg.user_id);
                const avatarUrl = profile?.avatar_url;

                return (
                  <div key={msg.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                    <div className="w-7 shrink-0">
                      {!isConsecutive && !isMe && (
                        <Avatar className="h-7 w-7">
                          {avatarUrl && <AvatarImage src={avatarUrl} />}
                          <AvatarFallback className={cn("text-[10px] text-white", getAvatarColor(msg.user_id))}>
                            {getInitials(msg.display_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <div className={cn("flex flex-col max-w-[75%]", isMe && "items-end")}>
                      {!isConsecutive && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            {isMe ? t("rooms.you") : msg.display_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-sm break-words",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm",
                          isConsecutive && isMe && "rounded-tr-xl",
                          isConsecutive && !isMe && "rounded-tl-xl"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {canSend ? (
        <>
          <div className="px-3 pt-1 flex gap-1">
            {["👏", "🔥", "💪", "📚", "🎯", "❤️"].map((emoji) => (
              <button
                key={emoji}
                className="text-lg hover:scale-125 transition-transform"
                onClick={() => sendMessage.mutate({ roomId, content: emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-3 py-1.5 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="typing-dots flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
              </span>
              <span>{typingUsers.slice(0, 2).join(", ")} {t("rooms.is_typing")}</span>
            </div>
          )}
          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t("rooms.message_placeholder")}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="p-3 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          {isMuted ? t("rooms.you_are_muted") : t("rooms.chat_restricted")}
        </div>
      )}
    </div>
  );
}
