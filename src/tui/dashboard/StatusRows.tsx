import { formatAgo } from "../../core/ago.ts";
import { formatCents } from "../../core/money.ts";
import type { Settings } from "../../db/store.ts";
import { Row } from "./Row.tsx";

type Props = {
  settings: Settings;
  lastAlertedCents: number;
  daemon: { alive: boolean; lastSync: Date | null };
};

export function StatusRows({ settings, lastAlertedCents, daemon }: Props) {
  const { intervalCents, enabled } = settings;
  return (
    <>
      <Row label="Alert every" value={formatCents(intervalCents)} />
      <Row label="Alerts" value={enabled ? "● enabled" : "○ disabled"} color={enabled ? "green" : "gray"} />
      <Row
        label="Daemon"
        value={daemon.alive ? `● running · synced ${formatAgo(daemon.lastSync)}` : "○ not running"}
        color={daemon.alive ? "green" : "red"}
      />
      <Row label="Milestones today" value={String(Math.floor(lastAlertedCents / intervalCents))} />
    </>
  );
}
