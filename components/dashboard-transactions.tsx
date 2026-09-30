"use client";

import { createContext, useContext, useOptimistic, type ReactNode } from "react";
import Link from "next/link";

import type { TransactionType } from "@/lib/transaction-types";

export type RecentTransaction = {
  id: string;
  type: TransactionType;
  amount: string;
  description: string | null;
  occurredAt: Date;
  categoryName: string;
  categoryIcon: string | null;
  pending?: boolean;
};

type DashboardTransactionsContextValue = {
  transactions: RecentTransaction[];
  transactionCount: number;
  addOptimisticTransaction: (transaction: RecentTransaction) => void;
};

const DashboardTransactionsContext = createContext<DashboardTransactionsContextValue | null>(null);

type DashboardTransactionsProviderProps = {
  initialTransactions: RecentTransaction[];
  transactionCount: number;
  children: ReactNode;
};

export function DashboardTransactionsProvider({
  initialTransactions,
  transactionCount,
  children,
}: DashboardTransactionsProviderProps) {
  const [transactions, addOptimisticTransaction] = useOptimistic(
    initialTransactions,
    (currentTransactions, newTransaction: RecentTransaction) =>
      [newTransaction, ...currentTransactions]
        .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
        .slice(0, 10),
  );

  return (
    <DashboardTransactionsContext.Provider
      value={{ transactions, transactionCount, addOptimisticTransaction }}
    >
      {children}
    </DashboardTransactionsContext.Provider>
  );
}

export function useDashboardTransactions() {
  const context = useContext(DashboardTransactionsContext);
  if (!context) {
    throw new Error("Dashboard transaction components must be inside their provider.");
  }
  return context;
}

function formatKzt(amount: string | number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Qyzylorda",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function RecentTransactions() {
  const { transactions, transactionCount } = useDashboardTransactions();

  return (
    <section className="activity-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ПОСЛЕДНИЕ ДВИЖЕНИЯ</p>
          <h2>История операций</h2>
        </div>
        <div className="activity-actions">
          <span className="activity-count">
            {transactionCount + transactions.filter((transaction) => transaction.pending).length} операций
          </span>
          <Link className="history-link" href="/transactions">
            Вся история <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      {transactions.length > 0 ? (
        <ul className="activity-list" aria-live="polite">
          {transactions.map((transaction) => (
            <li
              className={`activity-item${transaction.pending ? " optimistic-activity" : ""}`}
              key={transaction.id}
            >
              <span
                className={`activity-category-icon ${transaction.type === "INCOME" ? "income" : "expense"}`}
                aria-hidden="true"
              >
                {transaction.categoryIcon ?? (transaction.type === "INCOME" ? "＋" : "−")}
              </span>
              <span className="activity-details">
                <span className="activity-category">{transaction.categoryName}</span>
                <span className="activity-description">
                  {transaction.description || dateFormatter.format(transaction.occurredAt)}
                </span>
              </span>
              <span className="activity-amount-block">
                <span className={`activity-amount ${transaction.type === "INCOME" ? "income" : "expense"}`}>
                  {transaction.type === "INCOME" ? "+" : "−"}{formatKzt(transaction.amount)}
                </span>
                {transaction.pending ? (
                  <span className="activity-time" role="status">Сохраняется…</span>
                ) : null}
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
  );
}
