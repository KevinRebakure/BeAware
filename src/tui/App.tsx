import { useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import type { AlertResult } from "../core/alerts.ts";
import { formatCents } from "../core/money.ts";
import type { Settings as S, Store } from "../db/store.ts";
import { pricesPath } from "../db/paths.ts";
import { addSpend, updateSettings, type SyncResult } from "../service.ts";
import { AddSpend } from "./AddSpend.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { Settings } from "./Settings.tsx";

type Screen = "dashboard" | "add" | "settings";

export function App({ store, sync }: { store: Store; sync: () => SyncResult }) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [, setTick] = useState(0);
  const [banner, setBanner] = useState<{ alert: AlertResult; totalCents: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warn, setWarn] = useState<{ unknownModels: string[]; pricesError: string | null }>({
    unknownModels: [],
    pricesError: null,
  });
  const refresh = () => setTick((t) => t + 1);

  // Pull in new Claude Code usage now and every 10s. Totals are read from the store on every
  // render, so the redraw also picks up day rollover.
  useEffect(() => {
    const run = () => {
      const r = sync();
      setWarn({ unknownModels: r.unknownModels, pricesError: r.pricesError });
      if (r.alert) setBanner({ alert: r.alert, totalCents: r.totalCents });
      refresh();
    };
    const first = setTimeout(run, 0); // let the first frame render before the initial (blocking) import
    const id = setInterval(run, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  useInput(
    (input) => {
      if (banner) return setBanner(null);
      setNotice(null);
      if (input === "q") exit();
      if (input === "a") setScreen("add");
      if (input === "s") setScreen("settings");
      if (input === "r") refresh();
    },
    { isActive: screen === "dashboard" },
  );

  if (screen === "add") {
    return (
      <AddSpend
        onCancel={() => setScreen("dashboard")}
        onSubmit={(cents) => {
          const r = addSpend(store, cents);
          setBanner(r.alert ? { alert: r.alert, totalCents: r.totalCents } : null);
          setNotice(`Added ${formatCents(cents)} · today ${formatCents(r.totalCents)}`);
          setScreen("dashboard");
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <Settings
        settings={store.getSettings()}
        onChange={(s: S) => {
          const reset = updateSettings(store, s);
          refresh();
          return reset;
        }}
        onReset={() => {
          store.resetDay();
          refresh();
        }}
        onBack={() => setScreen("dashboard")}
      />
    );
  }

  return (
    <Dashboard
      totalCents={store.total()}
      lastAlertedCents={store.lastAlerted()}
      settings={store.getSettings()}
      banner={banner}
      notice={notice}
      unknownModels={warn.unknownModels}
      pricesError={warn.pricesError}
      pricesFile={pricesPath()}
    />
  );
}
