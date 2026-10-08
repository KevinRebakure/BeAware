import { useApp, useInput } from "ink";
import { useEffect, useState } from "react";
import { formatCents } from "../core/money.ts";
import type { Store } from "../db/store.ts";
import { pricesPath } from "../db/paths.ts";
import { isAlive } from "../db/repositories/heartbeat.ts";
import { install, restart } from "../launchd.ts";
import { clearManualSpend, updateSettings } from "../service.ts";
import { AddSpend } from "./AddSpend.tsx";
import { Dashboard } from "./Dashboard.tsx";
import { Settings } from "./Settings.tsx";

type Screen = "dashboard" | "add" | "settings";

export function App({ store }: { store: Store }) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [, setTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = () => setTick((t) => t + 1);

  // The daemon owns syncing and alerts; the TUI only re-reads the shared database.
  useEffect(() => {
    const id = setInterval(refresh, 2_000);
    return () => clearInterval(id);
  }, []);

  const hb = store.getHeartbeat();
  const pending = store.getPendingAlert();

  useInput(
    (input) => {
      if (pending) {
        store.dismissLastAlert();
        return refresh();
      }
      setNotice(null);
      if (input === "q") exit();
      if (input === "a") setScreen("add");
      if (input === "s") setScreen("settings");
      if (input === "r") refresh();
      if (input === "d") setNotice(restart() ? "Daemon restarting…" : "Could not restart the daemon (is it installed?)");
      if (input === "i") {
        try {
          install();
          setNotice("Daemon installed");
        } catch (e) {
          setNotice((e as Error).message);
        }
      }
    },
    { isActive: screen === "dashboard" },
  );

  if (screen === "add") {
    return (
      <AddSpend
        onCancel={() => setScreen("dashboard")}
        onSubmit={(cents) => {
          store.addSpend(cents); // the daemon raises any alert on its next tick
          setNotice(`Added ${formatCents(cents)} · today ${formatCents(store.total())}`);
          setScreen("dashboard");
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <Settings
        settings={store.getSettings()}
        onChange={(s) => {
          const reset = updateSettings(store, s);
          refresh();
          return reset;
        }}
        onResetManual={() => {
          clearManualSpend(store);
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
      banner={pending}
      notice={notice}
      unknownModels={hb?.unknownModels ?? []}
      pricesError={hb?.pricesError ?? null}
      daemon={{ alive: isAlive(hb), lastSync: hb?.at ?? null }}
      pricesFile={pricesPath()}
    />
  );
}
