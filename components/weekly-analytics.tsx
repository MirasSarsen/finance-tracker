"use client";

import { useState } from "react";
import Link from "next/link";

import { calculatePercentageChange } from "@/lib/finance";
import type { TransactionType } from "@/lib/transaction-types";

type DailyTotal = { type: TransactionType; day: string; amount: string };
type CategoryTotal = { id: string; type: TransactionType; name: string; icon: string | null; amount: string };
type WeekDay = { key: string; label: string };

type Props = {
  income: string;
  expense: string;
  previousIncome: string;
  previousExpense: string;
  dailyTotals: DailyTotal[];
  categoryTotals: CategoryTotal[];
  weekDays: WeekDay[];
};

function formatKzt(amount: string | number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function getChangeLabel(current: string, previous: string) {
  const currentAmount = Number(current);
  const previousAmount = Number(previous);
  const change = calculatePercentageChange(currentAmount, previousAmount);
  if (change === null) return currentAmount === 0 ? "Без изменений к прошлому периоду" : "В прошлом периоде операций не было";

  const formattedChange = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(change);
  return `${change > 0 ? "+" : ""}${formattedChange}% к прошлому периоду`;
}

export function WeeklyAnalytics({ income, expense, previousIncome, previousExpense, dailyTotals, categoryTotals, weekDays }: Props) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const selectedTotal = type === "EXPENSE" ? expense : income;
  const previousTotal = type === "EXPENSE" ? previousExpense : previousIncome;
  const selectedLabel = type === "EXPENSE" ? "Расходы" : "Доходы";
  const selectedDailyTotals = dailyTotals.filter((item) => item.type === type);
  const selectedCategories = categoryTotals.filter((item) => item.type === type);
  const totalsByDay = new Map(selectedDailyTotals.map(({ day, amount }) => [day, Number(amount)]));
  const chartValues = weekDays.map(({ key, label }) => ({ key, label, amount: totalsByDay.get(key) ?? 0 }));
  const maxDailyTotal = Math.max(1, ...chartValues.map(({ amount }) => amount));
  const totalByCategory = selectedCategories.reduce((total, item) => total + Number(item.amount), 0);

  return (
    <section className="analytics-section" aria-label="Аналитика за неделю">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">ОБЗОР НЕДЕЛИ</p>
          <h2>Доходы и расходы</h2>
        </div>
        <Link className="analytics-details-link" href="/analytics">Подробная аналитика →</Link>
        <div className="analytics-type-switch" role="group" aria-label="Тип операций для аналитики">
          <button aria-pressed={type === "EXPENSE"} className={type === "EXPENSE" ? "active expense" : ""} onClick={() => setType("EXPENSE")} type="button">Расходы</button>
          <button aria-pressed={type === "INCOME"} className={type === "INCOME" ? "active income" : ""} onClick={() => setType("INCOME")} type="button">Доходы</button>
        </div>
      </div>

      <div className="dashboard-grid analytics-summary">
        <article className="summary-card">
          <div className={`summary-icon ${type === "INCOME" ? "income-icon" : "expense-icon"}`} aria-hidden="true">{type === "INCOME" ? "↓" : "↑"}</div>
          <p className="summary-label">{selectedLabel} за неделю</p>
          <p className="summary-value">{formatKzt(selectedTotal)}</p>
          <p className="summary-caption">Прошлый период: {formatKzt(previousTotal)}</p>
          <p className={`analytics-change ${type === "INCOME" ? "income-change" : "expense-change"}`}>{getChangeLabel(selectedTotal, previousTotal)}</p>
        </article>
        <p className="analytics-period-note">Сравнение с таким же периодом прошлой недели</p>
      </div>

      <div className="analytics-grid">
        <section className="analytics-card" aria-labelledby="daily-expenses-heading">
          <div className="analytics-card-heading">
            <div><p className="eyebrow">ПО ДНЯМ</p><h3 id="daily-expenses-heading">{selectedLabel} за неделю</h3></div>
            <span>{formatKzt(chartValues.reduce((total, item) => total + item.amount, 0))}</span>
          </div>
          <div className="weekly-chart" role="img" aria-label={`График ${type === "INCOME" ? "доходов" : "расходов"} по дням текущей недели`}>
            {chartValues.map(({ key, label, amount }) => (
              <div className="weekly-chart-day" key={key}>
                <span className="weekly-chart-amount">{amount > 0 ? formatKzt(amount) : "—"}</span>
                <div className="weekly-chart-track"><span className={`weekly-chart-bar ${type === "INCOME" ? "income" : "expense"}`} style={{ height: `${amount === 0 ? 0 : Math.max(6, (amount / maxDailyTotal) * 100)}%` }} /></div>
                <span className="weekly-chart-label">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-card" aria-labelledby="category-expenses-heading">
          <div className="analytics-card-heading">
            <div><p className="eyebrow">КАТЕГОРИИ</p><h3 id="category-expenses-heading">{type === "EXPENSE" ? "Куда ушли деньги" : "Категории доходов"}</h3></div>
            <span>{formatKzt(totalByCategory)}</span>
          </div>
          {selectedCategories.length > 0 ? (
            <ul className="category-expense-list">
              {selectedCategories.map((item) => {
                const amount = Number(item.amount);
                const share = totalByCategory > 0 ? (amount / totalByCategory) * 100 : 0;
                return (
                  <li className="category-expense-item" key={item.id}>
                    <div className="category-expense-topline">
                      <span className="category-expense-name">{item.icon ? `${item.icon} ` : ""}{item.name}</span>
                      <span className="category-expense-amount">{formatKzt(item.amount)}</span>
                    </div>
                    <div className="category-expense-track"><span className={type === "INCOME" ? "income" : "expense"} style={{ width: `${share}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="analytics-empty">На этой неделе {type === "EXPENSE" ? "расходов" : "доходов"} пока нет.</p>
          )}
        </section>
      </div>
    </section>
  );
}
