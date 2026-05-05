import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCategory } from "@/hooks/useAnnualGoals";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];
const ICONS = ["heart", "briefcase", "dollar-sign", "book-open", "users", "dumbbell", "graduation-cap", "sparkles", "rocket", "leaf", "globe", "target"];

interface Props { trigger: React.ReactNode }

export function CreateCategoryDialog({ trigger }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[2]);
  const [icon, setIcon] = useState("target");
  const create = useCreateCategory();

  const handleCreate = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), color, icon });
    setOpen(false);
    setName("");
  };

  const renderIcon = (n: string) => {
    const key = n.split("-").map((w, i) => i === 0 ? w[0].toUpperCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1)).join("");
    const C = (Icons as any)[key] || Icons.Target;
    return <C className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("annual_goals.new_category")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("annual_goals.category_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Health" />
          </div>
          <div>
            <Label>{t("annual_goals.category_color")}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("w-9 h-9 rounded-full border-2 transition-transform", color === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>{t("annual_goals.category_icon")}</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn("h-10 rounded-md border flex items-center justify-center transition-colors", icon === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent")}
                >
                  {renderIcon(i)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!name.trim() || create.isPending}>{t("annual_goals.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
