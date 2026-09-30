import { sql } from "drizzle-orm";
import {
  index,
  boolean,
  check,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const transactionType = pgEnum("transaction_type", ["INCOME", "EXPENSE"]);

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    ...timestamps(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
    index("auth_sessions_user_id_idx").on(table.userId),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auth_accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("auth_accounts_user_id_idx").on(table.userId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").default("KZT").notNull(),
    ...timestamps(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: transactionType("type").notNull(),
    icon: text("icon"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("categories_user_name_type_unique").on(
      table.userId,
      table.name,
      table.type,
    ),
    index("categories_user_id_idx").on(table.userId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    type: transactionType("type").notNull(),
    amount: numeric("amount", { precision: 19, scale: 2 }).notNull(),
    description: text("description"),
    merchant: text("merchant"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps(),
  },
  (table) => [
    index("transactions_user_occurred_at_idx").on(
      table.userId,
      table.occurredAt,
    ),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
);

export const weeklyBudgets = pgTable(
  "weekly_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    amount: numeric("amount", { precision: 19, scale: 2 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("weekly_budgets_user_week_unique").on(table.userId, table.weekStart),
    check("weekly_budgets_amount_positive", sql`${table.amount} > 0`),
  ],
);
