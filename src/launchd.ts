import { chmodSync, copyFileSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { logPath, PATH_ENV_VARS } from "./db/paths.ts";

const LABEL = "com.beaware.daemon";

const binPath = () => join(homedir(), ".local", "bin", "beaware");
const plistPath = () => join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
const domain = () => `gui/${process.getuid?.() ?? 501}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The LaunchAgent definition: start at login, restart on exit, log to a file. */
export function plistXml(bin: string, log: string, env: Record<string, string | undefined> = {}): string {
  const vars: Record<string, string> = { PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin" };
  for (const k of PATH_ENV_VARS) if (env[k]) vars[k] = env[k]!;
  const envXml = Object.entries(vars)
    .map(([k, v]) => `    <key>${esc(k)}</key><string>${esc(v)}</string>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>${esc(bin)}</string><string>daemon</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${esc(log)}</string>
  <key>StandardErrorPath</key><string>${esc(log)}</string>
  <key>EnvironmentVariables</key>
  <dict>
${envXml}
  </dict>
</dict>
</plist>
`;
}

function launchctl(...args: string[]) {
  const p = Bun.spawnSync(["launchctl", ...args], { stdout: "pipe", stderr: "pipe" });
  return { ok: p.exitCode === 0, out: p.stdout.toString() + p.stderr.toString() };
}

export function isLoaded(): boolean {
  return launchctl("print", `${domain()}/${LABEL}`).ok;
}

/** Restart the loaded agent (kill + start). */
export function restart(): boolean {
  return launchctl("kickstart", "-k", `${domain()}/${LABEL}`).ok;
}

/** Copy this binary to ~/.local/bin and (re)register the LaunchAgent. Safe to run repeatedly. */
export function install(): string[] {
  if (process.platform !== "darwin") throw new Error("install is only supported on macOS");
  const src = process.execPath;
  if (/\/bun$/.test(src)) {
    throw new Error("run install from the compiled binary: bun run build && ./dist/beaware install");
  }
  const notes: string[] = [];
  const dest = binPath();
  mkdirSync(dirname(dest), { recursive: true });
  if (src !== dest) {
    const tmp = `${dest}.new`;
    copyFileSync(src, tmp);
    chmodSync(tmp, 0o755);
    renameSync(tmp, dest);
  }
  mkdirSync(dirname(logPath()), { recursive: true });
  mkdirSync(dirname(plistPath()), { recursive: true });
  writeFileSync(plistPath(), plistXml(dest, logPath(), process.env));

  launchctl("bootout", `${domain()}/${LABEL}`); // not loaded yet is fine
  // bootout returns before launchd has finished removing the service, so an immediate bootstrap can fail with EIO.
  // Retry the bootstrap itself, for up to ~5s.
  let r = launchctl("bootstrap", domain(), plistPath());
  for (let i = 0; !r.ok && i < 20; i++) {
    Bun.sleepSync(250);
    r = launchctl("bootstrap", domain(), plistPath());
  }
  if (!r.ok) throw new Error(`launchctl bootstrap failed: ${r.out.trim()}`);
  notes.push(`installed ${dest}`, `agent ${LABEL} loaded; logs: ${logPath()}`);
  if (!(process.env.PATH ?? "").split(":").includes(dirname(dest))) {
    notes.push(`note: ${dirname(dest)} is not on your PATH; add it to run \`beaware\` from anywhere`);
  }
  return notes;
}

export function uninstall(): string[] {
  launchctl("bootout", `${domain()}/${LABEL}`);
  const had = existsSync(plistPath());
  rmSync(plistPath(), { force: true });
  return [had ? "agent removed" : "agent was not installed", `your data is kept; binary left at ${binPath()}`];
}
