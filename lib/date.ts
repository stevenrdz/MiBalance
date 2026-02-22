import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth
} from "date-fns";
import { APP_TIMEZONE } from "@/lib/constants";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type DateRange = {
  from: string;
  to: string;
};

export function nowInEc() {
  const localIso = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  return new Date(localIso);
}

export function currentMonthRange(): DateRange {
  const now = nowInEc();
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd")
  };
}

export function sanitizeRange(from?: string, to?: string): DateRange {
  const fallback = currentMonthRange();
  if (!from || !to) return fallback;

  const start = parseISO(from);
  const end = parseISO(to);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || isAfter(start, end)) {
    return fallback;
  }

  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd")
  };
}

export function inRange(target: string, from: string, to: string) {
  const value = parseISO(target);
  const start = parseISO(from);
  const end = parseISO(to);
  return !isBefore(value, start) && !isAfter(value, end);
}

export function getCardCycle(
  statementDay: number,
  referenceDate = nowInEc()
): { start: string; end: string } {
  const year = Number(format(referenceDate, "yyyy"));
  const month = Number(format(referenceDate, "M"));
  const day = Number(format(referenceDate, "d"));

  const safeDate = (targetYear: number, targetMonth: number, targetDay: number) => {
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    return new Date(targetYear, targetMonth - 1, Math.min(targetDay, lastDay));
  };

  const currentStatement = fromZonedTime(
    safeDate(year, month, statementDay),
    APP_TIMEZONE
  );
  const nextStatement = addMonths(currentStatement, 1);
  const previousStatement = addMonths(currentStatement, -1);

  const start = day >= statementDay ? currentStatement : previousStatement;
  const end = addDays(day >= statementDay ? nextStatement : currentStatement, -1);

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd")
  };
}
