import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ColorPalettePicker } from "./ColorPalettePicker";
import { useUpdateBoard, type Board } from "@/hooks/useBoards";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  board: Board;
}

export function EditBoardDialog({ open, onOpenChange, board }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateBoard = useUpdateBoard();

  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description || "");
  const [color, setColor] = useState<string | null>(board.color);

  useEffect(() => {
    if (open) {
      setTitle(board.title);
      setDescription(board.description || "");
      setColor(board.color);
    }
  }, [open, board]);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      await updateBoard.mutateAsync({
        id: board.id,
        title: title.trim(),
        description: description.trim() || null,
        color,
      });
      toast({ title: t("kanban.board_updated", "Quadro atualizado") });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-lg sm:mx-auto sm:rounded-t-xl rounded-t-xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("kanban.edit_board", "Editar quadro")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="board-title">{t("kanban.board_title", "Título")}</Label>
            <Input id="board-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="board-desc">{t("kanban.board_description", "Descrição")}</Label>
            <Textarea
              id="board-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("kanban.board_desc_ph", "Do que se trata este quadro?") as string}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("kanban.board_color", "Cor")}</Label>
            <ColorPalettePicker value={color} onChange={setColor} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || updateBoard.isPending} className="flex-1">
              {t("common.save", "Salvar")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
