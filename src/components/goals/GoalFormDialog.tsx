import { useState, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, TrendingUp, Repeat, Sparkles, ArrowLeft, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCreateAnnualGoal,
  useUpdateAnnualGoal,
  GoalType,
  FrequencyPeriod,
  LifeCategory,
  AnnualGoal,
} from "@/hooks/useAnnualGoals";
import { GoalTemplate, CURRENCIES } from "@/lib/goalTemplates";
import { GoalTemplatePicker } from "./GoalTemplatePicker";
import { BookPicker } from "./BookPicker";
import { FieldLabel } from "./FieldLabel";

interface BaseProps {
  trigger: ReactNode;
  categories: LifeCategory[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

interface CreateProps extends BaseProps { mode?: "create"; year: number; defaultCategoryId?: string | null; goal?: never }
interface EditProps extends BaseProps { mode: "edit"; year?: never; defaultCategoryId?: never; goal: AnnualGoal }

type Props = CreateProps | EditProps;

type Step = "templates" | "form" | "book";

export function GoalFormDialog(props: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isEdit = props.mode === "edit";
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = props.onOpenChange ?? setInternalOpen;

  const create = useCreateAnnualGoal();
  const update = useUpdateAnnualGoal();

  const [step, setStep] = useState<Step>(isEdit ? "form" : "templates");
  const [categoryId, setCategoryId] = useState<string>(
    isEdit ? (props.goal.category_id || "none") : (props.defaultCategoryId || "none")
  );
  const [type, setType] = useState<GoalType>(isEdit ? props.goal.goal_type : "simple");
  const [title, setTitle] = useState(isEdit ? props.goal.title : "");
  const [description, setDescription] = useState(isEdit ? (props.goal.description || "") : "");
  const [target, setTarget] = useState(isEdit ? String(props.goal.target_value) : "1");
  const [unit, setUnit] = useState(isEdit ? (props.goal.unit || "") : "");
  const [frequency, setFrequency] = useState<FrequencyPeriod>(
    isEdit ? (props.goal.frequency_period || "weekly") : "weekly"
  );
  const [currentValue, setCurrentValue] = useState(isEdit ? String(props.goal.current_value) : "0");

  // Reset when reopening (create mode)
  useEffect(() => {
    if (!open || isEdit) return;
    setStep("templates");
    setTitle("");
    setDescription("");
    setTarget("1");
    setUnit("");
    setType("simple");
    setFrequency("weekly");
    setCategoryId(props.mode === "edit" ? "" : ((props as CreateProps).defaultCategoryId || "none"));
  }, [open, isEdit]);

  const applyTemplate = (tpl: GoalTemplate) => {
    if (tpl.bookPicker) {
      // Pre-fill type + unit then open book picker
      setType(tpl.goalType);
      setUnit(tpl.unitKey ? t(`annual_goals.templates.units.${tpl.unitKey}`) : (tpl.unit || ""));
      setStep("book");
      return;
    }
    setType(tpl.goalType);
    setTitle(t(`annual_goals.templates.items.${tpl.i18nKey}.title`, tpl.defaultTitle));
    setDescription(t(`annual_goals.templates.items.${tpl.i18nKey}.desc`, ""));
    setTarget(String(tpl.defaultTarget));
    if (tpl.unitKey) setUnit(t(`annual_goals.templates.units.${tpl.unitKey}`));
    else if (tpl.unit) setUnit(tpl.unit);
    else setUnit("");
    if (tpl.frequency) setFrequency(tpl.frequency);
    setStep("form");
  };

  const handleBookPick = (bookTitle: string, pages: number) => {
    setTitle(bookTitle);
    setTarget(String(pages));
    setDescription("");
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const payload = {
      category_id: categoryId === "none" ? null : categoryId,
      title: title.trim(),
      description: description.trim() || undefined,
      target_value: type === "simple" ? 1 : Math.max(1, Number(target) || 1),
      unit: unit.trim() || undefined,
      frequency_period: type === "habit" ? frequency : undefined,
    };
    if (isEdit) {
      await update.mutateAsync({
        id: props.goal.id,
        ...payload,
        current_value: Math.max(0, Number(currentValue) || 0),
      } as any);
    } else {
      await create.mutateAsync({
        ...payload,
        goal_type: type,
        year: (props as CreateProps).year,
      });
    }
    setOpen(false);
  };

  const types: { value: GoalType; icon: any; labelKey: string; descKey: string }[] = [
    { value: "simple", icon: CheckCircle2, labelKey: "type_simple", descKey: "type_simple_desc" },
    { value: "progress", icon: TrendingUp, labelKey: "type_progress", descKey: "type_progress_desc" },
    { value: "habit", icon: Repeat, labelKey: "type_habit", descKey: "type_habit_desc" },
  ];

  const headerTitle = isEdit
    ? t("annual_goals.edit_goal")
    : step === "templates" ? t("annual_goals.new_goal")
      : step === "book" ? t("annual_goals.choose_book")
        : t("annual_goals.new_goal");

  const body = (
    <>
      {!isEdit && (step === "form" || step === "book") && (
        <Button variant="ghost" size="sm" onClick={() => setStep(step === "book" ? "templates" : "templates")} className="self-start -ml-2 h-7 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {t("annual_goals.back_to_templates")}
        </Button>
      )}

      {!isEdit && step === "templates" && (
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="templates"><Sparkles className="h-3.5 w-3.5 mr-1.5" />{t("annual_goals.tab_template")}</TabsTrigger>
            <TabsTrigger value="custom" onClick={() => setStep("form")}>{t("annual_goals.tab_custom")}</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-3">
            <GoalTemplatePicker onPick={applyTemplate} />
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" className="w-full" onClick={() => setStep("form")}>
                {t("annual_goals.create_custom")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!isEdit && step === "book" && (
        <BookPicker onPick={handleBookPick} />
      )}

      {(isEdit || step === "form") && (
        <div className="space-y-4">
          {!isEdit && (
            <div>
              <FieldLabel label={t("annual_goals.goal_type")} tooltip={t("annual_goals.tooltips.goal_type")} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {types.map((tt) => {
                  const Icon = tt.icon;
                  return (
                    <button
                      key={tt.value}
                      type="button"
                      onClick={() => setType(tt.value)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-colors",
                        type === tt.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      )}
                    >
                      <Icon className="h-5 w-5 mb-1 text-primary" />
                      <div className="font-medium text-sm">{t(`annual_goals.${tt.labelKey}`)}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{t(`annual_goals.${tt.descKey}`)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <FieldLabel label={t("annual_goals.goal_title")} tooltip={t("annual_goals.tooltips.title")} required />
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("annual_goals.title_placeholder")} />
          </div>

          <div>
            <FieldLabel label={t("annual_goals.category")} tooltip={t("annual_goals.tooltips.category")} />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("annual_goals.no_category")}</SelectItem>
                {props.categories.map((c) => (
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
                <FieldLabel label={t("annual_goals.target")} tooltip={t("annual_goals.tooltips.target")} />
                <Input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <FieldLabel label={t("annual_goals.unit")} tooltip={t("annual_goals.tooltips.unit")} />
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("annual_goals.unit_placeholder")} list="unit-suggestions" />
                <datalist id="unit-suggestions">
                  <option value={t("annual_goals.templates.units.pages")} />
                  <option value={t("annual_goals.templates.units.books")} />
                  <option value={t("annual_goals.templates.units.hours")} />
                  <option value={t("annual_goals.templates.units.km")} />
                  <option value={t("annual_goals.templates.units.chapters")} />
                  {CURRENCIES.map((c) => <option key={c.code} value={c.symbol} />)}
                </datalist>
              </div>
            </div>
          )}

          {type === "habit" && (
            <div>
              <FieldLabel label={t("annual_goals.frequency")} tooltip={t("annual_goals.tooltips.frequency")} />
              <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("annual_goals.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("annual_goals.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isEdit && type !== "simple" && (
            <div>
              <FieldLabel label={t("annual_goals.adjust_current_value")} tooltip={t("annual_goals.tooltips.current_value")} />
              <Input type="number" min="0" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
            </div>
          )}

          <div>
            <FieldLabel label={t("annual_goals.description_opt")} tooltip={t("annual_goals.tooltips.description")} />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
      )}
    </>
  );

  const footer = (isEdit || step === "form") && (
    <Button onClick={handleSubmit} disabled={!title.trim() || create.isPending || update.isPending} className="w-full sm:w-auto">
      {isEdit ? t("common.save") : t("annual_goals.create")}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{props.trigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto flex flex-col gap-3">
          <SheetHeader><SheetTitle className="flex items-center gap-2">{headerTitle}</SheetTitle></SheetHeader>
          <div className="flex-1 flex flex-col gap-3">{body}</div>
          {footer && <SheetFooter className="mt-2">{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-3">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />{headerTitle}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">{body}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
