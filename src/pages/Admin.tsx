import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { Shield, Search, RotateCcw, Trash2, Edit, CreditCard, Crown } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  useAdminUsers,
  useAdminResetPassword,
  useAdminUpdateProfile,
  useAdminAssignPlan,
  useAdminCancelSubscription,
  useAdminDeleteUser,
} from "@/hooks/useAdmin";
import { getTierByProductId, getBillingInterval, PLAN_OPTIONS } from "@/lib/stripePlans";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  const { t } = useTranslation();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data, isLoading } = useAdminUsers();
  const resetPassword = useAdminResetPassword();
  const updateProfile = useAdminUpdateProfile();
  const assignPlan = useAdminAssignPlan();
  const cancelSubscription = useAdminCancelSubscription();
  const deleteUser = useAdminDeleteUser();

  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editTrial, setEditTrial] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [planUser, setPlanUser] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState("");

  if (adminLoading) return <MainLayout><div className="flex items-center justify-center h-64 text-muted-foreground">{t("common.loading")}</div></MainLayout>;
  if (!isAdmin) return <Navigate to="/timer" replace />;

  const users = data?.users || [];
  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: t("admin.active") },
      trial: { variant: "secondary", label: t("admin.trial_active") },
      expired: { variant: "destructive", label: t("admin.expired") },
      free: { variant: "outline", label: t("admin.no_subscription") },
    };
    const s = map[status] || map.free;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const planLabel = (user: any) => {
    if (!user.subscription) return "Free";
    const tier = getTierByProductId(user.subscription.product_id as string);
    const interval = getBillingInterval(user.subscription.price_id);
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    return interval ? `${tierName} (${interval === "monthly" ? "Mensal" : "Anual"})` : tierName;
  };

  const openEdit = (user: any) => {
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

  const openPlanDialog = (user: any) => {
    setPlanUser(user);
    // Determine current plan value
    if (!user.subscription) {
      setSelectedPlan("free");
    } else {
      const match = PLAN_OPTIONS.find(o => 'priceId' in o && o.priceId === user.subscription.price_id);
      setSelectedPlan(match?.value || "free");
    }
  };

  const savePlan = () => {
    if (!planUser) return;
    const option = PLAN_OPTIONS.find(o => o.value === selectedPlan);
    const priceId = option && 'priceId' in option ? option.priceId : null;
    assignPlan.mutate(
      { user_id: planUser.id, price_id: priceId },
      { onSuccess: () => setPlanUser(null) }
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
            <p className="text-muted-foreground">{t("admin.subtitle")}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("admin.total_users")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{users.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("admin.active_subs")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{users.filter(u => u.status === "active").length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("admin.trial_active")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{users.filter(u => u.status === "trial").length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("admin.expired")}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{users.filter(u => u.status === "expired").length}</p></CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">{t("common.loading")}</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>{t("admin.name")}</TableHead>
                  <TableHead>{t("admin.plan")}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{t("admin.created_at")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.display_name || "—"}</TableCell>
                    <TableCell>{planLabel(user)}</TableCell>
                    <TableCell>{statusBadge(user.status)}</TableCell>
                    <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title={t("admin.change_plan")} onClick={() => openPlanDialog(user)}>
                          <Crown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={t("admin.edit_profile")} onClick={() => openEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title={t("admin.reset_password")} onClick={() => resetPassword.mutate(user.id)} disabled={resetPassword.isPending}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        {user.subscription && (
                          <Button size="icon" variant="ghost" title={t("admin.cancel_subscription")} onClick={() => cancelSubscription.mutate(user.subscription!.subscription_id)} disabled={cancelSubscription.isPending}>
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title={t("admin.delete_user")} onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t("admin.no_users_found")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Plan Assignment Dialog */}
        <Dialog open={!!planUser} onOpenChange={() => setPlanUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.change_plan")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{planUser?.email}</p>
              </div>
              <div>
                <Label>{t("admin.plan")}</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
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
            <DialogHeader>
              <DialogTitle>{t("admin.edit_profile")}</DialogTitle>
            </DialogHeader>
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

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("admin.confirm_delete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("admin.delete_warning", { email: deleteTarget?.email })}
              </AlertDialogDescription>
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
      </div>
    </MainLayout>
  );
}
