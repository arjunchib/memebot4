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

export function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    ignorePunctuation: true,
  });
}

export function compareCommands(name?: string) {
  return (a: string, b: string) => {
    if (a === name) return -1;
    if (b === name) return 1;
    return compareStrings(a, b);
  };
}

export function sqlToFilename(sqlQuery: string) {
  return sqlQuery
    .replace(/[\s]+/g, "_") // Replace whitespace with underscores
    .replace(/[^a-zA-Z0-9_\-\.]/g, "") // Strip illegal characters
    .replace(/_{2,}/g, "_") // Collapse multiple underscores
    .substring(0, 200) // Truncate to safe length
    .replace(/^_+|_+$/g, ""); // Trim leading/trailing underscores
}

export function sqlToCsv(results: unknown[]) {
  let csv = Object.keys(results[0] as any).join(",");
  csv += "\n";
  csv += results
    .map((result: any) => Object.values(result).join(","))
    .join("\n");
  return csv;
}

export function formatDuration(value: number) {
  const duration = Temporal.Duration.from(`PT${value.toFixed(9)}S`);
  const showMs = duration.seconds < 60;
  return new Intl.DurationFormat("en", {
    style: "narrow",
    milliseconds: "numeric",
    fractionalDigits: showMs ? 1 : 0,
  }).format(
    duration.round({
      smallestUnit: showMs ? "milliseconds" : "seconds",
      largestUnit: "days",
    }),
  );
}
