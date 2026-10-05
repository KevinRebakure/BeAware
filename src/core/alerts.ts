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

/** Highest milestone at or below `totalCents` (0 if none). The one place the milestone grid is defined. */
export function milestoneFloor(totalCents: number, intervalCents: number): number {
  return Math.floor(totalCents / intervalCents) * intervalCents;
}

export function evaluate({ totalCents, intervalCents, lastAlertedCents }: AlertInput): AlertResult {
  const reachedCents = milestoneFloor(totalCents, intervalCents);
  const crossed = Math.max(0, Math.round((reachedCents - lastAlertedCents) / intervalCents));
  return { crossed, reachedCents, nextCents: reachedCents + intervalCents };
}
