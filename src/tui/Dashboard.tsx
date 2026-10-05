import { Box, Text } from "ink";
import { formatCents } from "../core/money.ts";
import type { AlertResult } from "../core/alerts.ts";
import type { Settings } from "../db/store.ts";
import { ProgressBar } from "./components/ProgressBar.tsx";

type Props = {
  totalCents: number;
  lastAlertedCents: number;
  settings: Settings;
  banner: { alert: AlertResult; totalCents: number } | null;
  notice: string | null;
};

export function Dashboard({ totalCents, lastAlertedCents, settings, banner, notice }: Props) {
  const { intervalCents, enabled } = settings;
  const nextCents = (Math.floor(totalCents / intervalCents) + 1) * intervalCents;
  const base = nextCents - intervalCents;
  const ratio = (totalCents - base) / intervalCents;
  const milestonesToday = Math.floor(lastAlertedCents / intervalCents);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1} width={56}>
        <Box justifyContent="space-between">
          <Text bold>BeAware</Text>
          <Text dimColor>v0.1.0</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>TODAY</Text>
          <Text bold>{formatCents(totalCents)}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <ProgressBar ratio={ratio} color={enabled ? "cyan" : "gray"} />
          <Box justifyContent="space-between" width={32}>
            <Text dimColor>{formatCents(base)}</Text>
            <Text dimColor>{formatCents(nextCents)}</Text>
          </Box>
          <Text dimColor>{formatCents(nextCents - totalCents)} until next alert</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Row label="Alert every" value={formatCents(intervalCents)} />
          <Row
            label="Alerts"
            value={enabled ? "● enabled" : "○ disabled"}
            color={enabled ? "green" : "gray"}
          />
          <Row label="Milestones today" value={String(milestonesToday)} />
        </Box>
      </Box>
      {banner && (
        <Box borderStyle="round" borderColor="yellow" paddingX={2} width={56} flexDirection="column">
          <Text color="yellow" bold>
            🔔 Spending milestone{banner.alert.crossed > 1 ? "s" : ""} reached
          </Text>
          <Text>
            You crossed {banner.alert.crossed} spending alert{banner.alert.crossed > 1 ? "s" : ""}.
          </Text>
          <Text>
            Current spend: {formatCents(banner.totalCents)} · Next alert: {formatCents(banner.alert.nextCents)}
          </Text>
          <Text dimColor>press any key to dismiss</Text>
        </Box>
      )}
      {notice && !banner && <Text color="green"> {notice}</Text>}
      <Text dimColor> a add spend s settings r refresh q quit</Text>
    </Box>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box justifyContent="space-between">
      <Text dimColor>{label}</Text>
      <Text color={color}>{value}</Text>
    </Box>
  );
}
