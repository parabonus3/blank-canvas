import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full flex-wrap h-auto justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs h-7 px-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            {t("annual_goals.templates.all")}
          </TabsTrigger>
          {TEMPLATE_CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <TabsTrigger key={c.id} value={c.id} className="text-xs h-7 px-2.5 gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Icon className="h-3 w-3" />
                {t(`annual_goals.templates.categories.${c.id}`)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{t("annual_goals.templates.no_results")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
              {filtered.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <Card
                    key={tpl.id}
                    onClick={() => onPick(tpl)}
                    className={cn(
                      "p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group"
                    )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
