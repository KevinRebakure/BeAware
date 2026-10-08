import { Box } from "ink";
import { createContext, useContext, type ReactNode } from "react";
import { useContentWidth } from "./Screen.tsx";

const PADDING_X = 2;
const BORDER = 1;

const InnerWidth = createContext(0);

/** Usable width inside the enclosing Panel (its width minus border and padding), e.g. for a bar that should span it. */
export const usePanelInnerWidth = () => useContext(InnerWidth);

/** Every screen draws inside the same rounded box, which fills the content column (see Screen). */
export function Panel({ children, paddingY = 0, borderColor }: { children: ReactNode; paddingY?: number; borderColor?: string }) {
  const inner = Math.max(0, useContentWidth() - 2 * (BORDER + PADDING_X));
  return (
    <InnerWidth.Provider value={inner}>
      <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={PADDING_X} paddingY={paddingY} width="100%">
        {children}
      </Box>
    </InnerWidth.Provider>
  );
}
