import type { Database } from "bun:sqlite";
import type { AlertResult } from "../core/alerts.ts";
import { dayKey, dayRange } from "../core/day.ts";
import type { Usage } from "../core/pricing.ts";
import { openDatabase } from "./config.ts";
import { AlertStateRepo } from "./repositories/alertState.ts";
import { HeartbeatRepo, type HeartbeatInput } from "./repositories/heartbeat.ts";
import { IngestFilesRepo } from "./repositories/ingestFiles.ts";
import { LastAlertRepo } from "./repositories/lastAlert.ts";
import { SettingsRepo, type Settings } from "./repositories/settings.ts";
import { SpendEventsRepo } from "./repositories/spendEvents.ts";

export { DEFAULT_SETTINGS, type Settings } from "./repositories/settings.ts";
export type { StoredAlert } from "./repositories/lastAlert.ts";

/**
 * The single entry point to persistence. It owns the connection and the clock, delegates
 * each entity to its repository, and holds the few operations that span entities (the
 * "current day" depends on settings; today's total depends on the day).
 */
export class Store {
  private db: Database;
  private spend: SpendEventsRepo;
  private settings: SettingsRepo;
  private alertState: AlertStateRepo;
  private ingest: IngestFilesRepo;
  private heartbeat: HeartbeatRepo;
  private alerts: LastAlertRepo;

  constructor(
    path?: string,
    private clock: () => Date = () => new Date(),
  ) {
    this.db = openDatabase(path);
    this.spend = new SpendEventsRepo(this.db, clock);
    this.settings = new SettingsRepo(this.db);
    this.alertState = new AlertStateRepo(this.db);
    this.ingest = new IngestFilesRepo(this.db);
    this.heartbeat = new HeartbeatRepo(this.db, clock);
    this.alerts = new LastAlertRepo(this.db, clock);
  }

  close() {
    this.db.close();
  }

  tx(fn: () => void) {
    this.db.transaction(fn)();
  }

  // --- day & totals (span settings + spend) ---

  /** The day the clock is in right now, per the current start-hour setting. */
  private currentDay(): string {
    return dayKey(this.clock(), this.getSettings().dayStartHour);
  }

  /** Today's total in whole cents (rounded down). */
  total(day = this.currentDay()): number {
    const [start, end] = dayRange(day, this.getSettings().dayStartHour);
    return this.spend.totalCents(start, end);
  }

  // --- spend events ---

  addSpend(cents: number) {
    this.spend.addManual(cents);
  }

  clearManual() {
    this.spend.clearManual();
  }

  upsertClaude(ev: { key: string; model: string; at: string; usage: Usage }, amountMicros: number) {
    this.spend.upsertClaude(ev, amountMicros);
  }

  claudeModels(): string[] {
    return this.spend.claudeModels();
  }

  repriceClaude(cost: (model: string, usage: Usage) => number): boolean {
    return this.spend.repriceClaude(cost);
  }

  // --- settings & internal flags ---

  getSettings(): Settings {
    return this.settings.get();
  }

  saveSettings(s: Settings) {
    this.settings.save(s);
  }

  isFirstSync(): boolean {
    return this.settings.isFirstSync();
  }

  markSynced() {
    this.settings.markSynced();
  }

  // --- alert baseline ---

  lastAlerted(day = this.currentDay()): number {
    return this.alertState.get(day);
  }

  setLastAlerted(cents: number, day = this.currentDay()) {
    this.alertState.set(day, cents);
  }

  // --- ingest offsets ---

  getOffset(path: string): number | null {
    return this.ingest.getOffset(path);
  }

  setOffset(path: string, offset: number) {
    this.ingest.setOffset(path, offset);
  }

  // --- daemon heartbeat ---

  writeHeartbeat(h: HeartbeatInput) {
    this.heartbeat.write(h);
  }

  getHeartbeat() {
    return this.heartbeat.get();
  }

  // --- last alert ---

  saveLastAlert(a: AlertResult, totalCents: number) {
    this.alerts.save(a, totalCents);
  }

  getPendingAlert() {
    return this.alerts.getPending();
  }

  dismissLastAlert() {
    this.alerts.dismiss();
  }
}
