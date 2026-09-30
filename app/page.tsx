import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { BottomNavigation } from "@/components/bottom-navigation";
import { TransactionForm } from "@/components/transaction-form";
import { WeeklyAnalytics } from "@/components/weekly-analytics";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { auth } from "@/lib/auth";

function formatKzt(amount: string | number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getLocalWeekStart(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const parts = Object.fromEntries(formatted.map(({ type, value }) => [type, value]));
  const [year, month, day] = [Number(parts.year), Number(parts.month), Number(parts.day)];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;

  // Qyzylorda is UTC+5, so local Monday at midnight starts at 19:00 UTC Sunday.
  return new Date(Date.UTC(year, month - 1, day - mondayOffset) - 5 * 60 * 60 * 1000);
}

function getWeekDays(weekStart: Date) {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const labelFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Qyzylorda", weekday: "short",
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getTime() + 12 * 60 * 60 * 1000 + index * 24 * 60 * 60 * 1000);
    const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      label: labelFormatter.format(date).replace(".", ""),
    };
  });
}

function getLocalDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const now = new Date();
  const weekStart = getLocalWeekStart(now);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousPeriodEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekDays = getWeekDays(weekStart);
  const localDay = sql<string>`to_char(${transactions.occurredAt} at time zone 'Asia/Qyzylorda', 'YYYY-MM-DD')`;
  const categoryExpenseTotal = sql<string>`coalesce(sum(${transactions.amount}), 0)`;

  const [
    userAccounts,
    userCategories,
    [balanceResult],
    [weeklyTotals],
    [previousWeeklyTotals],
    dailyExpenses,
    categoryExpenses,
    recentTransactions,
    [transactionCount],
  ] = await Promise.all([
    db
      .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.createdAt),
    db
      .select({ id: categories.id, name: categories.name, type: categories.type, icon: categories.icon })
      .from(categories)
      .where(eq(categories.userId, userId)),
    db
      .select({
        amount: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else -${transactions.amount} end), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    db
      .select({
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, weekStart), lt(transactions.occurredAt, now))),
    db
      .select({
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'INCOME' then ${transactions.amount} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, previousWeekStart), lt(transactions.occurredAt, previousPeriodEnd))),
    db
      .select({ type: transactions.type, day: localDay, amount: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, weekStart),
        lt(transactions.occurredAt, now),
      ))
      .groupBy(transactions.type, localDay),
    db
      .select({ id: categories.id, type: transactions.type, name: categories.name, icon: categories.icon, amount: categoryExpenseTotal })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, weekStart),
        lt(transactions.occurredAt, now),
      ))
      .groupBy(categories.id, categories.name, categories.icon, transactions.type)
      .orderBy(desc(categoryExpenseTotal)),
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        occurredAt: transactions.occurredAt,
        categoryName: categories.name,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.occurredAt))
      .limit(10),
    db.select({ total: count() }).from(transactions).where(eq(transactions.userId, userId)),
  ]);

  const account = userAccounts[0];
  const expenseCategoryCount = userCategories.filter((item) => item.type === "EXPENSE").length;
  const incomeCategoryCount = userCategories.filter((item) => item.type === "INCOME").length;
  const balance = balanceResult?.amount ?? "0";
  const incomeThisWeek = weeklyTotals?.income ?? "0";
  const expenseThisWeek = weeklyTotals?.expense ?? "0";
  const incomePreviousPeriod = previousWeeklyTotals?.income ?? "0";
  const expensePreviousPeriod = previousWeeklyTotals?.expense ?? "0";
  const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — главная">
            <span className="brand-mark" aria-hidden="true">f</span>
            <span>flow</span>
          </Link>
          <div className="profile-chip">
            <span className="profile-avatar" aria-hidden="true">
              {session.user.name.trim().charAt(0).toLocaleUpperCase("ru-RU")}
            </span>
            <span className="profile-name">{session.user.name}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="welcome-block">
          <p className="eyebrow">ТВОЁ ФИНАНСОВОЕ ПРОСТРАНСТВО</p>
          <h1>Привет, {session.user.name.split(" ")[0]}.</h1>
          <p>Спокойный контроль над деньгами начинается с маленьких шагов.</p>
        </section>

        <section className="balance-card" aria-labelledby="balance-heading">
          <div className="balance-card-top">
            <div>
              <p className="balance-label" id="balance-heading">Общий баланс</p>
              <p className="balance-amount">{formatKzt(balance)}</p>
            </div>
            <span className="balance-icon" aria-hidden="true">↗</span>
          </div>
          <div className="balance-card-bottom">
            <span>{account?.name ?? "Счёт не найден"}</span>
            <span>Валюта счёта · {account?.currency ?? "KZT"}</span>
          </div>
        </section>

        <section className="transaction-section" id="transaction-form" aria-label="Добавить операцию">
          <TransactionForm categories={userCategories} accounts={userAccounts} today={getLocalDateKey(now)} />
        </section>

        <WeeklyAnalytics
          income={incomeThisWeek}
          expense={expenseThisWeek}
          previousIncome={incomePreviousPeriod}
          previousExpense={expensePreviousPeriod}
          dailyTotals={dailyExpenses}
          categoryTotals={categoryExpenses}
          weekDays={weekDays}
        />

        <section className="activity-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ПОСЛЕДНИЕ ДВИЖЕНИЯ</p>
              <h2>История операций</h2>
            </div>
            <div className="activity-actions">
              <span className="activity-count">{transactionCount?.total ?? 0} операций</span>
              <Link className="history-link" href="/transactions">Вся история <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          {recentTransactions.length > 0 ? (
            <ul className="activity-list">
              {recentTransactions.map((transaction) => (
                <li className="activity-item" key={transaction.id}>
                  <span className={`activity-category-icon ${transaction.type === "INCOME" ? "income" : "expense"}`} aria-hidden="true">
                    {transaction.categoryIcon ?? (transaction.type === "INCOME" ? "＋" : "−")}
                  </span>
                  <span className="activity-details">
                    <span className="activity-category">{transaction.categoryName}</span>
                    <span className="activity-description">
                      {transaction.description || dateFormatter.format(transaction.occurredAt)}
                    </span>
                  </span>
                  <span className={`activity-amount ${transaction.type === "INCOME" ? "income" : "expense"}`}>
                    {transaction.type === "INCOME" ? "+" : "−"}{formatKzt(transaction.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-activity">
              <div className="empty-orb" aria-hidden="true"><span>₸</span></div>
              <p>Добавь первую операцию, чтобы увидеть историю и баланс.</p>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>Счёт: {account ? "готов" : "нужно настроить"}</span>
          <span>{expenseCategoryCount} категорий расходов · {incomeCategoryCount} категорий доходов</span>
        </footer>
      </div>
      <BottomNavigation />
    </main>
  );
}
