import { GoalFormDialog } from "./GoalFormDialog";
import { AnnualGoal, LifeCategory } from "@/hooks/useAnnualGoals";

interface Props {
  trigger: React.ReactNode;
  goal: AnnualGoal;
  categories: LifeCategory[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function EditGoalDialog(props: Props) {
  return <GoalFormDialog mode="edit" {...props} />;
}
