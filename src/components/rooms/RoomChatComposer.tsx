import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Strikethrough, Code, Quote, List, Link as LinkIcon,
  Smile, Send, Eye, EyeOff, Type,
} from "lucide-react";
import { MessageBody } from "./MessageBody";

const QUICK_EMOJIS = ["👏", "🔥", "💪", "📚", "🎯", "❤️", "😂", "🙌", "✅", "🤔", "👍", "🎉"];

interface MemberOption {
  user_id: string;
  display_name?: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  members?: MemberOption[];
}

function insertAround(
  ta: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder = ""
): { value: string; selStart: number; selEnd: number } {
  const { selectionStart, selectionEnd, value } = ta;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  const start = selectionStart + before.length;
  const end = start + selected.length;
  return { value: next, selStart: start, selEnd: end };
}

function prefixLines(
  ta: HTMLTextAreaElement,
  prefix: string
): { value: string; selStart: number; selEnd: number } {
  const { selectionStart, selectionEnd, value } = ta;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const lineEnd = value.indexOf("\n", selectionEnd);
  const endIdx = lineEnd === -1 ? value.length : lineEnd;
  const block = value.slice(lineStart, endIdx);
  const newBlock = block
    .split("\n")
    .map((l) => (l.length ? prefix + l : prefix))
    .join("\n");
  const next = value.slice(0, lineStart) + newBlock + value.slice(endIdx);
  return { value: next, selStart: lineStart, selEnd: lineStart + newBlock.length };
}

function slugName(name: string) {
  return name.trim().replace(/\s+/g, "_");
}

