import { useEffect } from "react";

interface ShortcutConfig {
  onStartStop?: () => void;
  onNewNote?: () => void;
  onManualEntry?: () => void;
}

export function useKeyboardShortcuts({ onStartStop, onNewNote, onManualEntry }: ShortcutConfig) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Ctrl+N → new note
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewNote?.();
        return;
      }

      // Ctrl+M → manual entry
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        onManualEntry?.();
        return;
      }

      // Space → start/stop timer (only when not in input)
      if (e.code === "Space" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onStartStop?.();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStartStop, onNewNote, onManualEntry]);
}
