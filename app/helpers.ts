export function withinLastHour(date?: Date) {
  if (!date) return false;
  return date.getTime() > Date.now() - 3600_000;
}
