import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSupportAgents, useInviteAgent, useToggleAgent } from "@/hooks/useSupportAgents";
import { SacLayout } from "@/components/sac/SacLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function AgentManager() {
  const { t } = useTranslation();
  const { data: agents = [], isLoading } = useSupportAgents();
  const inviteAgent = useInviteAgent();
  const toggleAgent = useToggleAgent();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", password: "", role: "agent" });

  const handleInvite = () => {
    if (!inviteForm.email || !inviteForm.password) {
      toast.error(t("support.fill_required"));
      return;
    }
    inviteAgent.mutate(inviteForm, {
      onSuccess: () => {
        toast.success(t("support.agent_invited"));
        setShowInvite(false);
        setInviteForm({ email: "", password: "", role: "agent" });
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <SacLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t("support.agents")}</h1>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            {t("support.invite_agent")}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent: any) => (
              <Card key={agent.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {agent.role === "admin" ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{agent.user_id}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{agent.role}</Badge>
                        <Badge variant={agent.is_active ? "default" : "secondary"} className="text-xs">
                          {agent.is_active ? t("support.active") : t("support.inactive")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {agent.role !== "admin" && (
                    <Button
                      size="sm"
                      variant={agent.is_active ? "destructive" : "default"}
                      onClick={() =>
                        toggleAgent.mutate({ agent_user_id: agent.user_id, activate: !agent.is_active })
                      }
                    >
                      {agent.is_active ? t("support.deactivate") : t("support.activate")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("support.invite_agent")}</DialogTitle>
              <DialogDescription>{t("support.invite_agent_desc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={t("support.agent_email")}
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Input
                placeholder={t("support.agent_password")}
                type="password"
                value={inviteForm.password}
                onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
              />
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">{t("support.role_agent")}</SelectItem>
                  <SelectItem value="admin">{t("support.role_admin")}</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleInvite} disabled={inviteAgent.isPending}>
                {inviteAgent.isPending ? t("common.loading") : t("support.invite_agent")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SacLayout>
  );
}
