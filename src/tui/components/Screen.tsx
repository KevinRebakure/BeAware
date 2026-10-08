import { Box, useWindowSize } from "ink";
import { createContext, useContext, type ReactNode } from "react";

/** The UI never gets wider than this, however big the terminal is; it shrinks to fit a narrower one. */
const MAX_WIDTH = 56;

const ContentWidth = createContext(MAX_WIDTH);

/** Width of the centred content column; panels size themselves from it. */
export const useContentWidth = () => useContext(ContentWidth);

/**
 * Root of every screen: a content column as wide as the terminal up to MAX_WIDTH, pinned to the top-left corner. This
 * is the only place that reads the terminal size.
 */
export function Screen({ children }: { children: ReactNode }) {
  const width = Math.min(useWindowSize().columns, MAX_WIDTH);
  return (
    <ContentWidth.Provider value={width}>
      <Box flexDirection="column" width={width}>
        {children}
      </Box>
    </ContentWidth.Provider>
  );
}
