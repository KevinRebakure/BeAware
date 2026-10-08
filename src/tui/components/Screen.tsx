import { Box, useWindowSize } from "ink";
import { createContext, useContext, type ReactNode } from "react";

/** The UI grows with the terminal up to this many columns, then stays centred. */
const MAX_WIDTH = 100;

const ContentWidth = createContext(MAX_WIDTH);

/** Width of the centred content column; panels size themselves from it. */
export const useContentWidth = () => useContext(ContentWidth);

/**
 * Root of every screen: a content column that fills the terminal up to MAX_WIDTH, centred horizontally. This is the
 * only place that reads the terminal size. Height is left to the content so it stays pinned to the top instead of
 * jumping when a banner or warning appears.
 */
export function Screen({ children }: { children: ReactNode }) {
  const width = Math.min(useWindowSize().columns, MAX_WIDTH);
  return (
    <ContentWidth.Provider value={width}>
      <Box width="100%" justifyContent="center">
        <Box flexDirection="column" width={width}>
          {children}
        </Box>
      </Box>
    </ContentWidth.Provider>
  );
}
