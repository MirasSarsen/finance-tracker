"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { weeklyBudgets } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getLocalWeekStartKey } from "@/lib/finance";

export type WeeklyBudgetActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const amountPattern = /^\d{1,17}(?:\.\d{1,2})?$/;

export async function updateWeeklyBudget(
  _previousState: WeeklyBudgetActionState,
  formData: FormData,
): Promise<WeeklyBudgetActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { status: "error", message: "Сессия истекла. Войди снова." };
  }

  const amount = formData.get("amount");
  if (typeof amount !== "string" || !amountPattern.test(amount) || Number(amount) <= 0) {
    return { status: "error", message: "Введи корректную сумму бюджета." };
  }

  const weekStart = getLocalWeekStartKey(new Date());
  await db.insert(weeklyBudgets).values({
    userId: session.user.id,
    weekStart,
    amount,
  }).onConflictDoUpdate({
    target: [weeklyBudgets.userId, weeklyBudgets.weekStart],
    set: { amount, updatedAt: new Date() },
  });

  revalidatePath("/analytics");
  return { status: "success", message: "Бюджет на эту неделю сохранён." };
}
