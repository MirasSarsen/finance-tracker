import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { auth } from "@/lib/auth";

function formatKzt(amount: string) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export default async function TransactionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const history = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      merchant: transactions.merchant,
      occurredAt: transactions.occurredAt,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      accountName: accounts.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.userId, session.user.id))
    .orderBy(desc(transactions.occurredAt));

  const todayKey = getDateKey(new Date());
  const yesterdayDate = new Date(`${todayKey}T12:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayKey = yesterdayDate.toISOString().slice(0, 10);
  const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Qyzylorda",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Qyzylorda",
    hour: "2-digit",
    minute: "2-digit",
  });
  const groupedHistory = new Map<string, typeof history>();

  for (const transaction of history) {
    const key = getDateKey(transaction.occurredAt);
    const dayTransactions = groupedHistory.get(key) ?? [];
    dayTransactions.push(transaction);
    groupedHistory.set(key, dayTransactions);
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — главная">
            <span className="brand-mark" aria-hidden="true">f</span>
            <span>flow</span>
          </Link>
          <div className="profile-chip">
            <Link className="history-back-link" href="/">На главную</Link>
            <span className="profile-name">{session.user.name}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="history-page-heading">
          <p className="eyebrow">ТВОИ ФИНАНСЫ</p>
          <h1>История операций</h1>
          <p>{history.length} операций за всё время</p>
        </section>

        {history.length > 0 ? (
          <div className="history-groups">
            {[...groupedHistory.entries()].map(([key, dayTransactions]) => {
              const title = key === todayKey
                ? "Сегодня"
                : key === yesterdayKey
                  ? "Вчера"
                  : dateLabelFormatter.format(dayTransactions[0].occurredAt);

              return (
                <section className="history-day" key={key}>
                  <h2 className="history-day-title">{title}</h2>
                  <ul className="activity-list history-activity-list">
                    {dayTransactions.map((transaction) => (
                      <li className="activity-item" key={transaction.id}>
                        <Link className="history-row-link" href={`/transactions/${transaction.id}`} aria-label={`Открыть операцию: ${transaction.categoryName}`}>
                        <span className={`activity-category-icon ${transaction.type === "INCOME" ? "income" : "expense"}`} aria-hidden="true">
                          {transaction.categoryIcon ?? (transaction.type === "INCOME" ? "＋" : "−")}
                        </span>
                        <span className="activity-details">
                          <span className="activity-category">{transaction.categoryName}</span>
                          <span className="activity-description">
                            {transaction.description || transaction.merchant || transaction.accountName}
                          </span>
                        </span>
                        <span className="activity-amount-block">
                          <span className={`activity-amount ${transaction.type === "INCOME" ? "income" : "expense"}`}>
                            {transaction.type === "INCOME" ? "+" : "−"}{formatKzt(transaction.amount)}
                          </span>
                          <span className="activity-time">{timeFormatter.format(transaction.occurredAt)}</span>
                        </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <section className="history-empty-card">
            <div className="empty-orb" aria-hidden="true"><span>₸</span></div>
            <h2>Пока нет операций</h2>
            <p>Добавь первую запись на главной странице — она появится здесь.</p>
            <Link className="primary-button history-empty-link" href="/">На главную</Link>
          </section>
        )}
      </div>
    </main>
  );
}
