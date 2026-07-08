/** Einheitliche ~15 %-Vergrößerung für Stundenplan-UI */
export const SCHEDULE_UI_SCALE = 1.15;

export function schedulePx(value: number): number {
  return Math.round(value * SCHEDULE_UI_SCALE);
}

export function scheduleRem(value: number): string {
  return `${(value * SCHEDULE_UI_SCALE).toFixed(3)}rem`;
}
