import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast as sonnerToast } from "sonner";

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useFriendships() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const friendsQuery = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: async () => {
      if (!user) return [] as Friendship[];
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Friendship[];
    },
    enabled: !!user,
  });

  // Realtime subscription is centralized in `useFriendshipsRealtime` (mounted once in App.tsx)
  // to avoid duplicate channel names when this hook is used by multiple components simultaneously.

  const accepted = (friendsQuery.data || []).filter(f => f.status === "accepted");
  const pendingReceived = (friendsQuery.data || []).filter(
    f => f.status === "pending" && f.addressee_id === user?.id
  );
  const pendingSent = (friendsQuery.data || []).filter(
    f => f.status === "pending" && f.requester_id === user?.id
  );

  const getFriendUserId = (friendship: Friendship) => {
    if (!user) return "";
    return friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id;
  };

  return { ...friendsQuery, accepted, pendingReceived, pendingSent, getFriendUserId };
}

export function useFriendProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ["friendProfiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const results = await Promise.all(
        userIds.map(async (uid) => {
          const { data } = await supabase.rpc("get_member_public_stats", { _user_id: uid });
          const profileData = data?.[0];
          return profileData ? { ...profileData, user_id: uid } : null;
        })
      );
      return results.filter(Boolean);
    },
    enabled: userIds.length > 0,
  });
}

export function useSendFriendRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: addresseeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
      toast({ title: "✅", description: t("friends.request_sent") });
    },
    onError: (err: any) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "rejected" }) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    },
    onError: (err: any) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendships"] });
    },
  });
}

// Global realtime subscription for friendships. Mount once in App.tsx.
export function useFriendshipsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`friendships-rt-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["friendships"] });
        if (payload.eventType === "INSERT") {
          const row = payload.new as any;
          if (row.addressee_id === user.id && row.status === "pending") {
            sonnerToast.info("👋 New friend request!");
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("TimeZoni", { body: "You received a friend request!", icon: "/favicon.ico" });
            }
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
}
