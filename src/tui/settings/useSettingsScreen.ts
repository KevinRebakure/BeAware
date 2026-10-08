import { useInput } from "ink";
import { useState } from "react";
import { parseHour } from "../../core/day.ts";
import { parsePositiveCents } from "../../core/money.ts";
import type { Settings } from "../../db/store.ts";
import { BASELINE_NOTE, ITEMS } from "./items.ts";

export type SettingsScreenProps = {
  settings: Settings;
  /** Returns true when today's alert baseline was reset by the change. */
  onChange: (s: Settings) => boolean;
  onResetManual: () => void;
  onBack: () => void;
};

/** `list`: moving through rows. `edit`: typing a value. `confirm`: waiting for y/n on a destructive action. */
export type Mode = "list" | "edit" | "confirm";

/** The settings screen's state and keyboard handling; the components only render what it returns. */
export function useSettingsScreen({ settings, onChange, onResetManual, onBack }: SettingsScreenProps) {
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("list");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const item = ITEMS[cursor]!.id;
  const apply = (s: Settings) => setNote(onChange(s) ? BASELINE_NOTE : "");
  const startEdit = (value: string) => {
    setDraft(value);
    setMode("edit");
  };

  useInput((input, key) => {
    if (mode === "edit") {
      if (key.escape) {
        setMode("list");
        setError("");
      }
      return;
    }
    if (mode === "confirm") {
      if (input === "y") onResetManual();
      setMode("list");
      return;
    }
    if (key.escape || input === "q") return onBack();
    if (key.upArrow || input === "k") setCursor((c) => (c + ITEMS.length - 1) % ITEMS.length);
    if (key.downArrow || input === "j") setCursor((c) => (c + 1) % ITEMS.length);
    if (key.return || input === " ") {
      setNote("");
      if (item === "enabled") apply({ ...settings, enabled: !settings.enabled });
      if (item === "interval") startEdit((settings.intervalCents / 100).toString());
      if (item === "dayStart") startEdit(String(settings.dayStartHour));
      if (item === "resetManual") setMode("confirm");
    }
  });

  const changeDraft = (v: string) => {
    setDraft(v);
    setError("");
  };

  const submit = (v: string) => {
    if (item === "interval") {
      const cents = parsePositiveCents(v);
      if (cents === null) return setError("Enter an amount like 25");
      apply({ ...settings, intervalCents: cents });
    } else {
      const hour = parseHour(v);
      if (hour === null) return setError("Enter an hour from 0 to 23");
      apply({ ...settings, dayStartHour: hour });
    }
    setMode("list");
  };

  return { cursor, mode, draft, error, note, changeDraft, submit };
}
