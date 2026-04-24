import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName?: string;
  onSubmit: (password: string) => Promise<void>;
  isPending?: boolean;
}

export function JoinPasswordDialog({ open, onOpenChange, roomName, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setError("");
    try {
      await onSubmit(password);
      setPassword("");
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message?.includes("Invalid password") ? t("rooms.wrong_password") : e?.message || t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t("rooms.enter_password")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {roomName && (
            <p className="text-sm text-muted-foreground">{t("rooms.password_required_for", { name: roomName })}</p>
          )}
          <div className="space-y-2">
            <Label>{t("rooms.password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("rooms.password_placeholder")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!password.trim() || isPending}>
            {t("rooms.join")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
