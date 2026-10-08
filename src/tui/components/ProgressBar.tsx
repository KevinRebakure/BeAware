import { Text } from "ink";
import { usePanelInnerWidth } from "./Panel.tsx";

/** A bar spanning the enclosing panel, `ratio` (0-1) filled. */
export function ProgressBar({ ratio, color = "cyan" }: { ratio: number; color?: string }) {
  const width = usePanelInnerWidth();
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(width - filled)}</Text>
    </Text>
  );
}
