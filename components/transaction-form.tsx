"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createTransaction } from "@/app/actions/transactions";
import type { TransactionCategoryOption, TransactionType } from "@/lib/transaction-types";

const initialState = { status: "idle", message: "" } as const;

type TransactionFormProps = {
  categories: TransactionCategoryOption[];
  accounts: { id: string; name: string }[];
  today: string;
};

export function TransactionForm({ categories, accounts, today }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [state, formAction, isPending] = useActionState(createTransaction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const matchingCategories = categories.filter((category) => category.type === type);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="transaction-form">
      <div className="transaction-form-heading">
        <div>
          <p className="eyebrow">БЫСТРАЯ ЗАПИСЬ</p>
          <h2>Новая операция</h2>
        </div>
        <span className="transaction-form-mark" aria-hidden="true">＋</span>
      </div>

      <div className="transaction-type-switch" role="group" aria-label="Тип операции">
        <button
          aria-pressed={type === "EXPENSE"}
          className={`transaction-type-button${type === "EXPENSE" ? " active expense" : ""}`}
          onClick={() => setType("EXPENSE")}
          type="button"
        >
          − Расход
        </button>
        <button
          aria-pressed={type === "INCOME"}
          className={`transaction-type-button${type === "INCOME" ? " active income" : ""}`}
          onClick={() => setType("INCOME")}
          type="button"
        >
          ＋ Доход
        </button>
      </div>

      <input name="type" type="hidden" value={type} />

      <label className="transaction-field transaction-amount-field">
        Сумма, ₸
        <input
          autoComplete="off"
          inputMode="decimal"
          max="99999999999999999.99"
          min="0.01"
          name="amount"
          className="transaction-amount-input"
          placeholder="0.00"
          required
          step="0.01"
          type="number"
        />
      </label>

      <label className="transaction-field">
        Категория
        <select key={type} defaultValue="" name="categoryId" required>
          <option disabled value="">Выбери категорию</option>
          {matchingCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon ? `${category.icon} ` : ""}{category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="transaction-form-row">
        <label className="transaction-field">
          Дата
          <input defaultValue={today} name="occurredAt" required type="date" />
        </label>
        <label className="transaction-field">
          Счёт
          <select defaultValue={accounts[0]?.id ?? ""} name="accountId" required>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="transaction-field">
        Описание <span className="optional-label">необязательно</span>
        <textarea
          maxLength={300}
          name="description"
          placeholder={type === "EXPENSE" ? "Например, обед с коллегами" : "Например, зарплата за сентябрь"}
          rows={3}
        />
      </label>

      {state.message ? (
        <p className={`transaction-message ${state.status}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      ) : null}

      <button className="primary-button transaction-submit" disabled={isPending || matchingCategories.length === 0 || accounts.length === 0} type="submit">
        {isPending ? "Сохраняю…" : "Добавить операцию"}
      </button>
    </form>
  );
}
