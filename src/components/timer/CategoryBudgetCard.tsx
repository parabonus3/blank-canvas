import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useProjects";
import {
  useCategoryBudgets, useWeekMinutesByCategory, useUpsertCategoryBudget,
} from "@/hooks/useCategoryBudgets";
import { cn } from "@/lib/utils";

function fmtH(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

/** Orçamento semanal de horas por categoria, com barras de consumo. */
export function CategoryBudgetCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useCategoryBudgets();
  const { data: weekMinutes } = useWeekMinutesByCategory();
  const upsert = useUpsertCategoryBudget();

  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const openEditor = () => {
    const next: Record<string, string> = {};
    categories.forEach((c) => {
      const b = budgets.find((x) => x.category_id === c.id);
      next[c.id] = b ? String(Math.round(b.weekly_minutes / 60 * 10) / 10) : "";
    });
    setDrafts(next);
    setOpen(true);
  };

  const save = async () => {
    for (const c of categories) {
      const raw = (drafts[c.id] ?? "").replace(",", ".").trim();
      const hours = raw === "" ? 0 : Number(raw);
      const minutes = Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 0;
      const current = budgets.find((x) => x.category_id === c.id)?.weekly_minutes || 0;
      if (minutes !== current) {
        await upsert.mutateAsync({ category_id: c.id, weekly_minutes: minutes });
      }
    }
    setOpen(false);
  };

  const rows = budgets
    .map((b) => {
      const category = categories.find((c) => c.id === b.category_id);
      if (!category) return null;
      const used = weekMinutes?.get(b.category_id) || 0;
      const pct = b.weekly_minutes > 0 ? (used / b.weekly_minutes) * 100 : 0;
      return { b, category, used, pct };
    })
    .filter(Boolean) as { b: any; category: any; used: number; pct: number }[];

  rows.sort((a, b) => b.pct - a.pct);

  if (categories.length === 0) return null;

  const editor = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={openEditor}>
          <Settings2 className="h-3.5 w-3.5" />
          {t("budget.edit", "Definir")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("budget.dialog_title", "Orçamento semanal por categoria")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {t("budget.dialog_hint", "Defina quantas horas por semana você quer dedicar a cada categoria. Deixe vazio para não acompanhar.")}
        </p>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="flex-1 truncate text-sm">{c.name}</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                placeholder="0"
                className="h-9 w-20"
                value={drafts[c.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
              />
              <span className="w-6 text-xs text-muted-foreground">{t("budget.hours_short", "h")}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={upsert.isPending} className="w-full sm:w-auto">
            {t("common.save", "Salvar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card className={className}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4 text-primary" />
            {t("budget.title", "Orçamento da semana")}
          </h3>
          {editor}
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("budget.empty", "Defina um alvo de horas por semana para acompanhar seu equilíbrio entre categorias.")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {rows.map(({ b, category, used, pct }) => {
              const over = pct >= 100;
              const near = !over && pct >= 80;
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: category.color }} />
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        over ? "font-semibold text-destructive" : near ? "font-semibold text-orange-500" : "text-muted-foreground",
                      )}
                    >
                      {fmtH(used)} / {fmtH(b.weekly_minutes)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        over ? "bg-destructive" : near ? "bg-orange-500" : "bg-primary",
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {over && (
                    <p className="text-[10px] text-destructive">
                      {t("budget.over", "Orçamento estourado")}
                    </p>
                  )}
                  {near && (
                    <p className="text-[10px] text-orange-500">
                      {t("budget.near", "Chegando no limite")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
