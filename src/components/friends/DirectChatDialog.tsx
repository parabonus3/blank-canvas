import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDirectMessages, useSendDirectMessage, useMarkDMsAsRead } from "@/hooks/useDirectMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_LIST = [
  "😀","😂","🥰","😍","😎","🤩","😇","🤔","😅","😢",
  "😤","🥳","🎉","👏","🙌","💪","🔥","❤️","💯","👍",
  "👎","🙏","✨","⭐","🌟","💡","📚","✅","❌","⏰",
  "🎯","🏆","🚀","💻","📝","☕","🧠","👀","😴","🤯",
  "💬","🎵","🌈","🍕","🎮","📈","💎","🌙","☀️","🤝",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendUserId: string;
  friendName: string;
}

export function DirectChatDialog({ open, onOpenChange, friendUserId, friendName }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: messages = [] } = useDirectMessages(open ? friendUserId : null);
  const sendMessage = useSendDirectMessage();
  const markAsRead = useMarkDMsAsRead();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Mark messages as read when opening
  useEffect(() => {
    if (open && friendUserId) {
      markAsRead.mutate(friendUserId);
    }
  }, [open, friendUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({ receiverId: friendUserId, content: text.trim() });
    setText("");
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    setEmojiOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col h-[85vh] sm:h-[70vh] max-h-[600px]">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>{friendName}</DialogTitle>
          <DialogDescription className="sr-only">{t("friends.type_message")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
          <div className="space-y-2 py-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("friends.no_messages")}
              </p>
            )}
            {messages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}>
                    {msg.content}
                    <div className={cn(
                      "text-[10px] mt-0.5",
                      isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-3 border-t flex gap-2 items-center pb-[env(safe-area-inset-bottom,12px)]">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2" side="top" align="start">
              <div className="grid grid-cols-10 gap-0.5">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("friends.type_message")}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!text.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
