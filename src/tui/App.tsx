import { useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import type { AlertResult } from "../core/alerts.ts";
import { formatCents } from "../core/money.ts";
import type { Settings as S, Store } from "../db/store.ts";
import { addSpend, updateSettings } from "../service.ts";
import { AddSpend } from "./AddSpend.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { Settings } from "./Settings.tsx";

type Screen = "dashboard" | "add" | "settings";

export function App({ store }: { store: Store }) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [, setTick] = useState(0);
  const [banner, setBanner] = useState<{ alert: AlertResult; totalCents: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = () => setTick((t) => t + 1);

  // Totals are read from the store on every render, so a periodic redraw picks up day rollover.
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
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
    />
  );
}
