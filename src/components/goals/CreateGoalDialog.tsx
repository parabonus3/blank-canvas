import { GoalFormDialog } from "./GoalFormDialog";
import { LifeCategory } from "@/hooks/useAnnualGoals";

interface Props {
  trigger: React.ReactNode;
  year: number;
  categories: LifeCategory[];
  defaultCategoryId?: string | null;
}

export function CreateGoalDialog(props: Props) {
  return <GoalFormDialog mode="create" {...props} />;
}
