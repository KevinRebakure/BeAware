import { Text } from "ink";
import { formatCents } from "../../core/money.ts";

/** Today's total. It mixes estimated and reported sources, hence "est."; the breakdown below says which is which. */
export function TodaySpend({ totalCents }: { totalCents: number }) {
  return (
    <>
      <Text dimColor>TODAY · est.</Text>
      <Text bold>{formatCents(totalCents)}</Text>
    </>
  );
}
