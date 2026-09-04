import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Coffee, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectPicker } from "@/components/ProjectPicker";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import {
  newStepId,
  routineTotalMinutes,
  useSaveFocusRoutine,
  type FocusRoutine,
  type RoutineStep,
} from "@/hooks/useFocusRoutines";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: FocusRoutine | null;
}

function emptyStep(): RoutineStep {
  return { id: newStepId(), kind: "focus", title: "", minutes: 25, projectId: null };
}

export function FocusRoutineDialog({ open, onOpenChange, routine }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: projects } = useProjects();
  const save = useSaveFocusRoutine();

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [steps, setSteps] = useState<RoutineStep[]>([emptyStep()]);

  useEffect(() => {
    if (!open) return;
    setTitle(routine?.title ?? "");
    setEmoji(routine?.emoji ?? "");
    setSteps(routine?.steps?.length ? routine.steps.map((s) => ({ ...s })) : [emptyStep()]);
  }, [open, routine]);

  const activeProjects = (projects || []).filter((p) => p.is_active);

  const updateStep = (id: string, patch: Partial<RoutineStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    const cleaned = steps
      .map((s) => ({ ...s, minutes: Math.max(1, Math.min(600, Math.floor(s.minutes || 1))) }))
      .filter((s) => s.minutes > 0);
    if (!title.trim() || cleaned.length === 0) {
      toast({ title: t("routines.validation", "Dê um nome à rotina e adicione ao menos uma etapa."), variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        id: routine?.id,
        title: title.trim(),
        emoji: emoji.trim() || null,
        steps: cleaned,
        position: routine?.position ?? 0,
      });
      toast({ title: t("routines.saved", "Rotina salva!") });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("routines.save_error", "Erro ao salvar rotina"), description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {routine ? t("routines.edit_title", "Editar rotina") : t("routines.new_title", "Nova rotina de foco")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="w-16 space-y-1.5">
              <Label className="text-xs">{t("routines.emoji", "Ícone")}</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} placeholder="🌅" className="text-center" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">{t("routines.name", "Nome")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("routines.name_placeholder", "Manhã produtiva")}
                maxLength={60}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("routines.steps", "Etapas")}</Label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {t("routines.total_minutes", "{{min}} min no total", { min: routineTotalMinutes(steps) })}
              </span>
            </div>

            {steps.map((step, i) => (
              <div key={step.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                  <div className="grid grid-cols-2 gap-1 flex-1">
                    {(["focus", "break"] as const).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => updateStep(step.id, { kind })}
                        aria-pressed={step.kind === kind}
                        className={cn(
                          "h-8 rounded-lg border text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors",
                          step.kind === kind
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {kind === "focus" ? <Target className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                        {kind === "focus" ? t("routines.kind_focus", "Foco") : t("routines.kind_break", "Pausa")}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    onClick={() => setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== step.id) : prev))}
                    aria-label={t("common.delete", "Excluir")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(step.id, { title: e.target.value.slice(0, 60) })}
                    placeholder={
                      step.kind === "focus"
                        ? t("routines.step_placeholder_focus", "Estudar")
                        : t("routines.step_placeholder_break", "Alongar")
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={600}
                    value={step.minutes}
                    onChange={(e) => updateStep(step.id, { minutes: parseInt(e.target.value, 10) || 1 })}
                    className="w-20 text-center tabular-nums"
                  />
                </div>

                {step.kind === "focus" && activeProjects.length > 0 && (
                  <ProjectPicker
                    value={step.projectId || ""}
                    onValueChange={(v) => updateStep(step.id, { projectId: v || null })}
                    projects={activeProjects}
                  />
                )}
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full h-10 gap-2"
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
            >
              <Plus className="h-4 w-4" />
              {t("routines.add_step", "Adicionar etapa")}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancelar")}
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {t("common.save", "Salvar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
