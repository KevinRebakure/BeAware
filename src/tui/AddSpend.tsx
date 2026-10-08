import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { parsePositiveCents } from "../core/money.ts";
import { Panel } from "./components/Panel.tsx";

export function AddSpend({ onSubmit, onCancel }: { onSubmit: (cents: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  useInput((_, key) => key.escape && onCancel());

  return (
    <Panel paddingY={1}>
      <Text bold>Add spending</Text>
      <Box marginTop={1}>
        <Text>Amount: $ </Text>
        <TextInput
          value={value}
          onChange={(v) => {
            setValue(v);
            setError("");
          }}
          onSubmit={(v) => {
            const cents = parsePositiveCents(v);
            if (cents === null) return setError("Enter an amount like 4.25");
            onSubmit(cents);
          }}
        />
      </Box>
      {error && <Text color="red">{error}</Text>}
      <Text dimColor>{"\n"}enter add esc cancel</Text>
    </Panel>
  );
}
