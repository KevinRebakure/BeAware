import { expect, test } from "bun:test";
import { evaluate } from "../src/core/alerts.ts";
import { alertText, notificationCommand, notifyAlert } from "../src/notify.ts";

const alert = (total: number) => evaluate({ totalCents: total, intervalCents: 2500, lastAlertedCents: 0 });

test("title shows the current total, not the milestone", () => {
  expect(alertText(alert(7800), 7800).title).toBe("BeAware: spending milestone reached $78.00");
});

test("body shows crossed count and next alert", () => {
  expect(alertText(alert(7800), 7800).body).toBe("3 milestones crossed · next alert $100.00");
  expect(alertText(alert(2600), 2600).body).toBe("1 milestone crossed · next alert $50.00");
});

test("macOS uses osascript with text passed as argv", () => {
  const cmd = notificationCommand("darwin", 'a "t" $x', "it's \"b\"")!;
  expect(cmd[0]).toBe("osascript");
  expect(cmd.slice(-2)).toEqual(["it's \"b\"", 'a "t" $x']);
  expect(cmd.join(" ")).toContain('sound name "Glass"');
});

test("linux uses notify-send; other platforms are unsupported", () => {
  expect(notificationCommand("linux", "T", "B")).toEqual(["notify-send", "--app-name=BeAware", "T", "B"]);
  expect(notificationCommand("win32", "T", "B")).toBeNull();
});

test("notifyAlert spawns once and never throws", () => {
  const calls: string[][] = [];
  notifyAlert(alert(2500), 2500, (cmd) => calls.push(cmd), "linux");
  expect(calls).toHaveLength(1);
  expect(calls[0]![0]).toBe("notify-send");

  expect(() =>
    notifyAlert(alert(2500), 2500, () => {
      throw new Error("ENOENT");
    }, "linux"),
  ).not.toThrow();

  const none: string[][] = [];
  notifyAlert(alert(2500), 2500, (cmd) => none.push(cmd), "win32");
  expect(none).toHaveLength(0);
});
