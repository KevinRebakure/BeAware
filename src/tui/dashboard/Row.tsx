import { Box, Text } from "ink";

/** A dim label on the left, a value on the right. */
export function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box justifyContent="space-between">
      <Text dimColor>{label}</Text>
      <Text color={color}>{value}</Text>
    </Box>
  );
}
