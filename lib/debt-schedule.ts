import { addMonths, endOfMonth, format, isBefore, parseISO, startOfDay } from "date-fns";

export type DebtSchedulePayment = {
  installment_number: number | null;
  amount: number;
  payment_date: string;
};

export type DebtInstallmentStatus =
  | "HISTORICAL"
  | "UPCOMING"
  | "PENDING"
  | "OVERDUE"
  | "PARTIAL"
  | "PAID";

export type DebtInstallment = {
  number: number;
  label: string;
  dueDate: string;
  scheduledAmount: number | null;
  paidAmount: number;
  remainingAmount: number | null;
  status: DebtInstallmentStatus;
  isCurrentInstallment: boolean;
};

type BuildDebtScheduleParams = {
  startDate: string;
  termMonths: number | null;
  paymentDay: number | null;
  installmentAmount: number | null;
  currentInstallment: number;
  payments: DebtSchedulePayment[];
  referenceDate?: Date;
};

function getSafeDueDate(baseDate: Date, paymentDay: number | null) {
  const fallbackDay = Number(format(baseDate, "d"));
  const targetDay = paymentDay ?? fallbackDay;
  const lastDay = Number(format(endOfMonth(baseDate), "d"));
  return new Date(
    Number(format(baseDate, "yyyy")),
    Number(format(baseDate, "M")) - 1,
    Math.min(targetDay, lastDay)
  );
}

export function buildDebtSchedule({
  startDate,
  termMonths,
  paymentDay,
  installmentAmount,
  currentInstallment,
  payments,
  referenceDate = new Date()
}: BuildDebtScheduleParams): DebtInstallment[] {
  if (!termMonths || termMonths <= 0) return [];

  const paymentMap = new Map<number, number>();
  payments.forEach((payment) => {
    if (!payment.installment_number) return;
    const previous = paymentMap.get(payment.installment_number) ?? 0;
    paymentMap.set(payment.installment_number, previous + Number(payment.amount));
  });

  const today = startOfDay(referenceDate);
  const safeCurrentInstallment = Math.max(currentInstallment || 1, 1);

  return Array.from({ length: termMonths }, (_, index) => {
    const number = index + 1;
    const periodDate = addMonths(parseISO(startDate), index);
    const dueDate = getSafeDueDate(periodDate, paymentDay);
    const dueDateText = format(dueDate, "yyyy-MM-dd");
    const paidAmount = paymentMap.get(number) ?? 0;
    const remainingAmount =
      installmentAmount != null ? Math.max(Number(installmentAmount) - paidAmount, 0) : null;

    let status: DebtInstallmentStatus;
    if (remainingAmount === 0 && installmentAmount != null) {
      status = "PAID";
    } else if (number < safeCurrentInstallment && paidAmount === 0) {
      status = "HISTORICAL";
    } else if (isBefore(dueDate, today)) {
      status = paidAmount > 0 ? "PARTIAL" : "OVERDUE";
    } else if (number === safeCurrentInstallment) {
      status = paidAmount > 0 ? "PARTIAL" : "PENDING";
    } else {
      status = paidAmount > 0 ? "PARTIAL" : "UPCOMING";
    }

    if (installmentAmount == null && paidAmount > 0) {
      status = "PAID";
    }

    return {
      number,
      label: `Cuota ${number}`,
      dueDate: dueDateText,
      scheduledAmount: installmentAmount,
      paidAmount,
      remainingAmount,
      status,
      isCurrentInstallment: number === safeCurrentInstallment
    };
  });
}
