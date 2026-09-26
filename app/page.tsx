import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { TransactionForm } from "@/components/transaction-form";
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

function getUtcWeekStart() {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weekday = new Date(todayUtc).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;

  return new Date(todayUtc - mondayOffset * 24 * 60 * 60 * 1000);
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const weekStart = getUtcWeekStart();

  const [
    [account],
    userCategories,
    [balanceResult],
    [weeklyTotals],
    recentTransactions,
    [transactionCount],
  ] = await Promise.all([
    db
      .select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1),
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
      .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, weekStart))),
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

  const expenseCategoryCount = userCategories.filter((item) => item.type === "EXPENSE").length;
  const incomeCategoryCount = userCategories.filter((item) => item.type === "INCOME").length;
  const balance = balanceResult?.amount ?? "0";
  const incomeThisWeek = weeklyTotals?.income ?? "0";
  const expenseThisWeek = weeklyTotals?.expense ?? "0";
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

        <section className="transaction-section" aria-label="Добавить операцию">
          <TransactionForm categories={userCategories} />
        </section>

        <section className="dashboard-grid" aria-label="Сводка финансов за неделю">
          <article className="summary-card">
            <div className="summary-icon income-icon" aria-hidden="true">↓</div>
            <p className="summary-label">Доходы за неделю</p>
            <p className="summary-value">{formatKzt(incomeThisWeek)}</p>
            <p className="summary-caption">Понедельник — сегодня</p>
          </article>
          <article className="summary-card">
            <div className="summary-icon expense-icon" aria-hidden="true">↑</div>
            <p className="summary-label">Расходы за неделю</p>
            <p className="summary-value">{formatKzt(expenseThisWeek)}</p>
            <p className="summary-caption">Понедельник — сегодня</p>
          </article>
        </section>

        <section className="activity-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ПОСЛЕДНИЕ ДВИЖЕНИЯ</p>
              <h2>История операций</h2>
            </div>
            <span className="activity-count">{transactionCount?.total ?? 0} операций</span>
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
              <h3>Здесь появятся твои операции</h3>
              <p>Счёт и категории готовы. Добавь первую операцию, чтобы увидеть историю и баланс.</p>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>Счёт: {account ? "готов" : "нужно настроить"}</span>
          <span>{expenseCategoryCount} категорий расходов · {incomeCategoryCount} категорий доходов</span>
        </footer>
      </div>
    </main>
  );
}
