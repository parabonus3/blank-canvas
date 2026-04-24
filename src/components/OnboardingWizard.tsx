import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useUpdateProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, FolderOpen, FileText, PartyPopper, SkipForward, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(COLORS[0]);
  const [projectName, setProjectName] = useState("");
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const totalSteps = 4;

  const finish = () => {
    updateProfile.mutate({ onboarding_completed: true } as any);
    onComplete();
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim() || !user) return;
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name: categoryName.trim(), color: categoryColor })
        .select()
        .single();
      if (error) throw error;
      setCreatedCategoryId(data.id);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setStep(2);
    } catch {
      // silent
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !user) return;
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName.trim(),
          category_id: createdCategoryId,
        });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setStep(3);
    } catch {
      // silent
    } finally {
      setIsCreating(false);
    }
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("onboarding.welcome_title")}</h2>
        <p className="text-muted-foreground text-sm max-w-sm">{t("onboarding.welcome_desc")}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button onClick={() => setStep(1)} className="flex-1 gap-2">
          {t("onboarding.start")} <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={finish} className="flex-1 gap-2 text-muted-foreground">
          <SkipForward className="h-4 w-4" /> {t("onboarding.skip_all")}
        </Button>
      </div>
    </div>,

    // Step 1: Create Category
    <div key="category" className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
        <FolderOpen className="h-8 w-8 text-amber-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{t("onboarding.category_title")}</h2>
        <p className="text-muted-foreground text-sm max-w-sm">{t("onboarding.category_desc")}</p>
      </div>
      <div className="w-full space-y-4">
        <div className="space-y-2 text-left">
          <Label>{t("onboarding.category_name_placeholder")}</Label>
          <Input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder={t("onboarding.category_name_placeholder")}
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryColor(c)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all",
                categoryColor === c ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button onClick={handleCreateCategory} disabled={!categoryName.trim() || isCreating} className="flex-1 gap-2">
          {t("common.create")} <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 text-muted-foreground gap-2">
          <SkipForward className="h-4 w-4" /> {t("onboarding.skip_step")}
        </Button>
      </div>
    </div>,

    // Step 2: Create Project
    <div key="project" className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <FileText className="h-8 w-8 text-emerald-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{t("onboarding.project_title")}</h2>
        <p className="text-muted-foreground text-sm max-w-sm">{t("onboarding.project_desc")}</p>
      </div>
      <div className="w-full space-y-4">
        <div className="space-y-2 text-left">
          <Label>{t("onboarding.project_name_placeholder")}</Label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={t("onboarding.project_name_placeholder")}
            autoFocus
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button onClick={handleCreateProject} disabled={!projectName.trim() || isCreating} className="flex-1 gap-2">
          {t("common.create")} <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => setStep(3)} className="flex-1 text-muted-foreground gap-2">
          <SkipForward className="h-4 w-4" /> {t("onboarding.skip_step")}
        </Button>
      </div>
    </div>,

    // Step 3: Done
    <div key="done" className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
        <PartyPopper className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("onboarding.done_title")}</h2>
        <p className="text-muted-foreground text-sm max-w-sm">{t("onboarding.done_desc")}</p>
      </div>
      <ul className="text-left text-sm text-muted-foreground space-y-1 max-w-sm">
        {(t("onboarding.done_tips", { returnObjects: true }) as string[]).map((tip, i) => (
          <li key={i} className="flex gap-2">
            <span>💡</span> <span>{tip}</span>
          </li>
        ))}
      </ul>
      <Button onClick={finish} className="w-full gap-2" size="lg">
        {t("onboarding.done_button")} <Sparkles className="h-4 w-4" />
      </Button>
    </div>,
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && finish()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Progress */}
        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("onboarding.step_of", { current: step + 1, total: totalSteps })}</span>
          </div>
          <Progress value={((step + 1) / totalSteps) * 100} className="h-1.5" />
        </div>

        {steps[step]}
      </DialogContent>
    </Dialog>
  );
}
