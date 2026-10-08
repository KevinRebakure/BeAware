import { Box } from "ink";
import type { ReactNode } from "react";

/** A block of a panel, separated from the one above by a blank line. */
export function Section({ children }: { children: ReactNode }) {
  return (
    <Box marginTop={1} flexDirection="column">
      {children}
    </Box>
  );
}
