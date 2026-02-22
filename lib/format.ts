import { formatInTimeZone } from "date-fns-tz";
import { APP_CURRENCY, APP_LOCALE, APP_TIMEZONE } from "@/lib/constants";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
    minimumFractionDigits: 2
  }).format(value ?? 0);
}

export function formatDateEc(value: Date | string) {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "dd/MM/yyyy");
}

export function asInputDate(value: Date | string) {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "yyyy-MM-dd");
}

