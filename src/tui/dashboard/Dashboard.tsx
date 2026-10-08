import { Box, Text } from "ink";
import type { Settings, StoredAlert } from "../../db/store.ts";
import type { ProviderShare } from "../../providers/breakdown.ts";
import { Panel } from "../components/Panel.tsx";
import { Section } from "../components/Section.tsx";
import { AlertBanner } from "./AlertBanner.tsx";
import { Header } from "./Header.tsx";
import { KeyHints } from "./KeyHints.tsx";
import { NextAlert } from "./NextAlert.tsx";
import { ProviderBreakdown } from "./ProviderBreakdown.tsx";
import { StatusRows } from "./StatusRows.tsx";
import { TodaySpend } from "./TodaySpend.tsx";
import { Warnings } from "./Warnings.tsx";

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

export function Dashboard(p: Props) {
  return (
    <Box flexDirection="column">
      <Panel paddingY={1}>
        <Header />
        <Section>
          <TodaySpend totalCents={p.totalCents} />
        </Section>
        <Section>
          <ProviderBreakdown shares={p.breakdown} />
        </Section>
        <NextAlert totalCents={p.totalCents} intervalCents={p.settings.intervalCents} enabled={p.settings.enabled} />
        <Section>
          <StatusRows settings={p.settings} lastAlertedCents={p.lastAlertedCents} daemon={p.daemon} />
        </Section>
      </Panel>
      {p.banner && <AlertBanner alert={p.banner} />}
      <Warnings pricesError={p.pricesError} unknownModels={p.unknownModels} pricesFile={p.pricesFile} daemonAlive={p.daemon.alive} />
      {p.notice && !p.banner && <Text color="green"> {p.notice}</Text>}
      <KeyHints />
    </Box>
  );
}
