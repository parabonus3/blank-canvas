import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateTicket } from "@/hooks/useSupportTickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Headset } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function NewTicket() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    email: user?.email || "",
    name: "",
    subject: "",
    message: "",
    category: "question",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.subject || !form.message) {
      toast.error(t("support.fill_required"));
      return;
    }
    createTicket.mutate(
      { ...form, user_id: user?.id },
      {
        onSuccess: () => {
          if (user) {
            navigate("/sac/tickets");
          } else {
            setSubmitted(true);
          }
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">{t("support.ticket_sent")}</h2>
            <p className="text-muted-foreground text-sm">{t("support.ticket_sent_desc")}</p>
            <div className="flex gap-2 justify-center">
              {user && (
                <Link to="/sac/tickets">
                  <Button variant="outline">{t("support.my_tickets")}</Button>
                </Link>
              )}
              <Link to={user ? "/timer" : "/"}>
                <Button>{t("support.back_to_app")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logo} alt="TimeZoni" className="h-8 w-8" />
            <Headset className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t("support.new_ticket")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("support.new_ticket_desc")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("support.your_email")} *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("support.your_name")}</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">{t("support.category")}</label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">{t("support.cat_bug")}</SelectItem>
                  <SelectItem value="question">{t("support.cat_question")}</SelectItem>
                  <SelectItem value="suggestion">{t("support.cat_suggestion")}</SelectItem>
                  <SelectItem value="account">{t("support.cat_account")}</SelectItem>
                  <SelectItem value="other">{t("support.cat_other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t("support.subject")} *</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t("support.message")} *</label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={5}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={createTicket.isPending}>
              {createTicket.isPending ? t("common.loading") : t("support.send_ticket")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to={user ? "/timer" : "/"} className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              {t("support.back_to_app")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
