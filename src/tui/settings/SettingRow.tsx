import { Box, Text } from "ink";
import TextInput from "ink-text-input";

type Props = {
  label: string;
  selected: boolean;
  value: string;
  valueColor?: string;
  /** Present while this row's value is being edited: replaces the value with a text input. */
  edit?: { prefix: string; draft: string; onChange: (v: string) => void; onSubmit: (v: string) => void };
};

export function SettingRow({ label, selected, value, valueColor, edit }: Props) {
  return (
    <Box justifyContent="space-between">
      <Text color={selected ? "cyan" : undefined} bold={selected}>
        {selected ? "› " : "  "}
        {label}
      </Text>
      {edit ? (
        <Box>
          <Text>{edit.prefix}</Text>
          <TextInput value={edit.draft} onChange={edit.onChange} onSubmit={edit.onSubmit} />
        </Box>
      ) : (
        <Text color={valueColor}>{value}</Text>
      )}
    </Box>
  );
}
