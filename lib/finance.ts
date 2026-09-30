export function getLocalWeekStartKey(date: Date) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = new Date(Date.UTC(year, month - 1, day - mondayOffset));

  return monday.toISOString().slice(0, 10);
}

export function calculateAverageDailySpending(expenses: string | number, elapsedDays: number) {
  const amount = Number(expenses);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(elapsedDays)) return 0;

  return amount / Math.max(1, Math.floor(elapsedDays));
}

export function calculateSafeToSpend(balance: string | number, daysLeftIncludingToday: number) {
  const availableBalance = Number(balance);
  const remainingDays = Math.floor(daysLeftIncludingToday);
  if (!Number.isFinite(availableBalance) || availableBalance <= 0 || !Number.isFinite(remainingDays) || remainingDays <= 0) return 0;

  return availableBalance / remainingDays;
}

export function calculatePercentageChange(current: string | number, previous: string | number) {
  const currentAmount = Number(current);
  const previousAmount = Number(previous);
  if (!Number.isFinite(currentAmount) || !Number.isFinite(previousAmount) || previousAmount <= 0) return null;

  return Math.round(((currentAmount - previousAmount) / previousAmount) * 1000) / 10;
}

export function findLargestByAmount<T extends { amount: string | number }>(items: T[]) {
  return items.reduce<T | null>((largest, item) => {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) return largest;
    return largest === null || amount > Number(largest.amount) ? item : largest;
  }, null);
}
