import { Text } from "ink";

/** Two rows so the hints stay readable in the narrow content column instead of wrapping mid-phrase. */
export function KeyHints() {
  return (
    <>
      <Text dimColor> a add spend s settings r refresh</Text>
      <Text dimColor> d restart daemon i install q quit</Text>
    </>
  );
}
