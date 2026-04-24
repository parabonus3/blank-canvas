import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSupportTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useMyTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useTicketDetail(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-detail", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!ticketId,
  });
}

export function useTicketReplies(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime listener instead of polling
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-replies-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_replies",
        filter: `ticket_id=eq.${ticketId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["ticket-replies", ticketId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId, queryClient]);

  return useQuery({
    queryKey: ["ticket-replies", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_replies")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: { email: string; name: string; subject: string; message: string; category: string; user_id?: string }) => {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert(ticket)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reply: { ticket_id: string; content: string; user_id: string; is_agent: boolean }) => {
      const { data, error } = await supabase
        .from("support_replies")
        .insert(reply)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies", vars.ticket_id] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; priority?: string; assigned_to?: string | null; last_user_read_at?: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["unread-ticket-count"] });
    },
  });
}

export function useUnreadTicketCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-ticket-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("id, last_user_read_at, updated_at")
        .eq("user_id", user.id);
      if (error || !tickets) return 0;

      let count = 0;
      for (const ticket of tickets as any[]) {
        const readAt = ticket.last_user_read_at;
        if (!readAt || new Date(ticket.updated_at) > new Date(readAt)) {
          const { count: replyCount } = await supabase
            .from("support_replies")
            .select("id", { count: "exact", head: true })
            .eq("ticket_id", ticket.id)
            .eq("is_agent", true)
            .gt("created_at", readAt || "1970-01-01");
          if ((replyCount || 0) > 0) count++;
        }
      }
      return count;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useMarkTicketRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ last_user_read_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-ticket-count"] });
    },
  });
}
