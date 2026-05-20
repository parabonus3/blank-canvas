import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { POPULAR_BOOKS, BookOption, BOOK_GENRES, BookGenre } from "@/lib/goalTemplates";
import { Book, Search } from "lucide-react";
import { FieldLabel } from "./FieldLabel";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (title: string, pages: number) => void;
  defaultTitle?: string;
  defaultPages?: number;
}

export function BookPicker({ onPick, defaultTitle = "", defaultPages = 300 }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"popular" | "custom">("popular");
  const [genre, setGenre] = useState<BookGenre | "all">("all");
  const [search, setSearch] = useState("");
  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const [customPages, setCustomPages] = useState(String(defaultPages));

  const filtered = POPULAR_BOOKS.filter((b) => {
    if (genre !== "all" && b.genre !== genre) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.title.toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q);
  });

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

          {/* Genre pills — horizontal scroll on mobile */}
          <div className="-mx-1 px-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 min-w-max pb-1">
              <button
                type="button"
                onClick={() => setGenre("all")}
                className={cn(
                  "text-xs h-7 px-2.5 rounded-md whitespace-nowrap transition-colors",
                  genre === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {t("annual_goals.templates.all")}
              </button>
              {BOOK_GENRES.map((g) => {
                const Icon = g.icon;
                const isActive = genre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenre(g.id)}
                    className={cn(
                      "text-xs h-7 px-2.5 rounded-md whitespace-nowrap inline-flex items-center gap-1 transition-colors",
                      isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {t(`annual_goals.book_genres.${g.id}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 col-span-full">
                {t("annual_goals.templates.no_results")}
              </p>
            ) : filtered.map((b: BookOption) => (
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
                  <div className="text-xs text-muted-foreground shrink-0">{b.pages}p</div>
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
