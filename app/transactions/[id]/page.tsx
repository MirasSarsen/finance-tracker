import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteTransactionControl } from "@/components/delete-transaction-control";
import { BottomNavigation } from "@/components/bottom-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { TransactionEditForm } from "@/components/transaction-edit-form";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { auth } from "@/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getLocalDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [transaction] = await db.select({
    id: transactions.id,
    type: transactions.type,
    amount: transactions.amount,
    description: transactions.description,
    occurredAt: transactions.occurredAt,
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    accountId: transactions.accountId,
    accountName: accounts.name,
  })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)))
    .limit(1);

  if (!transaction) notFound();

  const [userCategories, userAccounts] = await Promise.all([
    db.select({ id: categories.id, name: categories.name, icon: categories.icon, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, session.user.id)),
    db.select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id)),
  ]);

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — главная">
            <span className="brand-mark" aria-hidden="true">f</span><span>flow</span>
          </Link>
          <div className="profile-chip">
            <Link className="history-back-link" href="/transactions">К истории</Link>
            <span className="profile-name">{session.user.name}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="history-page-heading">
          <p className="eyebrow">ОПЕРАЦИЯ</p>
          <h1>Просмотр и редактирование</h1>
          <p>{transaction.categoryName} · {transaction.accountName}</p>
        </section>

        <div className="transaction-detail-layout">
          <TransactionEditForm
            transaction={{
              id: transaction.id,
              type: transaction.type,
              amount: transaction.amount,
              categoryId: transaction.categoryId,
              accountId: transaction.accountId,
              description: transaction.description ?? "",
              occurredAt: getLocalDate(transaction.occurredAt),
            }}
            categories={userCategories}
            accounts={userAccounts}
          />
          <section className="delete-transaction-card">
            <h2>Удаление</h2>
            <p>Операция исчезнет из истории и будет пересчитан баланс.</p>
            <DeleteTransactionControl transactionId={transaction.id} />
          </section>
        </div>
      </div>
      <BottomNavigation />
    </main>
  );
}
