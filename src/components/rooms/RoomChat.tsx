import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRoomMessages, useSendMessage } from "@/hooks/useRoomMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Lock, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { playMessageSent } from "@/lib/soundEffects";
import { supabase } from "@/integrations/supabase/client";
import { MessageBody } from "./MessageBody";
import { RoomChatComposer } from "./RoomChatComposer";

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

export function RoomChat({
  roomId, memberProfiles, chatMode = "open", myRole = "member",
  isMuted = false, notificationsEnabled = true, joinedAt,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: messages = [] } = useRoomMessages(roomId, { notificationsEnabled, joinedAt });
  const sendMessage = useSendMessage();

  // draft per room
  const draftKey = `room-chat-draft:${roomId}`;
  const [input, setInput] = useState<string>(() => {
    try { return localStorage.getItem(draftKey) || ""; } catch { return ""; }
  });
  useEffect(() => {
    try {
      if (input) localStorage.setItem(draftKey, input);
      else localStorage.removeItem(draftKey);
    } catch { /* ignore */ }
  }, [input, draftKey]);
  // reset when switching rooms
  useEffect(() => {
    try { setInput(localStorage.getItem(`room-chat-draft:${roomId}`) || ""); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const nearBottomRef = useRef(true);
  const didInitialScrollRef = useRef(false);
  const lastMsgCountRef = useRef(0);

  // Typing indicator via Realtime Broadcast
  useEffect(() => {
    if (!roomId || !user) return;
    const channel = supabase.channel(`typing-${roomId}`);
    channel.on("broadcast", { event: "typing" }, (payload: any) => {
      const typerId = payload.payload?.user_id;
      const typerName = payload.payload?.display_name;
      if (typerId && typerId !== user.id && typerName) {
        setTypingUsers(prev => (prev.includes(typerName) ? prev : [...prev, typerName]));
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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = viewportRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    });
  }, []);

  // Track if user is near bottom
  const handleScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance <= 120;
    nearBottomRef.current = near;
    if (near && unreadCount > 0) setUnreadCount(0);
  }, [unreadCount]);

  // Initial scroll when messages first arrive
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      lastMsgCountRef.current = messages.length;
      scrollToBottom("auto");
      return;
    }
    // New message arrived
    if (messages.length > lastMsgCountRef.current) {
      const delta = messages.length - lastMsgCountRef.current;
      lastMsgCountRef.current = messages.length;
      const last = messages[messages.length - 1];
      const isMine = last?.user_id === user?.id;
      if (isMine || nearBottomRef.current) {
        scrollToBottom("smooth");
      } else {
        setUnreadCount(c => c + delta);
      }
    } else {
      lastMsgCountRef.current = messages.length;
    }
  }, [messages, scrollToBottom, user?.id]);

  // Reset init flag on room change
  useEffect(() => {
    didInitialScrollRef.current = false;
    lastMsgCountRef.current = 0;
    setUnreadCount(0);
    nearBottomRef.current = true;
  }, [roomId]);

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
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    // scroll after send
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const handleTyping = useCallback(() => {
    if (!canSend) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    broadcastTyping();
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  }, [broadcastTyping, canSend]);

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

  const membersForMention = useMemo(() => {
    if (!memberProfiles) return [];
    return Array.from(memberProfiles.entries()).map(([user_id, p]) => ({
      user_id, display_name: p?.display_name,
    })).filter(m => m.display_name);
  }, [memberProfiles]);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      <div className="px-4 py-2 border-b shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {t("rooms.chat")}
          {messages.length > 0 && (
            <span className="ml-auto text-[10px] font-normal text-muted-foreground">
              {messages.length}
            </span>
          )}
        </h3>
      </div>

      {/* Scrollable viewport — plain div (not Radix ScrollArea) */}
      <div className="flex-1 relative min-h-0">
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain p-3 sm:p-4"
        >
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("rooms.no_messages")}
                </p>
              </div>
            )}
            {groupedMessages.map((group) => (
              <div key={group.date} className="space-y-1.5">
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
                  const fullTs = format(new Date(msg.created_at), "dd/MM/yyyy HH:mm");

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
                      <div className={cn("flex flex-col max-w-[85%] sm:max-w-[75%]", isMe && "items-end")}>
                        {!isConsecutive && (
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-medium text-muted-foreground">
                              {isMe ? t("rooms.you") : msg.display_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50" title={fullTs}>
                              {format(new Date(msg.created_at), "HH:mm")}
                            </span>
                          </div>
                        )}
                        <div
                          title={fullTs}
                          className={cn(
                            "rounded-xl px-3 py-2",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm",
                            isConsecutive && isMe && "rounded-tr-xl",
                            isConsecutive && !isMe && "rounded-tl-xl"
                          )}
                        >
                          <MessageBody content={msg.content} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Unread pill */}
        {unreadCount > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <Button
              size="sm"
              onClick={() => { scrollToBottom("smooth"); setUnreadCount(0); }}
              className="h-8 rounded-full shadow-lg gap-1.5 px-3"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {unreadCount} {t("chat.new_messages", "novas")}
            </Button>
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && canSend && (
        <div className="px-3 py-1 border-t flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className="typing-dots flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
          </span>
          <span>{typingUsers.slice(0, 2).join(", ")} {t("rooms.is_typing")}</span>
        </div>
      )}

      {canSend ? (
        <RoomChatComposer
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onTyping={handleTyping}
          placeholder={t("rooms.message_placeholder")}
          members={membersForMention}
        />
      ) : (
        <div className="p-3 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground shrink-0">
          <Lock className="h-4 w-4" />
          {isMuted ? t("rooms.you_are_muted") : t("rooms.chat_restricted")}
        </div>
      )}
    </div>
  );
}
