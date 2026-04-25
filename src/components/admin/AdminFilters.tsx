import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface AdminFilterState {
  search: string;
  status: string;
  plan: string;
  role: string;
  signup_period: string;
  trial_expiring: string;
  activity: string;
  sort: string;
}

export const DEFAULT_ADMIN_FILTERS: AdminFilterState = {
  search: "",
  status: "all",
  plan: "all",
  role: "all",
  signup_period: "all",
  trial_expiring: "all",
  activity: "all",
  sort: "created_desc",
};

interface Props {
  filters: AdminFilterState;
  setFilters: (next: AdminFilterState) => void;
}

export function AdminFilters({ filters, setFilters }: Props) {
  const { t } = useTranslation();
  const update = (k: keyof AdminFilterState, v: string) => setFilters({ ...filters, [k]: v });

  const hasActive =
    filters.search ||
    filters.status !== "all" ||
    filters.plan !== "all" ||
    filters.role !== "all" ||
    filters.signup_period !== "all" ||
    filters.trial_expiring !== "all" ||
    filters.activity !== "all" ||
    filters.sort !== "created_desc";

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.search_placeholder")}
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">{t("admin.sort_created_desc")}</SelectItem>
            <SelectItem value="created_asc">{t("admin.sort_created_asc")}</SelectItem>
            <SelectItem value="last_sign_in_desc">{t("admin.sort_last_signin")}</SelectItem>
            <SelectItem value="email_asc">{t("admin.sort_email")}</SelectItem>
            <SelectItem value="plan">{t("admin.sort_plan")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filters.status} onValueChange={(v) => update("status", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_status")}</SelectItem>
            <SelectItem value="active">{t("admin.active")}</SelectItem>
            <SelectItem value="trial">{t("admin.trial_active")}</SelectItem>
            <SelectItem value="expired">{t("admin.expired")}</SelectItem>
            <SelectItem value="free">{t("admin.no_subscription")}</SelectItem>
            <SelectItem value="banned">{t("admin.banned")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.plan} onValueChange={(v) => update("plan", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("admin.plan")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_plans")}</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.role} onValueChange={(v) => update("role", v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("admin.role")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_roles")}</SelectItem>
            <SelectItem value="admin">{t("admin.role_admin")}</SelectItem>
            <SelectItem value="agent">{t("admin.role_agent")}</SelectItem>
            <SelectItem value="user">{t("admin.role_user")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.signup_period} onValueChange={(v) => update("signup_period", v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("admin.signup_period")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_time")}</SelectItem>
            <SelectItem value="1d">{t("admin.period_today")}</SelectItem>
            <SelectItem value="7d">{t("admin.period_7d")}</SelectItem>
            <SelectItem value="30d">{t("admin.period_30d")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.trial_expiring} onValueChange={(v) => update("trial_expiring", v)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder={t("admin.trial_expiring")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_trials")}</SelectItem>
            <SelectItem value="3d">{t("admin.expires_3d")}</SelectItem>
            <SelectItem value="7d">{t("admin.expires_7d")}</SelectItem>
            <SelectItem value="30d">{t("admin.expires_30d")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.activity} onValueChange={(v) => update("activity", v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("admin.activity")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_activity")}</SelectItem>
            <SelectItem value="active_30d">{t("admin.active_30d")}</SelectItem>
            <SelectItem value="inactive_30d">{t("admin.inactive_30d")}</SelectItem>
          </SelectContent>
        </Select>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_ADMIN_FILTERS)} className="gap-1">
            <X className="h-4 w-4" />
            {t("common.clear_filters")}
          </Button>
        )}
      </div>
    </div>
  );
}