export function RoomChatComposer({
  value, onChange, onSubmit, onTyping, disabled, placeholder, members,
}: Props) {
  const { t } = useTranslation();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<number>(0);

  // Autosize textarea
  const autosize = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = 8 * 24; // ~8 lines
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }, []);
  useEffect(() => { autosize(); }, [value, autosize, preview]);

  const applyEdit = (result: { value: string; selStart: number; selEnd: number }) => {
    onChange(result.value);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(result.selStart, result.selEnd);
      }
    });
  };

  const doBold = () => taRef.current && applyEdit(insertAround(taRef.current, "**", "**", t("chat.bold", "texto")));
  const doItalic = () => taRef.current && applyEdit(insertAround(taRef.current, "*", "*", t("chat.italic", "texto")));
  const doStrike = () => taRef.current && applyEdit(insertAround(taRef.current, "~~", "~~", t("chat.strike", "texto")));
  const doCode = () => taRef.current && applyEdit(insertAround(taRef.current, "`", "`", "code"));
  const doQuote = () => taRef.current && applyEdit(prefixLines(taRef.current, "> "));
  const doList = () => taRef.current && applyEdit(prefixLines(taRef.current, "- "));
  const doLink = () => {
    const ta = taRef.current;
    if (!ta) return;
    const url = window.prompt(t("chat.link_url", "URL do link:"), "https://");
    if (!url) return;
    const { selectionStart, selectionEnd, value: v } = ta;
    const selected = v.slice(selectionStart, selectionEnd) || t("chat.link_text", "texto");
    const insert = `[${selected}](${url})`;
    onChange(v.slice(0, selectionStart) + insert + v.slice(selectionEnd));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = selectionStart + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  };
  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) { onChange(value + emoji); return; }
    const { selectionStart, selectionEnd } = ta;
    const next = value.slice(0, selectionStart) + emoji + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = selectionStart + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // Mention detection
  const updateMention = useCallback((v: string, caret: number) => {
    const before = v.slice(0, caret);
    const m = before.match(/(?:^|\s)@([\p{L}0-9_.-]{0,30})$/u);
    if (m) {
      setMentionQuery(m[1].toLowerCase());
      setMentionAnchor(caret - m[1].length - 1);
    } else {
      setMentionQuery(null);
    }
  }, []);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null || !members) return [];
    return members
      .filter((m) => (m.display_name || "").toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [mentionQuery, members]);

  const applyMention = (member: MemberOption) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart;
    const insertion = `@${slugName(member.display_name || "user")} `;
    const next = value.slice(0, mentionAnchor) + insertion + value.slice(caret);
    onChange(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = mentionAnchor + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter = enviar
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
      return;
    }
    // Mention nav
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "Escape") { setMentionQuery(null); e.preventDefault(); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(mentionMatches[0]);
        return;
      }
    }
    // Shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === "b") { e.preventDefault(); doBold(); }
      else if (e.key.toLowerCase() === "i") { e.preventDefault(); doItalic(); }
      else if (e.key.toLowerCase() === "k") { e.preventDefault(); doLink(); }
    }
    // Enter alone = quebra de linha (comportamento nativo do textarea) — não fazer nada
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    onTyping?.();
    updateMention(e.target.value, e.target.selectionStart);
  };

  const canSubmit = value.trim().length > 0 && !disabled;
  const charCount = value.length;

  const ToolbarButtons = (
    <>
      <FmtBtn label={t("chat.bold", "Negrito") + " (Ctrl+B)"} onClick={doBold}><Bold className="h-3.5 w-3.5" /></FmtBtn>
      <FmtBtn label={t("chat.italic", "Itálico") + " (Ctrl+I)"} onClick={doItalic}><Italic className="h-3.5 w-3.5" /></FmtBtn>
      <FmtBtn label={t("chat.strike", "Riscado")} onClick={doStrike}><Strikethrough className="h-3.5 w-3.5" /></FmtBtn>
      <FmtBtn label={t("chat.code", "Código")} onClick={doCode}><Code className="h-3.5 w-3.5" /></FmtBtn>
      <FmtBtn label={t("chat.quote", "Citação")} onClick={doQuote}><Quote className="h-3.5 w-3.5" /></FmtBtn>
      <FmtBtn label={t("chat.list", "Lista")} onClick={doList}><List className="h-3.5 w-3.5" /></FmtBtn>
      <FmtBtn label={t("chat.link", "Link") + " (Ctrl+K)"} onClick={doLink}><LinkIcon className="h-3.5 w-3.5" /></FmtBtn>
    </>
  );

  return (
    <div className="border-t bg-background/60 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 sm:px-3">
      {/* Toolbar desktop */}
      <div className="hidden sm:flex items-center gap-0.5 pb-1.5">
        {ToolbarButtons}
        <div className="w-px h-4 bg-border mx-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted transition-colors" aria-label="Emoji">
              <Smile className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} type="button" className="text-xl h-9 rounded hover:bg-muted" onClick={() => insertEmoji(e)}>{e}</button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex-1" />
        <FmtBtn label={preview ? t("chat.edit", "Editar") : t("chat.preview", "Prévia")} onClick={() => setPreview(p => !p)}>
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </FmtBtn>
      </div>

      {/* Toolbar mobile — collapsed */}
      <div className="flex sm:hidden items-center gap-1 pb-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="h-8 px-2 inline-flex items-center gap-1 rounded border text-xs hover:bg-muted" aria-label="Formatação">
              <Type className="h-3.5 w-3.5" /> Aa
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-2" align="start">
            <div className="flex flex-wrap gap-1">{ToolbarButtons}</div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="h-8 w-8 inline-flex items-center justify-center rounded border hover:bg-muted" aria-label="Emoji">
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button key={e} type="button" className="text-2xl h-10 rounded hover:bg-muted" onClick={() => insertEmoji(e)}>{e}</button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPreview(p => !p)}
          className="h-8 px-2 inline-flex items-center gap-1 rounded border text-xs hover:bg-muted"
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? t("chat.edit", "Editar") : t("chat.preview", "Prévia")}
        </button>
      </div>

      {/* Textarea ou preview */}
      <div className="relative">
        {preview ? (
          <div className="min-h-[44px] max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {value.trim() ? (
              <MessageBody content={value} />
            ) : (
              <span className="text-sm text-muted-foreground">{t("chat.preview_empty", "Nada para pré-visualizar…")}</span>
            )}
          </div>
        ) : (
          <>
            <Textarea
              ref={taRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "resize-none min-h-[44px] max-h-48 text-base sm:text-sm leading-relaxed",
                "focus-visible:ring-1 focus-visible:ring-primary/40"
              )}
            />
            {/* Mention popover */}
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-full sm:w-64 rounded-md border bg-popover shadow-md z-20 overflow-hidden">
                {mentionMatches.map((m, i) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => applyMention(m)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2",
                      i === 0 && "bg-muted/50"
                    )}
                  >
                    <span className="font-medium">@{slugName(m.display_name || "user")}</span>
                    {m.display_name && <span className="text-xs text-muted-foreground truncate">{m.display_name}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: hint + counter + send */}
      <div className="flex items-center gap-2 mt-2">
        <div className="hidden sm:flex text-[10px] text-muted-foreground/70 items-center gap-2">
          <span>Enter = nova linha</span>
          <span>·</span>
          <span>Ctrl+Enter = enviar</span>
        </div>
        {charCount > 800 && (
          <span className={cn("text-[10px]", charCount > 2000 ? "text-destructive" : "text-muted-foreground")}>
            {charCount}
          </span>
        )}
        <div className="flex-1" />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          size="sm"
          className="h-9 sm:h-8 px-4 gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{t("chat.send", "Enviar")}</span>
        </Button>
      </div>
    </div>
  );
}

function FmtBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}
