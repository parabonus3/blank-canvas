import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

interface UpgradePromptProps {
  message: string;
  icon?: React.ReactNode;
  className?: string;
}

export function UpgradePrompt({ message, icon, className }: UpgradePromptProps) {
  const { t } = useTranslation();

  return (
    <div className={`py-6 text-center space-y-3 ${className ?? ""}`}>
      {icon || <ArrowUp className="h-10 w-10 text-primary mx-auto" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to="/pricing">
          <ArrowUp className="h-4 w-4 mr-1" />
          {t("pricing.upgrade_now")}
        </Link>
      </Button>
    </div>
  );
}
