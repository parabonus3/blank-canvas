import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export function useDirectMessages(friendUserId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["directMessages", user?.id, friendUserId],
    queryFn: async () => {
      if (!user || !friendUserId) return [] as DirectMessage[];
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data || []) as DirectMessage[];
    },
    enabled: !!user && !!friendUserId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user || !friendUserId) return;
    const channel = supabase
      .channel(`dm-${user.id}-${friendUserId}-${crypto.randomUUID()}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
      }, (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === user.id && msg.receiver_id === friendUserId) ||
          (msg.sender_id === friendUserId && msg.receiver_id === user.id)
        ) {
          queryClient.invalidateQueries({ queryKey: ["directMessages", user.id, friendUserId] });
        }
        // Notify if incoming message from someone else
        if (msg.receiver_id === user.id && msg.sender_id !== user.id) {
          queryClient.invalidateQueries({ queryKey: ["unreadDMCount"] });
          queryClient.invalidateQueries({ queryKey: ["unreadDMByUser"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, friendUserId, queryClient]);

  return messagesQuery;
}

export function useSendDirectMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["directMessages", user?.id, vars.receiverId] });
    },
  });
}

export function useMarkDMsAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) return;
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .eq("sender_id", senderId)
        .is("read_at", null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadDMCount"] });
      queryClient.invalidateQueries({ queryKey: ["unreadDMByUser"] });
    },
  });
}

export function useUnreadDMCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unreadDMCount", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useUnreadDMByUser() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unreadDMByUser", user?.id],
    queryFn: async () => {
      if (!user) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("direct_messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .is("read_at", null);
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach((msg: any) => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

// Global DM notification listener — use in a top-level component
export function useDMNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-notifications-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== user.id) {
          queryClient.invalidateQueries({ queryKey: ["unreadDMCount"] });
          queryClient.invalidateQueries({ queryKey: ["unreadDMByUser"] });
          toast.info("💬 New message received");
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("TimeZoni", { body: "You received a new message", icon: "/favicon.ico" });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
}
