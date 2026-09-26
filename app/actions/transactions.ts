"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { TransactionActionState, TransactionType } from "@/lib/transaction-types";
import { auth } from "@/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const amountPattern = /^\d{1,17}(?:\.\d{1,2})?$/;

export async function createTransaction(
  _previousState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "Сессия истекла. Войди снова." };
  }

  const rawType = formData.get("type");
  const amount = formData.get("amount");
  const categoryId = formData.get("categoryId");
  const rawDescription = formData.get("description");

  if (rawType !== "INCOME" && rawType !== "EXPENSE") {
    return { status: "error", message: "Выбери доход или расход." };
  }

  if (
    typeof amount !== "string" ||
    !amountPattern.test(amount) ||
    Number(amount) <= 0
  ) {
    return { status: "error", message: "Введи корректную сумму." };
  }

  if (typeof categoryId !== "string" || !uuidPattern.test(categoryId)) {
    return { status: "error", message: "Выбери категорию." };
  }

  if (typeof rawDescription !== "string") {
    return { status: "error", message: "Проверь описание операции." };
  }

  const description = rawDescription.trim();
  if (description.length > 300) {
    return { status: "error", message: "Описание должно быть короче 300 символов." };
  }

  const type = rawType as TransactionType;
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  if (!account) {
    return { status: "error", message: "Не найден финансовый счёт." };
  }

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, session.user.id),
        eq(categories.type, type),
      ),
    )
    .limit(1);

  if (!category) {
    return { status: "error", message: "Категория не подходит для этого типа операции." };
  }

  await db.insert(transactions).values({
    userId: session.user.id,
    accountId: account.id,
    categoryId: category.id,
    type,
    amount,
    description: description || null,
  });

  revalidatePath("/");

  return { status: "success", message: "Операция добавлена." };
}

export async function updateTransaction(
  _previousState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { status: "error", message: "Сессия истекла. Войди снова." };

  const id = formData.get("transactionId");
  const rawType = formData.get("type");
  const amount = formData.get("amount");
  const categoryId = formData.get("categoryId");
  const accountId = formData.get("accountId");
  const rawDescription = formData.get("description");
  const rawDate = formData.get("occurredAt");

  if (typeof id !== "string" || !uuidPattern.test(id)) {
    return { status: "error", message: "Не удалось найти операцию." };
  }
  if (rawType !== "INCOME" && rawType !== "EXPENSE") {
    return { status: "error", message: "Выбери доход или расход." };
  }
  if (typeof amount !== "string" || !amountPattern.test(amount) || Number(amount) <= 0) {
    return { status: "error", message: "Введи корректную сумму." };
  }
  if (typeof categoryId !== "string" || !uuidPattern.test(categoryId)) {
    return { status: "error", message: "Выбери категорию." };
  }
  if (typeof accountId !== "string" || !uuidPattern.test(accountId)) {
    return { status: "error", message: "Выбери счёт." };
  }
  if (typeof rawDescription !== "string" || rawDescription.trim().length > 300) {
    return { status: "error", message: "Описание должно быть короче 300 символов." };
  }
  if (typeof rawDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return { status: "error", message: "Выбери корректную дату." };
  }
  const occurredAt = new Date(`${rawDate}T00:00:00.000Z`);
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.toISOString().slice(0, 10) !== rawDate) {
    return { status: "error", message: "Выбери корректную дату." };
  }

  const [ownedTransaction] = await db.select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)))
    .limit(1);
  if (!ownedTransaction) return { status: "error", message: "Операция не найдена." };

  const [ownedAccount] = await db.select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, session.user.id)))
    .limit(1);
  if (!ownedAccount) return { status: "error", message: "Выбранный счёт недоступен." };

  const [ownedCategory] = await db.select({ id: categories.id })
    .from(categories)
    .where(and(
      eq(categories.id, categoryId),
      eq(categories.userId, session.user.id),
      eq(categories.type, rawType as TransactionType),
    ))
    .limit(1);
  if (!ownedCategory) return { status: "error", message: "Категория не подходит для этой операции." };

  await db.update(transactions).set({
    type: rawType as TransactionType,
    amount,
    categoryId: ownedCategory.id,
    accountId: ownedAccount.id,
    description: rawDescription.trim() || null,
    occurredAt,
    updatedAt: new Date(),
  }).where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)));

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
  return { status: "success", message: "Изменения сохранены." };
}

export async function deleteTransaction(
  _previousState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { status: "error", message: "Сессия истекла. Войди снова." };

  const id = formData.get("transactionId");
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    return { status: "error", message: "Не удалось найти операцию." };
  }

  const [deleted] = await db.delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)))
    .returning({ id: transactions.id });
  if (!deleted) return { status: "error", message: "Операция не найдена." };

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}
