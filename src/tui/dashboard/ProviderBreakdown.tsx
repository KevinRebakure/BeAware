import { Box, Text } from "ink";
import { formatCents } from "../../core/money.ts";
import type { ProviderShare } from "../../providers/breakdown.ts";
import { ProgressBar } from "../components/ProgressBar.tsx";

/** Each provider's brand colour, so it stays the same however many providers are listed. */
const PROVIDER_COLORS: Record<string, string> = {
  "claude-code": "#d97757", // Claude orange
  copilot: "#8957e5", // GitHub Copilot purple
  manual: "gray",
};
/** For providers added later without an entry above. */
const FALLBACK = ["cyan", "yellow", "green", "blue"];

/**
 * Today's spend per provider: dollars, share of the total, a bar of that share, and how the figure was obtained.
 * A provider with several sources (Copilot CLI + VS Code) lists the ones that have spend underneath its bar.
 */
export function ProviderBreakdown({ shares }: { shares: ProviderShare[] }) {
  return (
    <Box flexDirection="column">
      {shares.map((p, i) => {
        const color = PROVIDER_COLORS[p.id] ?? FALLBACK[i % FALLBACK.length];
        const inlineTag = p.tags.length === 1 ? p.tags[0] : null; // multi-source providers tag each source instead
        return (
          <Box key={p.label} flexDirection="column" marginBottom={1}>
            <Box justifyContent="space-between">
              <Text>
                {p.label}
                {inlineTag && <Text dimColor> · {inlineTag}</Text>}
              </Text>
              <Text>
                {formatCents(p.cents)} <Text dimColor>{String(p.percent).padStart(3)}%</Text>
              </Text>
            </Box>
            <ProgressBar ratio={p.percent / 100} color={color} />
            {!inlineTag &&
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
