import { Text } from "ink";
import { formatCents } from "../../core/money.ts";
import type { StoredAlert } from "../../db/store.ts";
import { Panel } from "../components/Panel.tsx";

/** The undismissed alert, kept on screen until a key is pressed. */
export function AlertBanner({ alert }: { alert: StoredAlert }) {
  const plural = alert.crossed > 1 ? "s" : "";
  return (
    <Panel borderColor="yellow">
      <Text color="yellow" bold>
        🔔 Spending milestone{plural} reached
      </Text>
      <Text>
        You crossed {alert.crossed} spending alert{plural}.
      </Text>
      <Text>
        Current spend: {formatCents(alert.totalCents)} · Next alert: {formatCents(alert.nextCents)}
      </Text>
      <Text dimColor>press any key to dismiss</Text>
    </Panel>
  );
}
