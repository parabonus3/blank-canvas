import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  accessCodeStatus,
  useAccessCodeRedemptions,
  useAccessCodes,
  useCreateAccessCode,
  useCreateAccessCodeBatch,
  useUpdateAccessCode,
  type AccessCode,
} from "@/hooks/useAccessCodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, Loader2, Plus, Search, Ticket, Users } from "lucide-react";

const DURATION_PRESETS = [7, 30, 90, 180, 365];

interface FormState {
  mode: "single" | "batch";
  code: string;
  prefix: string;
  plan_tier: "pro" | "premium";
  duration_days: number;
  code_type: "shared" | "single";
  max_redemptions: string;
  expires_at: string;
  partner_name: string;
  campaign: string;
  notes: string;
  quantity: string;
}

const EMPTY_FORM: FormState = {
  mode: "single",
  code: "",
  prefix: "TZ",
  plan_tier: "premium",
  duration_days: 30,
  code_type: "shared",
  max_redemptions: "",
  expires_at: "",
  partner_name: "",
  campaign: "",
  notes: "",
  quantity: "10",
};

export function AccessCodesTab() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [redemptionsFor, setRedemptionsFor] = useState<AccessCode | null>(null);
  const [batchResult, setBatchResult] = useState<AccessCode[] | null>(null);

  const { data, isLoading } = useAccessCodes({ search, status, plan });
  const { data: redemptionsData, isLoading: loadingRedemptions } = useAccessCodeRedemptions(redemptionsFor?.id ?? null);
  const createCode = useCreateAccessCode();
  const createBatch = useCreateAccessCodeBatch();
  const updateCode = useUpdateAccessCode();

  const codes = data?.codes ?? [];
  const stats = data?.stats;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: t("access_codes.admin_copied") });
  };

  const exportCsv = (rows: AccessCode[], name: string) => {
    const header = "code,plan,duration_days,type,max_redemptions,expires_at,partner,campaign\n";
    const body = rows
      .map((c) =>
        [
          c.code,
          c.plan_tier,
          c.duration_days,
          c.code_type,
          c.max_redemptions ?? "",
          c.expires_at ?? "",
          c.partner_name ?? "",
          c.campaign ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitting = createCode.isPending || createBatch.isPending;

  const handleSubmit = async () => {
    const base = {
      plan_tier: form.plan_tier,
      duration_days: Number(form.duration_days),
      code_type: form.mode === "batch" ? ("single" as const) : form.code_type,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
      partner_name: form.partner_name || null,
      campaign: form.campaign || null,
      notes: form.notes || null,
    };
    try {
      if (form.mode === "batch") {
        const res = await createBatch.mutateAsync({
          ...base,
          prefix: form.prefix,
          quantity: Number(form.quantity),
        });
        setBatchResult(res.codes as AccessCode[]);
      } else {
        await createCode.mutateAsync({
          ...base,
          code: form.code || undefined,
          prefix: form.prefix,
          max_redemptions: form.code_type === "single" ? 1 : form.max_redemptions || null,
        });
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } catch {
      /* toast já tratado no hook */
    }
  };

  const statusBadge = (code: AccessCode) => {
    const s = accessCodeStatus(code);
    const map: Record<string, { label: string; className: string }> = {
      active: { label: t("access_codes.status_active"), className: "bg-success/15 text-success border-success/30" },
      inactive: { label: t("access_codes.status_inactive"), className: "bg-muted text-muted-foreground" },
      expired: { label: t("access_codes.status_expired"), className: "bg-destructive/15 text-destructive border-destructive/30" },
      exhausted: { label: t("access_codes.status_exhausted"), className: "bg-warning/15 text-warning border-warning/30" },
    };
    return (
      <Badge variant="outline" className={map[s].className}>
        {map[s].label}
      </Badge>
    );
  };

  const statCards = useMemo(
    () => [
      { label: t("access_codes.stat_active"), value: stats?.active_codes ?? 0, icon: Ticket },
      { label: t("access_codes.stat_redemptions"), value: stats?.total_redemptions ?? 0, icon: Users },
      { label: t("access_codes.stat_week"), value: stats?.week_redemptions ?? 0, icon: Users },
    ],
    [stats, t],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{s.label}</p>
              <p className="text-xl sm:text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("access_codes.admin_search")}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="flex-1 sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("access_codes.filter_all")}</SelectItem>
              <SelectItem value="active">{t("access_codes.status_active")}</SelectItem>
              <SelectItem value="inactive">{t("access_codes.status_inactive")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="flex-1 sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("access_codes.filter_all_plans")}</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          {t("access_codes.admin_new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("access_codes.admin_empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => (
            <Card key={code.id}>
              <CardContent className="p-3 sm:p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      onClick={() => copy(code.code)}
                      className="font-mono font-semibold text-sm sm:text-base flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <span className="truncate">{code.code}</span>
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    </button>
                    <p className="text-xs text-muted-foreground truncate">
                      {code.partner_name || t("access_codes.admin_no_partner")}
                      {code.campaign ? ` · ${code.campaign}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(code)}
                    <Switch
                      checked={code.is_active}
                      onCheckedChange={(v) => updateCode.mutate({ code_id: code.id, is_active: v })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                  <Badge variant="secondary">{code.plan_tier === "premium" ? "Premium" : "Pro"}</Badge>
                  <Badge variant="secondary">{t("access_codes.days", { count: code.duration_days })}</Badge>
                  <Badge variant="secondary">
                    {code.code_type === "single" ? t("access_codes.type_single") : t("access_codes.type_shared")}
                  </Badge>
                  <Badge variant="secondary">
                    {t("access_codes.uses", {
                      used: code.redemption_count,
                      max: code.max_redemptions ?? "∞",
                    })}
                  </Badge>
                  {code.expires_at && (
                    <Badge variant="secondary">
                      {t("access_codes.admin_valid_until", { date: formatDate(code.expires_at) })}
                    </Badge>
                  )}
                </div>

                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRedemptionsFor(code)}>
                  {t("access_codes.admin_view_redemptions")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Criação */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("access_codes.admin_new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={form.mode === "single" ? "default" : "outline"}
                onClick={() => setForm((f) => ({ ...f, mode: "single" }))}
                size="sm"
              >
                {t("access_codes.admin_mode_single")}
              </Button>
              <Button
                variant={form.mode === "batch" ? "default" : "outline"}
                onClick={() => setForm((f) => ({ ...f, mode: "batch" }))}
                size="sm"
              >
                {t("access_codes.admin_mode_batch")}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("access_codes.admin_plan")}</Label>
                <Select
                  value={form.plan_tier}
                  onValueChange={(v) => setForm((f) => ({ ...f, plan_tier: v as "pro" | "premium" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("access_codes.admin_duration")}</Label>
                <Select
                  value={String(form.duration_days)}
                  onValueChange={(v) => setForm((f) => ({ ...f, duration_days: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {t("access_codes.days", { count: d })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.mode === "single" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{t("access_codes.admin_code_optional")}</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="PARCEIRO-2026"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("access_codes.admin_type")}</Label>
                    <Select
                      value={form.code_type}
                      onValueChange={(v) => setForm((f) => ({ ...f, code_type: v as "shared" | "single" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">{t("access_codes.type_shared")}</SelectItem>
                        <SelectItem value="single">{t("access_codes.type_single")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.code_type === "shared" && (
                    <div className="space-y-1">
                      <Label className="text-xs">{t("access_codes.admin_max")}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.max_redemptions}
                        onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                        placeholder="∞"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("access_codes.admin_quantity")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("access_codes.admin_prefix")}</Label>
                  <Input
                    value={form.prefix}
                    onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("access_codes.admin_partner")}</Label>
                <Input
                  value={form.partner_name}
                  onChange={(e) => setForm((f) => ({ ...f, partner_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("access_codes.admin_campaign")}</Label>
                <Input value={form.campaign} onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("access_codes.admin_expires")}</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("access_codes.admin_notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("access_codes.admin_create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resultado do lote */}
      <Dialog open={!!batchResult} onOpenChange={(o) => !o && setBatchResult(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("access_codes.admin_batch_created")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => batchResult && exportCsv(batchResult, `codigos-${Date.now()}`)}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {t("access_codes.admin_export_csv")}
            </Button>
            <div className="rounded-lg border p-2 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
              {(batchResult || []).map((c) => (
                <div key={c.id}>{c.code}</div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resgates */}
      <Dialog open={!!redemptionsFor} onOpenChange={(o) => !o && setRedemptionsFor(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{redemptionsFor?.code}</DialogTitle>
          </DialogHeader>
          {loadingRedemptions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (redemptionsData?.redemptions?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("access_codes.admin_no_redemptions")}
            </p>
          ) : (
            <div className="space-y-2">
              {redemptionsData!.redemptions.map((r) => (
                <div key={r.id} className="rounded-lg border p-2.5">
                  <p className="text-sm font-medium truncate">{r.display_name || r.email || r.user_id}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("access_codes.admin_redeemed_at", { date: formatDate(r.created_at) })} ·{" "}
                    {t("access_codes.admin_valid_until", { date: formatDate(r.access_ends_at) })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
