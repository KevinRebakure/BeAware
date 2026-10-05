import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { formatHour, parseHour } from "../core/day.ts";
import { formatCents, parsePositiveCents } from "../core/money.ts";
import type { Settings as StoreSettings } from "../db/store.ts";

type Props = {
  settings: StoreSettings;
  /** Returns true when today's alert baseline was reset by the change. */
  onChange: (s: StoreSettings) => boolean;
  onResetManual: () => void;
  onBack: () => void;
};

type Mode = "list" | "edit" | "confirm";
const ITEMS = ["Alerts enabled", "Alert every", "Day starts at", "Reset manual spend"] as const;
const BASELINE_NOTE = "Alert baseline reset — no alert fired for this change.";

export function Settings({ settings, onChange, onResetManual, onBack }: Props) {
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("list");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const apply = (s: StoreSettings) => setNote(onChange(s) ? BASELINE_NOTE : "");

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
      if (cursor === 0) apply({ ...settings, enabled: !settings.enabled });
      if (cursor === 1) {
        setDraft((settings.intervalCents / 100).toString());
        setMode("edit");
      }
      if (cursor === 2) {
        setDraft(String(settings.dayStartHour));
        setMode("edit");
      }
      if (cursor === 3) setMode("confirm");
    }
  });

  const submit = (v: string) => {
    if (cursor === 1) {
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

  const value = (i: number) =>
    i === 0
      ? settings.enabled ? "● on" : "○ off"
      : i === 1 ? formatCents(settings.intervalCents)
      : i === 2 ? formatHour(settings.dayStartHour)
      : "";

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1} width={56}>
      <Text bold>Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {ITEMS.map((label, i) => (
          <Box key={label} justifyContent="space-between">
            <Text color={i === cursor ? "cyan" : undefined} bold={i === cursor}>
              {i === cursor ? "› " : "  "}
              {label}
            </Text>
            {mode === "edit" && i === cursor ? (
              <Box>
                <Text>{i === 1 ? "$ " : "hour "}</Text>
                <TextInput
                  value={draft}
                  onChange={(v) => {
                    setDraft(v);
                    setError("");
                  }}
                  onSubmit={submit}
                />
              </Box>
            ) : (
              <Text color={i === 0 ? (settings.enabled ? "green" : "gray") : undefined}>{value(i)}</Text>
            )}
          </Box>
        ))}
      </Box>
      {error && <Text color="red">{error}</Text>}
      {note && <Text color="yellow">{note}</Text>}
      {mode === "confirm" && <Text color="yellow">{"\n"}Delete all manually added spend? Claude Code usage is kept. y/n</Text>}
      <Text dimColor>
        {"\n"}
        {mode === "edit" ? "enter save esc cancel" : "↑/↓ move enter/space change esc back"}
      </Text>
    </Box>
  );
}
