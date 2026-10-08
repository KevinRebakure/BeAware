import { Box, Text } from "ink";
import { Panel } from "../components/Panel.tsx";
import { SettingRow } from "./SettingRow.tsx";
import { SettingsFeedback } from "./SettingsFeedback.tsx";
import { SettingsHint } from "./SettingsHint.tsx";
import { displayValue, EDIT_PREFIX, ITEMS, valueColor } from "./items.ts";
import { useSettingsScreen, type SettingsScreenProps } from "./useSettingsScreen.ts";

export function Settings(props: SettingsScreenProps) {
  const { cursor, mode, draft, error, note, changeDraft, submit } = useSettingsScreen(props);
  const { settings } = props;

  return (
    <Panel paddingY={1}>
      <Text bold>Settings</Text>
      <Box marginTop={1} flexDirection="column">
        {ITEMS.map(({ id, label }, i) => (
          <SettingRow
            key={id}
            label={label}
            selected={i === cursor}
            value={displayValue(id, settings)}
            valueColor={valueColor(id, settings)}
            edit={
              mode === "edit" && i === cursor
                ? { prefix: EDIT_PREFIX[id] ?? "", draft, onChange: changeDraft, onSubmit: submit }
                : undefined
            }
          />
        ))}
      </Box>
      <SettingsFeedback error={error} note={note} confirmingReset={mode === "confirm"} />
      <SettingsHint mode={mode} />
    </Panel>
  );
}
