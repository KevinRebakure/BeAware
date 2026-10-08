/**
 * Copilot meters usage in AI credits; GitHub's docs say 1 AI credit = $0.01. The CLI records cost in
 * nano-AIU, and 1 AIU = 1 credit = 1e9 nano-AIU is inferred from that field's values, not documented.
 * Everything that converts nano-AIU to dollars goes through here, so a correction is a one-line change.
 */
export const NANO_AIU_PER_USD = 1e11;

const MICROS_PER_USD = 1_000_000;

export function nanoAiuToMicros(nanoAiu: number): number {
  return Math.round((nanoAiu / NANO_AIU_PER_USD) * MICROS_PER_USD);
}
