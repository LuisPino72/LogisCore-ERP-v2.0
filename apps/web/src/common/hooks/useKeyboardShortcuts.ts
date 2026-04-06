import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handlersRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    handlersRef.current.clear();
    shortcuts.forEach((shortcut) => {
      const combo = [
        shortcut.ctrl ? "ctrl" : "",
        shortcut.shift ? "shift" : "",
        shortcut.alt ? "alt" : "",
        shortcut.key.toLowerCase()
      ].filter(Boolean).join("+");

      handlersRef.current.set(combo, shortcut.handler);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const keys: string[] = [];
      if (event.ctrlKey) keys.push("ctrl");
      if (event.shiftKey) keys.push("shift");
      if (event.altKey) keys.push("alt");
      keys.push(event.key.toLowerCase());

      const combo = keys.join("+");
      const handler = handlersRef.current.get(combo);

      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

export function useGlobalKeyboardShortcuts() {
  const handleEscape = useCallback(() => {
    const modals = document.querySelectorAll('[role="dialog"]:not([hidden])');
    if (modals.length > 0) {
      const lastModal = modals[modals.length - 1];
      const closeBtn = lastModal?.querySelector('[data-close]') as HTMLButtonElement | null;
      if (closeBtn) closeBtn.click();
    }
  }, []);

  useKeyboardShortcuts([
    { key: "Escape", handler: handleEscape, description: "Cerrar modal" }
  ]);
}

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");
  parts.push(shortcut.key.toUpperCase());
  return parts.join("+");
}