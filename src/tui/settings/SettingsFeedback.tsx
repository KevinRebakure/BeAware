import { Text } from "ink";

type Props = { error: string; note: string; confirmingReset: boolean };

/** Validation error, "baseline reset" note, and the y/n prompt for deleting manual spend. */
export function SettingsFeedback({ error, note, confirmingReset }: Props) {
  return (
    <>
      {error && <Text color="red">{error}</Text>}
      {note && <Text color="yellow">{note}</Text>}
      {confirmingReset && (
        <Text color="yellow">{"\n"}Delete all manually added spend? Usage read from your tools is kept. y/n</Text>
      )}
    </>
  );
}
