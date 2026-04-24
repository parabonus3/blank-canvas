import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  status: string;
  priority: string;
  category: string;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
}

export function TicketFilters({ status, priority, category, onStatusChange, onPriorityChange, onCategoryChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("support.filter_status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("support.all")}</SelectItem>
          <SelectItem value="open">{t("support.status_open")}</SelectItem>
          <SelectItem value="in_progress">{t("support.status_in_progress")}</SelectItem>
          <SelectItem value="resolved">{t("support.status_resolved")}</SelectItem>
          <SelectItem value="closed">{t("support.status_closed")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("support.filter_priority")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("support.all")}</SelectItem>
          <SelectItem value="low">{t("support.priority_low")}</SelectItem>
          <SelectItem value="normal">{t("support.priority_normal")}</SelectItem>
          <SelectItem value="high">{t("support.priority_high")}</SelectItem>
          <SelectItem value="urgent">{t("support.priority_urgent")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t("support.filter_category")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("support.all")}</SelectItem>
          <SelectItem value="bug">{t("support.cat_bug")}</SelectItem>
          <SelectItem value="question">{t("support.cat_question")}</SelectItem>
          <SelectItem value="suggestion">{t("support.cat_suggestion")}</SelectItem>
          <SelectItem value="account">{t("support.cat_account")}</SelectItem>
          <SelectItem value="other">{t("support.cat_other")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
