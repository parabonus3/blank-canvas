import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Shield, RotateCcw, Trash2, Edit, CreditCard, Crown, Eye,
  Ban, ShieldCheck, ShieldOff, Headset, HeadsetIcon, MoreHorizontal,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  useAdminUsers,
  useAdminResetPassword,
  useAdminUpdateProfile,
  useAdminAssignPlan,
  useAdminCancelSub,
  useAdminDeleteUser,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminGrantRole,
  useAdminRevokeRole,
  useAdminGrantSupportAgent,
  useAdminRevokeSupportAgent,
  type AdminUser,
} from "@/hooks/useAdmin";
import { getTierByProductId, getBillingInterval, PLAN_OPTIONS } from "@/lib/stripePlans";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/PaginationControls";
import { ExportButton } from "@/components/ExportButton";
import { AdminFilters, DEFAULT_ADMIN_FILTERS, type AdminFilterState } from "@/components/admin/AdminFilters";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { exportToCSV, exportToPDF, type ExportColumn } from "@/lib/exportTable";

export default function Admin() {
  const { t } = useTranslation();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  const queryParams = useMemo(() => ({
    page,
    perPage,
    search: filters.search,
    sort: filters.sort,
    filters: {
      status: filters.status,
      role: filters.role,
      plan: filters.plan,
      signup_period: filters.signup_period,
      trial_expiring: filters.trial_expiring,
      activity: filters.activity,
    },
  }), [filters, page, perPage]);

  const { data, isLoading, isFetching } = useAdminUsers(queryParams);

  const resetPassword = useAdminResetPassword();
  const updateProfile = useAdminUpdateProfile();
  const assignPlan = useAdminAssignPlan();
  const cancelSubscription = useAdminCancelSub();
  const deleteUser = useAdminDeleteUser();
  const banUser = useAdminBanUser();
  const unbanUser = useAdminUnbanUser();
  const grantRole = useAdminGrantRole();
  const revokeRole = useAdminRevokeRole();
  const grantSupportAgent = useAdminGrantSupportAgent();
  const revokeSupportAgent = useAdminRevokeSupportAgent();

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editTrial, setEditTrial] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [planUser, setPlanUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [detailUser, setDetailUser] = useState<string | null>(null);

  if (adminLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">{t("common.loading")}</div>
      </MainLayout>
    );
  }
  if (!isAdmin) return <Navigate to="/timer" replace />;

  const users = data?.users || [];
  const stats = data?.stats;
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Reset to page 1 when filters change
  const handleFiltersChange = (next: AdminFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: t("admin.active") },
      trial: { variant: "secondary", label: t("admin.trial_active") },
      expired: { variant: "destructive", label: t("admin.expired") },
      free: { variant: "outline", label: t("admin.no_subscription") },
      banned: { variant: "destructive", label: t("admin.banned") },
    };
    const s = map[status] || map.free;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const planLabel = (user: AdminUser) => {
    if (!user.subscription) return "Free";
    const tier = getTierByProductId(user.subscription.product_id);
    const interval = getBillingInterval(user.subscription.price_id);
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    return interval ? `${tierName} (${interval === "monthly" ? t("admin.monthly") : t("admin.yearly")})` : tierName;
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditName(user.display_name || "");
    setEditTrial(user.trial_ends_at ? format(new Date(user.trial_ends_at), "yyyy-MM-dd") : "");
  };

  const saveEdit = () => {
    if (!editUser) return;
    updateProfile.mutate({
      user_id: editUser.id,
      display_name: editName,
      trial_ends_at: editTrial ? new Date(editTrial).toISOString() : undefined,
    }, { onSuccess: () => setEditUser(null) });
  };

  const openPlanDialog = (user: AdminUser) => {
    setPlanUser(user);
    if (!user.subscription) {
      setSelectedPlan("free");
    } else {
      const match = PLAN_OPTIONS.find((o) => "priceId" in o && o.priceId === user.subscription!.price_id);
      setSelectedPlan(match?.value || "free");
    }
  };

  const savePlan = () => {
    if (!planUser) return;
    const option = PLAN_OPTIONS.find((o) => o.value === selectedPlan);
    const priceId = option && "priceId" in option ? option.priceId : null;
    assignPlan.mutate(
      { user_id: planUser.id, price_id: priceId },
      { onSuccess: () => setPlanUser(null) }
    );
  };

  const confirmBan = () => {
    if (!banTarget) return;
    banUser.mutate(
      { user_id: banTarget.id, reason: banReason || undefined },
      { onSuccess: () => { setBanTarget(null); setBanReason(""); } }
    );
  };

  // Export columns
  const exportColumns: ExportColumn<AdminUser>[] = [
    { header: "Email", accessor: (u) => u.email },
    { header: t("admin.name"), accessor: (u) => u.display_name || "" },
    { header: t("admin.plan"), accessor: (u) => planLabel(u) },
    { header: "Status", accessor: (u) => u.status },
    { header: t("admin.role"), accessor: (u) => u.is_admin ? "admin" : (u.is_support_agent ? "agent" : "user") },
    { header: t("admin.created_at"), accessor: (u) => format(new Date(u.created_at), "yyyy-MM-dd") },
    { header: t("admin.last_signin"), accessor: (u) => u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "yyyy-MM-dd HH:mm") : "" },
    { header: "ID", accessor: (u) => u.id },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
              <p className="text-muted-foreground">{t("admin.subtitle")}</p>
            </div>
          </div>
          <ExportButton
            disabled={users.length === 0}
            onExportCSV={() => exportToCSV(users, exportColumns, `users_page${page}`)}
            onExportPDF={() => exportToPDF(users, exportColumns, t("admin.title"), `users_page${page}`)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label={t("admin.total_users")} value={stats?.total_users ?? 0} />
          <StatCard label={t("admin.active_subs")} value={stats?.active ?? 0} variant="default" />
          <StatCard label={t("admin.trial_active")} value={stats?.trial ?? 0} variant="secondary" />
          <StatCard label={t("admin.expired")} value={stats?.expired ?? 0} variant="destructive" />
          <StatCard label={t("admin.banned")} value={stats?.banned ?? 0} variant="destructive" />
          <StatCard label={t("admin.new_today")} value={stats?.new_today ?? 0} variant="default" />
        </div>

        {/* Filters */}
        <AdminFilters filters={filters} setFilters={handleFiltersChange} />

        {/* Counter */}
        <div className="text-sm text-muted-foreground">
          {isFetching ? t("common.loading") : t("admin.showing_of_total", { count: users.length, total })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">{t("common.loading")}</div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>{t("admin.name")}</TableHead>
                    <TableHead>{t("admin.plan")}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t("admin.role")}</TableHead>
                    <TableHead>{t("admin.created_at")}</TableHead>
                    <TableHead className="text-right">{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={user.is_banned ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.display_name || "—"}</TableCell>
                      <TableCell>{planLabel(user)}</TableCell>
                      <TableCell>{statusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.is_admin && <Badge variant="default" className="text-xs">Admin</Badge>}
                          {user.is_support_agent && <Badge variant="secondary" className="text-xs">SAC</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(user.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title={t("admin.view_details")} onClick={() => setDetailUser(user.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title={t("admin.change_plan")} onClick={() => openPlanDialog(user)}>
                            <Crown className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title={t("admin.edit_profile")} onClick={() => openEdit(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" title={t("admin.more_actions")}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => resetPassword.mutate(user.id)}>
                                <RotateCcw className="h-4 w-4 mr-2" /> {t("admin.reset_password")}
                              </DropdownMenuItem>
                              {user.subscription && (
                                <DropdownMenuItem onClick={() => cancelSubscription.mutate(user.subscription!.subscription_id)}>
                                  <CreditCard className="h-4 w-4 mr-2" /> {t("admin.cancel_subscription")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {user.is_admin ? (
                                <DropdownMenuItem onClick={() => revokeRole.mutate({ user_id: user.id, role: "admin" })}>
                                  <ShieldOff className="h-4 w-4 mr-2" /> {t("admin.revoke_admin")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => grantRole.mutate({ user_id: user.id, role: "admin" })}>
                                  <ShieldCheck className="h-4 w-4 mr-2" /> {t("admin.grant_admin")}
                                </DropdownMenuItem>
                              )}
                              {user.is_support_agent ? (
                                <DropdownMenuItem onClick={() => revokeSupportAgent.mutate({ user_id: user.id })}>
                                  <Headset className="h-4 w-4 mr-2" /> {t("admin.revoke_support")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => grantSupportAgent.mutate({ user_id: user.id, role: "agent" })}>
                                  <Headset className="h-4 w-4 mr-2" /> {t("admin.grant_support")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {user.is_banned ? (
                                <DropdownMenuItem onClick={() => unbanUser.mutate({ user_id: user.id })}>
                                  <ShieldCheck className="h-4 w-4 mr-2" /> {t("admin.unban")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-destructive" onClick={() => setBanTarget(user)}>
                                  <Ban className="h-4 w-4 mr-2" /> {t("admin.ban")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(user)}>
                                <Trash2 className="h-4 w-4 mr-2" /> {t("admin.delete_user")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {t("admin.no_users_found")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={perPage}
              totalItems={total}
              setCurrentPage={setPage}
              setPageSize={(s) => { setPerPage(s); setPage(1); }}
              pageSizeOptions={[25, 50, 100]}
            />
          </>
        )}

        {/* Plan Dialog */}
        <Dialog open={!!planUser} onOpenChange={() => setPlanUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.change_plan")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{planUser?.email}</p>
              </div>
              <div>
                <Label>{t("admin.plan")}</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanUser(null)}>{t("common.cancel")}</Button>
              <Button onClick={savePlan} disabled={assignPlan.isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.edit_profile")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("admin.name")}</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>{t("admin.extend_trial")}</Label>
                <Input type="date" value={editTrial} onChange={(e) => setEditTrial(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>{t("common.cancel")}</Button>
              <Button onClick={saveEdit} disabled={updateProfile.isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ban Dialog */}
        <Dialog open={!!banTarget} onOpenChange={() => { setBanTarget(null); setBanReason(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.ban_user_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("admin.ban_user_desc", { email: banTarget?.email })}</p>
              <div>
                <Label>{t("admin.ban_reason")}</Label>
                <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder={t("admin.ban_reason_placeholder")} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setBanTarget(null); setBanReason(""); }}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={confirmBan} disabled={banUser.isPending}>{t("admin.ban")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.confirm_delete")}</AlertDialogTitle>
              <AlertDialogDescription>{t("admin.delete_warning", { email: deleteTarget?.email })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    deleteUser.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
                  }
                }}
              >
                {t("admin.delete_user")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Detail drawer */}
        <UserDetailDrawer userId={detailUser} onClose={() => setDetailUser(null)} />
      </div>
    </MainLayout>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number | string; variant?: "default" | "secondary" | "destructive" }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
    </Card>
  );
}
