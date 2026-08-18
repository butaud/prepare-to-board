export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const CALENDAR_COMPLETION_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

// Recurring calendar items don't track a "done" flag per se - they're
// considered completed for the current cycle as long as they were last
// completed within the past 12 months, and revert to incomplete once that
// window lapses (so they show up as needing attention again next year).
export const isCalendarItemCompleted = (
  completedOn: number | undefined,
  referenceDate: Date = new Date()
): boolean =>
  completedOn !== undefined &&
  referenceDate.getTime() - completedOn < CALENDAR_COMPLETION_WINDOW_MS;

// Month numbers (1-12) in display order starting from `startMonth`, e.g.
// orderMonthsFrom(7) => [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].
export const orderMonthsFrom = (startMonth: number): number[] =>
  Array.from({ length: 12 }, (_, i) => ((startMonth - 1 + i) % 12) + 1);

// Month numbers (1-12), in chronological order, for the trailing
// `contextMonths`, the month of `referenceDate`, and the upcoming
// `contextMonths` - wrapping across year boundaries. Since calendar items
// only carry a month number (not a year), "trailing"/"upcoming" is always
// relative to the reference month only.
export const monthsWithinContext = (
  referenceDate: Date,
  contextMonths: number
): number[] => {
  const referenceMonth = referenceDate.getMonth() + 1;
  const months: number[] = [];
  const seen = new Set<number>();
  for (let offset = -contextMonths; offset <= contextMonths; offset++) {
    const month = (((referenceMonth - 1 + offset) % 12) + 12) % 12 + 1;
    if (seen.has(month)) continue;
    seen.add(month);
    months.push(month);
  }
  return months;
};
