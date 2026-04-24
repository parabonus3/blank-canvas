import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pin, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  roomId: string;
  message: string | null;
  isOwner: boolean;
}

export function PinnedMessage({ roomId, message, isOwner }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(message || "");

  const save = async () => {
    const trimmed = value.trim();
    await supabase
      .from("study_rooms")
      .update({ pinned_message: trimmed || null })
      .eq("id", roomId);
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    setEditing(false);
  };

  const remove = async () => {
    await supabase
      .from("study_rooms")
      .update({ pinned_message: null })
      .eq("id", roomId);
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    setValue("");
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <Pin className="h-4 w-4 text-primary shrink-0" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("rooms.pin_placeholder")}
          className="flex-1 h-8"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" onClick={save}>
          {t("common.save")}
        </Button>
      </div>
    );
  }

  if (!message && !isOwner) return null;

  if (!message && isOwner) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Pin className="h-4 w-4" />
        {t("rooms.add_pinned")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <Pin className="h-4 w-4 text-primary shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {isOwner && (
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setValue(message || ""); setEditing(true); }}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={remove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
