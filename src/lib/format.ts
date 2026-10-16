import type { Measure, PersonalBest } from "./progress";

// Number formatting for the views, in the app's locale (57,5 in Polish).
// Units are returned apart so a view can translate "reps".

export type Unit = "kg" | "s" | "reps";

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    value,
  );
}

export function unitOf(measure: Measure): Unit {
  switch (measure) {
    case "topWeight":
    case "estimatedMax":
    case "volume":
      return "kg";
    case "bestReps":
    case "totalReps":
      return "reps";
    case "longest":
    case "totalTime":
      return "s";
  }
}

/** "100 kg × 3", "20" (reps) or "61 s" — without the reps unit. */
export function formatPersonalBest(best: PersonalBest, locale: string): string {
  switch (best.kind) {
    case "weight":
      return `${formatNumber(best.weight, locale)} kg × ${formatNumber(best.reps, locale)}`;
    case "reps":
      return formatNumber(best.reps, locale);
    case "time":
      return `${formatNumber(best.seconds, locale)} s`;
  }
}

/** "6, 5, 5" */
export function formatList(values: number[], locale: string): string {
  return values.map((value) => formatNumber(value, locale)).join(", ");
}

/** A session's ISO date as the locale's short date. */
export function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

/** An ISO time as the locale's date and time, e.g. for "last updated". */
export function formatDateTime(time: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(time));
}
