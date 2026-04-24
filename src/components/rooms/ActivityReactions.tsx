import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const REACTION_EMOJIS = ["🔥", "👏", "💪", "❤️"];

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Props {
  activityId: string;
  reactions: Reaction[];
  onReactionChange: () => void;
}

export function ActivityReactions({ activityId, reactions, onReactionChange }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggleReaction = async (emoji: string) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const existing = reactions.find(r => r.emoji === emoji && r.hasReacted);
      if (existing) {
        await supabase
          .from("activity_reactions" as any)
          .delete()
          .eq("activity_id", activityId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("activity_reactions" as any)
          .insert({ activity_id: activityId, user_id: user.id, emoji } as any);
      }
      onReactionChange();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {REACTION_EMOJIS.map((emoji) => {
        const reaction = reactions.find(r => r.emoji === emoji);
        const count = reaction?.count || 0;
        const hasReacted = reaction?.hasReacted || false;

        return (
          <button
            key={emoji}
            onClick={() => handleToggleReaction(emoji)}
            className={cn(
              "inline-flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 transition-all hover:scale-110",
              hasReacted
                ? "bg-primary/15 ring-1 ring-primary/30"
                : "hover:bg-muted",
              count > 0 ? "opacity-100" : "opacity-40 hover:opacity-70"
            )}
          >
            <span className="text-[11px]">{emoji}</span>
            {count > 0 && <span className="text-[10px] font-medium tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
