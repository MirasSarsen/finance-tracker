"use client";

import { useActionState } from "react";

import { updateWeeklyBudget } from "@/app/actions/budget";
import type { WeeklyBudgetActionState } from "@/app/actions/budget";

const initialState: WeeklyBudgetActionState = { status: "idle", message: "" };

function formatKzt(amount: number) {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(amount);
}

type Props = {
  budget: string | null;
  spent: string;
};

export function WeeklyBudget({ budget, spent }: Props) {
  const [state, formAction, isPending] = useActionState(updateWeeklyBudget, initialState);
  const budgetAmount = Number(budget ?? 0);
  const spentAmount = Number(spent);
  const remaining = budgetAmount - spentAmount;
  const progress = budgetAmount > 0
    ? Math.min(100, Math.max(0, (spentAmount / budgetAmount) * 100))
    : 0;
  const overBudget = budgetAmount > 0 && spentAmount > budgetAmount;

  return (
    <section className="weekly-budget-card" aria-labelledby="weekly-budget-heading">
      <div className="weekly-budget-heading">
        <div>
          <p className="eyebrow">ПЛАН НА НЕДЕЛЮ</p>
          <h2 id="weekly-budget-heading">Бюджет расходов</h2>
        </div>
        {budgetAmount > 0 ? (
          <span className="weekly-budget-total">
            из {formatKzt(budgetAmount)} · {Math.round((spentAmount / budgetAmount) * 100)}% использовано
          </span>
        ) : null}
      </div>

      {budgetAmount > 0 ? (
        <div className="weekly-budget-progress-block">
          <div className="weekly-budget-amounts">
            <span>Потрачено <strong>{formatKzt(spentAmount)}</strong></span>
            <span className={overBudget ? "weekly-budget-over" : ""}>
              {overBudget ? "Превышение" : "Осталось"} <strong>{formatKzt(Math.abs(remaining))}</strong>
            </span>
          </div>
          <div
            aria-label={`Использовано ${Math.round((spentAmount / budgetAmount) * 100)} процентов недельного бюджета`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className={`weekly-budget-track${overBudget ? " over" : ""}`}
            role="progressbar"
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="weekly-budget-caption">
            {overBudget
              ? "Расходы за эту неделю превысили установленный бюджет."
              : "Считаются расходы с понедельника по сегодня."}
          </p>
        </div>
      ) : (
        <p className="weekly-budget-caption">Задай лимит расходов, чтобы следить за планом на этой неделе.</p>
      )}

      <form action={formAction} className="weekly-budget-form">
        <label className="transaction-field" htmlFor="weekly-budget-amount">
          {budgetAmount > 0 ? "Изменить бюджет, ₸" : "Бюджет на неделю, ₸"}
          <input
            autoComplete="off"
            defaultValue={budget ?? ""}
            id="weekly-budget-amount"
            inputMode="decimal"
            max="99999999999999999.99"
            min="0.01"
            name="amount"
            placeholder="Например, 150000"
            required
            step="0.01"
            type="number"
          />
        </label>
        {state.message ? (
          <p className={`transaction-message ${state.status}`} role={state.status === "error" ? "alert" : "status"}>
            {state.message}
          </p>
        ) : null}
        <button className="secondary-button weekly-budget-submit" disabled={isPending} type="submit">
          {isPending ? "Сохраняю…" : "Сохранить бюджет"}
        </button>
      </form>
    </section>
  );
}
