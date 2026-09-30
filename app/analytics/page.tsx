import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { BottomNavigation } from "@/components/bottom-navigation";
import { WeeklyAnalytics } from "@/components/weekly-analytics";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { calculateAverageDailySpending, calculatePercentageChange, calculateSafeToSpend, findLargestByAmount } from "@/lib/finance";
import { auth } from "@/lib/auth";

const dayMilliseconds = 24 * 60 * 60 * 1000;

function getLocalWeekStart(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const parts = Object.fromEntries(formatted.map(({ type, value }) => [type, value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;

  return new Date(Date.UTC(year, month - 1, day - mondayOffset) - 5 * 60 * 60 * 1000);
}

function getWeekDays(weekStart: Date) {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Qyzylorda", weekday: "short",
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getTime() + 12 * 60 * 60 * 1000 + index * dayMilliseconds);
    const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      label: weekdayFormatter.format(date).replace(".", ""),
    };
  });
}

function formatKzt(amount: string | number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency", currency: "KZT", maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDay(day: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Qyzylorda", weekday: "long", day: "numeric", month: "long",
  }).format(new Date(`${day}T12:00:00+05:00`));
}

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const now = new Date();
  const weekStart = getLocalWeekStart(now);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * dayMilliseconds);
  const previousPeriodEnd = new Date(now.getTime() - 7 * dayMilliseconds);
  const localDay = sql<string>`to_char(${transactions.occurredAt} at time zone 'Asia/Qyzylorda', 'YYYY-MM-DD')`;
  const categoryTotal = sql<string>`coalesce(sum(${transactions.amount}), 0)`;
  const dailyTotal = sql<string>`coalesce(sum(${transactions.amount}), 0)`;

  const [
    [weeklyTotals],
    [previousTotals],
    dailyTotals,
    categoryTotals,
    [largestExpense],
    [balanceResult],
    [transactionCount],
  ] = await Promise.all([
    db.select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions).where(and(
      eq(transactions.userId, session.user.id),
      gte(transactions.occurredAt, weekStart),
      lt(transactions.occurredAt, now),
    )),
    db.select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions).where(and(
      eq(transactions.userId, session.user.id),
      gte(transactions.occurredAt, previousWeekStart),
      lt(transactions.occurredAt, previousPeriodEnd),
    )),
    db.select({ type: transactions.type, day: localDay, amount: dailyTotal })
      .from(transactions)
      .where(and(eq(transactions.userId, session.user.id), gte(transactions.occurredAt, weekStart), lt(transactions.occurredAt, now)))
      .groupBy(transactions.type, localDay),
    db.select({ id: categories.id, type: transactions.type, name: categories.name, icon: categories.icon, amount: categoryTotal })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, session.user.id),
        gte(transactions.occurredAt, weekStart),
        lt(transactions.occurredAt, now),
      ))
      .groupBy(categories.id, categories.name, categories.icon, transactions.type)
      .orderBy(desc(categoryTotal)),
    db.select({ amount: transactions.amount, description: transactions.description, categoryName: categories.name })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, session.user.id),
        eq(transactions.type, "EXPENSE"),
        gte(transactions.occurredAt, weekStart),
        lt(transactions.occurredAt, now),
      ))
      .orderBy(desc(transactions.amount))
      .limit(1),
    db.select({
      amount: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else -${transactions.amount} end), 0)`,
    }).from(transactions).where(eq(transactions.userId, session.user.id)),
    db.select({ total: count() }).from(transactions).where(and(
      eq(transactions.userId, session.user.id),
      gte(transactions.occurredAt, weekStart),
      lt(transactions.occurredAt, now),
    )),
  ]);

  const expense = weeklyTotals?.expense ?? "0";
  const previousExpense = previousTotals?.expense ?? "0";
  const elapsedDays = Math.max(1, Math.min(7, Math.ceil((now.getTime() - weekStart.getTime()) / dayMilliseconds)));
  const daysLeftIncludingToday = 7 - elapsedDays + 1;
  const currentBalance = Number(balanceResult?.amount ?? "0");
  const positiveBalance = Math.max(0, currentBalance);
  const safeToSpend = calculateSafeToSpend(currentBalance, daysLeftIncludingToday);
  const expenseByDay = new Map(dailyTotals
    .filter((item) => item.type === "EXPENSE")
    .map((item) => [item.day, Number(item.amount)]));
  const highestExpenseDay = findLargestByAmount([...expenseByDay.entries()].map(([day, amount]) => ({ day, amount })));
  const highestCategory = categoryTotals.find((item) => item.type === "EXPENSE");
  const spendingChange = calculatePercentageChange(expense, previousExpense);
  const weekDays = getWeekDays(weekStart);
  const safeToSpendCaption = Number(balanceResult?.amount ?? "0") <= 0
    ? "Баланс не положительный"
    : `${daysLeftIncludingToday} ${daysLeftIncludingToday === 1 ? "день" : "дней"} до конца недели`;

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — главная">
            <span className="brand-mark" aria-hidden="true">f</span><span>flow</span>
          </Link>
          <div className="profile-chip">
            <Link className="history-back-link" href="/">На главную</Link>
            <span className="profile-name">{session.user.name}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="history-page-heading">
          <p className="eyebrow">АНАЛИТИКА</p>
          <h1>Твоя неделя в цифрах</h1>
          <p>Доходы, расходы и привычки за текущую неделю</p>
        </section>

        <WeeklyAnalytics
          income={weeklyTotals?.income ?? "0"}
          expense={expense}
          previousIncome={previousTotals?.income ?? "0"}
          previousExpense={previousExpense}
          dailyTotals={dailyTotals}
          categoryTotals={categoryTotals}
          weekDays={weekDays}
        />

        <section className="analytics-metrics" aria-label="Ключевые показатели недели">
          <article className="analytics-metric-card">
            <p className="summary-label">Средний расход в день</p>
            <p className="analytics-metric-value">{formatKzt(calculateAverageDailySpending(expense, elapsedDays))}</p>
            <p className="summary-caption">{elapsedDays} {elapsedDays === 1 ? "день" : "дней"} текущей недели</p>
          </article>
          <article className="analytics-metric-card">
            <p className="summary-label">Операций за неделю</p>
            <p className="analytics-metric-value">{transactionCount?.total ?? 0}</p>
            <p className="summary-caption">Доходы и расходы</p>
          </article>
          <article className="analytics-metric-card">
            <p className="summary-label">Самый крупный расход</p>
            <p className="analytics-metric-value">{largestExpense ? formatKzt(largestExpense.amount) : "—"}</p>
            <p className="summary-caption">{largestExpense ? `${largestExpense.categoryName}${largestExpense.description ? ` · ${largestExpense.description}` : ""}` : "Расходов пока нет"}</p>
          </article>
          <article className="analytics-metric-card">
            <p className="summary-label">Можно тратить в день</p>
            <p className="analytics-metric-value">{positiveBalance > 0 ? formatKzt(safeToSpend) : "—"}</p>
            <p className="summary-caption">{safeToSpendCaption}</p>
          </article>
        </section>

        <section className="analytics-insights-card" aria-labelledby="insights-heading">
          <p className="eyebrow">SMART INSIGHTS</p>
          <h2 id="insights-heading">Что заметно на этой неделе</h2>
          {transactionCount?.total ? (
            <ul className="analytics-insights-list">
              {spendingChange === null ? (
                <li>Для сравнения расходов с прошлой неделей пока недостаточно данных.</li>
              ) : (
                <li>
                  {spendingChange === 0
                    ? "Расходы пока на том же уровне, что и в аналогичный период прошлой недели."
                    : `Расходы ${spendingChange > 0 ? "выросли" : "снизились"} на ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Math.abs(spendingChange))}% относительно аналогичного периода прошлой недели.`}
                </li>
              )}
              {highestCategory ? <li>Больше всего потрачено на категорию «{highestCategory.name}» — {formatKzt(highestCategory.amount)}.</li> : null}
              {highestExpenseDay ? <li>Самый дорогой день — {formatDay(highestExpenseDay.day)}: {formatKzt(highestExpenseDay.amount)}.</li> : null}
            </ul>
          ) : (
            <p className="analytics-empty">Добавь операции за эту неделю — здесь появятся выводы на основе твоих данных.</p>
          )}
        </section>
      </div>
      <BottomNavigation />
    </main>
  );
}
