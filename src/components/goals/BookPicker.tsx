import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { POPULAR_BOOKS, BookOption } from "@/lib/goalTemplates";
import { Book, Search } from "lucide-react";
import { FieldLabel } from "./FieldLabel";

interface Props {
  onPick: (title: string, pages: number) => void;
  defaultTitle?: string;
  defaultPages?: number;
}

export function BookPicker({ onPick, defaultTitle = "", defaultPages = 300 }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"popular" | "custom">("popular");
  const [search, setSearch] = useState("");
  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const [customPages, setCustomPages] = useState(String(defaultPages));

  const filtered = POPULAR_BOOKS.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "popular" ? "default" : "outline"} onClick={() => setMode("popular")} className="flex-1">
          <Book className="h-3.5 w-3.5 mr-1.5" />
          {t("annual_goals.book_popular")}
        </Button>
        <Button type="button" size="sm" variant={mode === "custom" ? "default" : "outline"} onClick={() => setMode("custom")} className="flex-1">
          {t("annual_goals.book_custom")}
        </Button>
      </div>

      {mode === "popular" ? (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("annual_goals.search_book")} className="pl-8 h-9" />
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-[40vh] overflow-y-auto pr-1">
            {filtered.map((b: BookOption) => (
              <Card
                key={b.id}
                className="p-2.5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => onPick(b.title, b.pages)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{b.title}</div>
                    {b.author && <div className="text-[11px] text-muted-foreground truncate">{b.author}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{b.pages} {t("annual_goals.templates.units.pages")}</div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <FieldLabel label={t("annual_goals.book_name")} tooltip={t("annual_goals.tooltips.book_name")} />
            <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Ex: Harry Potter" />
          </div>
          <div>
            <FieldLabel label={t("annual_goals.book_pages")} tooltip={t("annual_goals.tooltips.book_pages")} />
            <Input type="number" min="1" value={customPages} onChange={(e) => setCustomPages(e.target.value)} />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!customTitle.trim() || Number(customPages) < 1}
            onClick={() => onPick(customTitle.trim(), Math.max(1, Number(customPages)))}
          >
            {t("annual_goals.use_book")}
          </Button>
        </div>
      )}
    </div>
  );
}
