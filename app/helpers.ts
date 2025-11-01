export function withinLastHour(date?: Date) {
  if (!date) return false;
  return date.getTime() > Date.now() - 3600_000;
}

export function createValidator<T extends string[]>(...allowed: T) {
  return function validator(value: string | undefined): value is T[number] {
    if (value == null) throw new Error("Value is undefined");
    return allowed.includes(value);
  };
}
