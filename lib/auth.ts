import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { categories, accounts, authAccounts, authSessions, authVerifications, users } from "@/db/schema";
import { db } from "@/db";

const defaultCategories = [
  { name: "Еда", type: "EXPENSE" as const, icon: "🍽️" },
  { name: "Транспорт", type: "EXPENSE" as const, icon: "🚕" },
  { name: "Покупки", type: "EXPENSE" as const, icon: "🛍️" },
  { name: "Дом", type: "EXPENSE" as const, icon: "🏠" },
  { name: "Развлечения", type: "EXPENSE" as const, icon: "🎬" },
  { name: "Подписки", type: "EXPENSE" as const, icon: "🔁" },
  { name: "Здоровье", type: "EXPENSE" as const, icon: "❤️" },
  { name: "Образование", type: "EXPENSE" as const, icon: "📚" },
  { name: "Другое", type: "EXPENSE" as const, icon: "•••" },
  { name: "Зарплата", type: "INCOME" as const, icon: "💼" },
  { name: "Фриланс", type: "INCOME" as const, icon: "💻" },
  { name: "Подарки", type: "INCOME" as const, icon: "🎁" },
  { name: "Другое", type: "INCOME" as const, icon: "•••" },
];

export const auth = betterAuth({
  appName: "Flow",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.transaction(async (tx) => {
            await tx.insert(accounts).values({
              userId: user.id,
              name: "Основной счёт",
            });
            await tx.insert(categories).values(
              defaultCategories.map((category) => ({
                ...category,
                userId: user.id,
              })),
            );
          });
        },
      },
    },
  },
});
