import { Box } from "ink";
import type { ReactNode } from "react";

/** Every screen draws inside the same fixed-width rounded box. */
export const PANEL_WIDTH = 56;

export function Panel({ children, paddingY = 0, borderColor }: { children: ReactNode; paddingY?: number; borderColor?: string }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={2} paddingY={paddingY} width={PANEL_WIDTH}>
      {children}
    </Box>
  );
}
