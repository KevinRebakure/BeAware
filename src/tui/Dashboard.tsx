import { Box, Text } from "ink";
import { formatCents } from "../core/money.ts";
import { milestoneFloor } from "../core/alerts.ts";
import type { Settings } from "../db/store.ts";
import type { StoredAlert } from "../db/store.ts";
import { formatAgo } from "../core/ago.ts";
import { VERSION } from "../version.ts";
import type { ProviderShare } from "../providers/breakdown.ts";
import { ProgressBar } from "./components/ProgressBar.tsx";
import { ProviderBreakdown } from "./components/ProviderBreakdown.tsx";

type Props = {
  totalCents: number;
  breakdown: ProviderShare[];
  lastAlertedCents: number;
  settings: Settings;
  banner: StoredAlert | null;
  notice: string | null;
  unknownModels: string[];
  pricesError: string | null;
  pricesFile: string;
  daemon: { alive: boolean; lastSync: Date | null };
};

export function Dashboard({ totalCents, breakdown, lastAlertedCents, settings, banner, notice, unknownModels, pricesError, pricesFile, daemon }: Props) {
  const { intervalCents, enabled } = settings;
  const base = milestoneFloor(totalCents, intervalCents);
  const nextCents = base + intervalCents;
  const ratio = (totalCents - base) / intervalCents;
  const milestonesToday = Math.floor(lastAlertedCents / intervalCents);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="round" paddingX={2} paddingY={1} width={56}>
        <Box justifyContent="space-between">
          <Text bold>BeAware</Text>
          <Text dimColor>v{VERSION}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>TODAY · est.</Text>
          <Text bold>{formatCents(totalCents)}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <ProviderBreakdown shares={breakdown} />
        </Box>
        <Box flexDirection="column">
          <Text dimColor>NEXT ALERT</Text>
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
          <Row
            label="Daemon"
            value={daemon.alive ? `● running · synced ${formatAgo(daemon.lastSync)}` : "○ not running"}
            color={daemon.alive ? "green" : "red"}
          />
          <Row label="Milestones today" value={String(milestonesToday)} />
        </Box>
      </Box>
      {banner && (
        <Box borderStyle="round" borderColor="yellow" paddingX={2} width={56} flexDirection="column">
          <Text color="yellow" bold>
            🔔 Spending milestone{banner.crossed > 1 ? "s" : ""} reached
          </Text>
          <Text>
            You crossed {banner.crossed} spending alert{banner.crossed > 1 ? "s" : ""}.
          </Text>
          <Text>
            Current spend: {formatCents(banner.totalCents)} · Next alert: {formatCents(banner.nextCents)}
          </Text>
          <Text dimColor>press any key to dismiss</Text>
        </Box>
      )}
      {pricesError && (
        <Text color="yellow"> ⚠ {pricesError} — using default prices ({pricesFile})</Text>
      )}
      {unknownModels.length > 0 && (
        <Text color="yellow">
          {" "}⚠ unpriced model{unknownModels.length > 1 ? "s" : ""}: {unknownModels.join(", ")} (counted as $0) — edit {pricesFile}
        </Text>
      )}
      {!daemon.alive && (
        <Text color="yellow"> ⚠ background daemon not running — no live syncing or alerts. Press i to install, d to restart.</Text>
      )}
      {notice && !banner && <Text color="green"> {notice}</Text>}
      <Text dimColor> a add spend s settings r refresh d restart daemon i install q quit</Text>
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
