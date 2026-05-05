import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAnnualGoal, GoalType, FrequencyPeriod, LifeCategory } from "@/hooks/useAnnualGoals";
import { CheckCircle2, TrendingUp, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  trigger: React.ReactNode;
  year: number;
  categories: LifeCategory[];
  defaultCategoryId?: string | null;
}

export function CreateGoalDialog({ trigger, year, categories, defaultCategoryId }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId || "none");
  const [type, setType] = useState<GoalType>("simple");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("1");
  const [unit, setUnit] = useState("");
  const [frequency, setFrequency] = useState<FrequencyPeriod>("weekly");
  const create = useCreateAnnualGoal();

  const reset = () => {
    setTitle(""); setDescription(""); setTarget("1"); setUnit(""); setType("simple");
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      category_id: categoryId === "none" ? null : categoryId,
      year,
      title: title.trim(),
      description: description.trim() || undefined,
      goal_type: type,
      target_value: type === "simple" ? 1 : Math.max(1, Number(target) || 1),
      unit: unit.trim() || undefined,
      frequency_period: type === "habit" ? frequency : undefined,
    });
    setOpen(false);
    reset();
  };

  const types: { value: GoalType; icon: any; label: string; desc: string }[] = [
    { value: "simple", icon: CheckCircle2, label: t("annual_goals.type_simple"), desc: t("annual_goals.type_simple_desc") },
    { value: "progress", icon: TrendingUp, label: t("annual_goals.type_progress"), desc: t("annual_goals.type_progress_desc") },
    { value: "habit", icon: Repeat, label: t("annual_goals.type_habit"), desc: t("annual_goals.type_habit_desc") },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("annual_goals.new_goal")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("annual_goals.goal_type")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {types.map((tt) => {
                const Icon = tt.icon;
                return (
                  <button
                    key={tt.value}
                    type="button"
                    onClick={() => setType(tt.value)}
                    className={cn("p-3 rounded-lg border text-left transition-colors", type === tt.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}
                  >
                    <Icon className="h-5 w-5 mb-1 text-primary" />
                    <div className="font-medium text-sm">{tt.label}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{tt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>{t("annual_goals.goal_title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 10 books" />
          </div>

          <div>
            <Label>{t("annual_goals.category")}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("annual_goals.no_category")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type !== "simple" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("annual_goals.target")}</Label>
                <Input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <Label>{t("annual_goals.unit")}</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="$, books, km..." />
              </div>
            </div>
          )}

          {type === "habit" && (
            <div>
              <Label>{t("annual_goals.frequency")}</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("annual_goals.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("annual_goals.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{t("annual_goals.description_opt")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!title.trim() || create.isPending}>{t("annual_goals.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
