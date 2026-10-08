import { Text } from "ink";
import type { Mode } from "./useSettingsScreen.ts";

export function SettingsHint({ mode }: { mode: Mode }) {
  return (
    <Text dimColor>
      {"\n"}
      {mode === "edit" ? "enter save esc cancel" : "↑/↓ move enter/space change esc back"}
    </Text>
  );
}
