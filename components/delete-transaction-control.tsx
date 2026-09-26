"use client";

import { useActionState, useState } from "react";

import { deleteTransaction } from "@/app/actions/transactions";

const initialState = { status: "idle", message: "" } as const;

export function DeleteTransactionControl({ transactionId }: { transactionId: string }) {
  const [state, formAction, isPending] = useActionState(deleteTransaction, initialState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <button className="danger-button" onClick={() => setConfirming(true)} type="button">Удалить операцию</button>;
  }

  return (
    <form action={formAction} className="delete-confirmation">
      <input name="transactionId" type="hidden" value={transactionId} />
      <p>Удалить эту операцию? Это действие нельзя отменить.</p>
      {state.message ? <p className="transaction-message error" role="alert">{state.message}</p> : null}
      <div className="delete-confirmation-actions">
        <button className="secondary-button" disabled={isPending} onClick={() => setConfirming(false)} type="button">Отмена</button>
        <button className="danger-button" disabled={isPending} type="submit">{isPending ? "Удаляю…" : "Да, удалить"}</button>
      </div>
    </form>
  );
}
