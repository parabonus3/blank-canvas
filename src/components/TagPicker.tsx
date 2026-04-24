import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTags, useCreateTag, type Tag } from "@/hooks/useTags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Tag as TagIcon } from "lucide-react";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
];

interface TagPickerProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export function TagPicker({ selectedTagIds, onTagsChange }: TagPickerProps) {
  const { t } = useTranslation();
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [open, setOpen] = useState(false);

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const result = await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
    onTagsChange([...selectedTagIds, (result as any).id]);
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
  };

  return (
    <div className="space-y-2">
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs gap-1 pr-1"
              style={{ borderLeft: `3px solid ${tag.color}` }}
            >
              {tag.name}
              <button onClick={() => toggleTag(tag.id)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <TagIcon className="h-3.5 w-3.5" />
            {t("tags.add_tag")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          {/* Existing tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Create new tag */}
          <div className="border-t pt-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("tags.create_tag")}</p>
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={t("tags.name_placeholder")}
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
            />
            <div className="flex gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    newTagColor === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || createTag.isPending}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("tags.create_tag")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
