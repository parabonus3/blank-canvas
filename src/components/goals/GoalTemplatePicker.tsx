import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { GOAL_TEMPLATES, TEMPLATE_CATEGORIES, GoalTemplate, TemplateCategory } from "@/lib/goalTemplates";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (tpl: GoalTemplate) => void;
}

export function GoalTemplatePicker({ onPick }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TemplateCategory | "all">("all");

  const filtered = useMemo(() => {
    return GOAL_TEMPLATES.filter((tpl) => {
      if (tab !== "all" && tpl.category !== tab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const title = t(`annual_goals.templates.items.${tpl.i18nKey}.title`, tpl.defaultTitle).toLowerCase();
      const desc = t(`annual_goals.templates.items.${tpl.i18nKey}.desc`, "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [search, tab, t]);

  const countFor = (cat: TemplateCategory | "all") =>
    cat === "all" ? GOAL_TEMPLATES.length : GOAL_TEMPLATES.filter((t) => t.category === cat).length;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("annual_goals.search_template")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Category pills — horizontal scroll on mobile, wrap on desktop */}
      <div className="-mx-1 px-1 overflow-x-auto sm:overflow-visible scrollbar-hide">
        <div className="flex sm:flex-wrap gap-1.5 min-w-max sm:min-w-0 pb-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "text-xs h-7 px-2.5 rounded-md whitespace-nowrap inline-flex items-center gap-1 transition-colors",
              tab === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
            )}
          >
            {t("annual_goals.templates.all")}
            <span className="text-[10px] opacity-70">({countFor("all")})</span>
          </button>
          {TEMPLATE_CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = tab === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setTab(c.id)}
                className={cn(
                  "text-xs h-7 px-2.5 rounded-md whitespace-nowrap inline-flex items-center gap-1 transition-colors",
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-3 w-3" />
                {t(`annual_goals.templates.categories.${c.id}`)}
                <span className="text-[10px] opacity-70">({countFor(c.id)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">{t("annual_goals.templates.no_results")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1">
          {filtered.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <Card
                key={tpl.id}
                onClick={() => onPick(tpl)}
                className="p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">
                      {t(`annual_goals.templates.items.${tpl.i18nKey}.title`, tpl.defaultTitle)}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {t(`annual_goals.templates.items.${tpl.i18nKey}.desc`, "")}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
