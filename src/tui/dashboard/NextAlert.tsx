import { Box, Text } from "ink";
import { milestoneFloor } from "../../core/alerts.ts";
import { formatCents } from "../../core/money.ts";
import { ProgressBar } from "../components/ProgressBar.tsx";

/** Progress through the current milestone band: from the last multiple of the interval to the next one. */
export function NextAlert({ totalCents, intervalCents, enabled }: { totalCents: number; intervalCents: number; enabled: boolean }) {
  const base = milestoneFloor(totalCents, intervalCents);
  const nextCents = base + intervalCents;
  return (
    <Box flexDirection="column">
      <Text dimColor>NEXT ALERT</Text>
      <ProgressBar ratio={(totalCents - base) / intervalCents} color={enabled ? "cyan" : "gray"} />
      <Box justifyContent="space-between" width={32}>
        <Text dimColor>{formatCents(base)}</Text>
        <Text dimColor>{formatCents(nextCents)}</Text>
      </Box>
      <Text dimColor>{formatCents(nextCents - totalCents)} until next alert</Text>
    </Box>
  );
}
