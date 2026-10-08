import { Text } from "ink";

type Props = {
  pricesError: string | null;
  unknownModels: string[];
  pricesFile: string;
  daemonAlive: boolean;
};

/** Things that make the numbers wrong or stale, one line each. */
export function Warnings({ pricesError, unknownModels, pricesFile, daemonAlive }: Props) {
  return (
    <>
      {pricesError && <Text color="yellow"> ⚠ {pricesError} — using default prices ({pricesFile})</Text>}
      {unknownModels.length > 0 && (
        <Text color="yellow">
          {" "}⚠ unpriced model{unknownModels.length > 1 ? "s" : ""}: {unknownModels.join(", ")} (counted as $0) — edit {pricesFile}
        </Text>
      )}
      {!daemonAlive && (
        <Text color="yellow"> ⚠ background daemon not running — no live syncing or alerts. Press i to install, d to restart.</Text>
      )}
    </>
  );
}
