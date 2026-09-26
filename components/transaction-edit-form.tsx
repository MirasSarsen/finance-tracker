"use client";

import { useActionState, useState } from "react";

import { updateTransaction } from "@/app/actions/transactions";
import type { TransactionCategoryOption, TransactionType } from "@/lib/transaction-types";

const initialState = { status: "idle", message: "" } as const;

type EditValues = {
  id: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  description: string;
  occurredAt: string;
};

type Props = {
  transaction: EditValues;
  categories: TransactionCategoryOption[];
  accounts: { id: string; name: string }[];
};

export function TransactionEditForm({ transaction, categories, accounts }: Props) {
  const [type, setType] = useState(transaction.type);
  const [state, formAction, isPending] = useActionState(updateTransaction, initialState);
  const matchingCategories = categories.filter((category) => category.type === type);

  return (
    <form action={formAction} className="transaction-form">
      <input name="transactionId" type="hidden" value={transaction.id} />
      <input name="type" type="hidden" value={type} />

      <div className="transaction-type-switch" aria-label="Тип операции">
        <button type="button" aria-pressed={type === "EXPENSE"} className={`transaction-type-button${type === "EXPENSE" ? " active expense" : ""}`} onClick={() => setType("EXPENSE")}>Расход</button>
        <button type="button" aria-pressed={type === "INCOME"} className={`transaction-type-button${type === "INCOME" ? " active income" : ""}`} onClick={() => setType("INCOME")}>Доход</button>
      </div>

      <label className="transaction-field">
        Сумма, ₸
        <input autoComplete="off" inputMode="decimal" max="99999999999999999.99" min="0.01" name="amount" required step="0.01" type="number" defaultValue={transaction.amount} />
      </label>

      <label className="transaction-field">
        Категория
        <select key={type} name="categoryId" defaultValue={type === transaction.type ? transaction.categoryId : ""} required>
          <option disabled value="">Выбери категорию</option>
          {matchingCategories.map((category) => <option key={category.id} value={category.id}>{category.icon ? `${category.icon} ` : ""}{category.name}</option>)}
        </select>
      </label>

      <label className="transaction-field">
        Счёт
        <select name="accountId" defaultValue={transaction.accountId} required>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </label>

      <label className="transaction-field">
        Дата операции
        <input name="occurredAt" type="date" defaultValue={transaction.occurredAt} required />
      </label>

      <label className="transaction-field">
        Описание <span className="optional-label">необязательно</span>
        <textarea maxLength={300} name="description" rows={3} defaultValue={transaction.description} />
      </label>

      {state.message ? <p className={`transaction-message ${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <button className="primary-button transaction-submit" disabled={isPending || matchingCategories.length === 0 || accounts.length === 0} type="submit">
        {isPending ? "Сохраняю…" : "Сохранить изменения"}
      </button>
    </form>
  );
}
