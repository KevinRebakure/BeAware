import { Text } from "ink";

export function ProgressBar({ ratio, width = 32, color = "cyan" }: { ratio: number; width?: number; color?: string }) {
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(width - filled)}</Text>
    </Text>
  );
}
