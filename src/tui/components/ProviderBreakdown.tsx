import { Box, Text } from "ink";
import { formatCents } from "../../core/money.ts";
import type { ProviderShare } from "../../providers/breakdown.ts";

/** Today's spend per provider: dollars, share of the total, and how each source's figure was obtained. */
export function ProviderBreakdown({ shares }: { shares: ProviderShare[] }) {
  if (shares.length === 0) return null;
  return (
    <Box flexDirection="column">
      {shares.map((p) => {
        const single = p.sources.length === 1 ? p.sources[0]! : null;
        return (
          <Box key={p.label} flexDirection="column">
            <Box justifyContent="space-between">
              <Text>
                {p.label}
                {single && <Text dimColor> · {single.tag}</Text>}
              </Text>
              <Text>
                {formatCents(p.cents)} <Text dimColor>{String(p.percent).padStart(3)}%</Text>
              </Text>
            </Box>
            {!single &&
              p.sources.map((s) => (
                <Box key={s.label} justifyContent="space-between">
                  <Text dimColor>
                    {"  "}
                    {s.label} · {s.tag}
                  </Text>
                  <Text dimColor>{formatCents(s.cents)}</Text>
                </Box>
              ))}
          </Box>
        );
      })}
    </Box>
  );
}
