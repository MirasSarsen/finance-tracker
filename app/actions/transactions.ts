"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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
