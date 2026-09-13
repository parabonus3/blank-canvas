import { useState } from "react";
import { Bot, Pause, Play, Trash2, Users, DoorOpen, Clock3, Loader2 } from "lucide-react";
import { useSeedAction, useSeedStats } from "@/hooks/useSeedData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function SeedDataTab() {
  const { data, isLoading } = useSeedStats();
  const action = useSeedAction();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState("");
  const [progress, setProgress] = useState(0);

  const generate = async () => {
    setProgress(1);
    for (let offset = data?.users ?? 0; offset < 430; offset += 5) {
      await action.mutateAsync({ action: "seed_users", payload: { offset } });
      setProgress(Math.min(45, Math.round(((offset + 5) / 430) * 45)));
    }
    for (let offset = 0; offset < 50; offset += 5) {
      await action.mutateAsync({ action: "seed_rooms", payload: { offset } });
      setProgress(45 + Math.round(((offset + 5) / 50) * 5));
    }
    setProgress(50);
    for (let offset = data?.sessions ? 430 : 0; offset < 430; offset += 5) {
      await action.mutateAsync({ action: "seed_history", payload: { offset } });
      setProgress(50 + Math.round(((offset + 5) / 430) * 50));
    }
    setProgress(100);
    toast({ title: "Demonstração criada", description: "50 salas e seus históricos já estão ativos." });
  };

  const togglePresence = () => action.mutate({ action: "set_presence", payload: { enabled: !data?.presence_enabled } });
  const purge = async () => {
    await action.mutateAsync({ action: "purge" });
    setConfirm(""); setProgress(0);
    toast({ title: "Demonstração removida", description: "Nenhum dado real foi alterado." });
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  const ready = (data?.users ?? 0) >= 430 && (data?.rooms ?? 0) === 50;
  return <div className="space-y-5">
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <Stat icon={Users} label="Pessoas" value={data?.users ?? 0} />
      <Stat icon={DoorOpen} label="Salas" value={data?.rooms ?? 0} />
      <Stat icon={Clock3} label="Sessões" value={data?.sessions ?? 0} />
    </div>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5 text-primary" />Ambiente de demonstração</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Cria salas multilíngues protegidas por senha, pessoas e históricos variados. Tudo permanece separado dos dados reais.</p>
        {action.isPending && <div className="space-y-2"><Progress value={progress} /><p className="text-xs text-muted-foreground">Gerando dados com segurança… {progress}%</p></div>}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={generate} disabled={action.isPending || ready}>
            {action.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {ready ? "Demonstração completa" : "Criar demonstração"}
          </Button>
          <Button variant="outline" onClick={togglePresence} disabled={action.isPending || !ready}>
            {data?.presence_enabled ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {data?.presence_enabled ? "Pausar movimento" : "Ativar movimento"}
          </Button>
        </div>
      </CardContent>
    </Card>

    {(data?.users ?? 0) > 0 && <Card className="border-destructive/30">
      <CardHeader><CardTitle className="text-base text-destructive">Remover demonstração</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Digite REMOVER para apagar somente salas, pessoas e sessões marcadas como demonstração.</p>
        <div className="flex flex-col sm:flex-row gap-2"><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="REMOVER" className="sm:max-w-xs" /><Button variant="destructive" disabled={confirm !== "REMOVER" || action.isPending} onClick={purge}><Trash2 className="h-4 w-4 mr-2" />Remover tudo</Button></div>
      </CardContent>
    </Card>}
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <Card><CardContent className="p-3 sm:p-4"><Icon className="h-4 w-4 text-primary mb-2" /><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl sm:text-2xl font-bold">{value.toLocaleString()}</p></CardContent></Card>;
}