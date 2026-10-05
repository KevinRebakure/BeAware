export type AlertInput = {
  totalCents: number;
  intervalCents: number;
  /** Highest milestone already alerted today (0 if none). */
  lastAlertedCents: number;
};

export type AlertResult = {
  /** Number of new milestones crossed since the last alert. */
  crossed: number;
  /** Highest milestone currently reached (0 if none). */
  reachedCents: number;
  nextCents: number;
};

export function evaluate({ totalCents, intervalCents, lastAlertedCents }: AlertInput): AlertResult {
  const reachedCents = Math.floor(totalCents / intervalCents) * intervalCents;
  const crossed = Math.max(0, Math.round((reachedCents - lastAlertedCents) / intervalCents));
  return { crossed, reachedCents, nextCents: reachedCents + intervalCents };
}
