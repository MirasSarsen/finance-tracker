import {
  index,
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
    ...timestamps(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
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
