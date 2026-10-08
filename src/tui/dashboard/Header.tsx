import { Box, Text } from "ink";
import { VERSION } from "../../version.ts";

export function Header() {
  return (
    <Box justifyContent="space-between">
      <Text bold>BeAware</Text>
      <Text dimColor>v{VERSION}</Text>
    </Box>
  );
}
