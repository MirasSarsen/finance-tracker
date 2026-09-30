import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import postgres from "postgres";

if (existsSync(".env")) loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
const userEmail = process.env.DEMO_USER_EMAIL?.trim();
const dryRun = process.argv.includes("--dry-run");

if (!databaseUrl) throw new Error("DATABASE_URL is missing. Add it to your local .env file.");
if (!userEmail) throw new Error("Set DEMO_USER_EMAIL to the email of a registered, empty local account.");

const demoTransactions = [
  { daysAgo: 20, type: "INCOME", category: "Зарплата", amount: "350000.00", description: "Зарплата за месяц" },
  { daysAgo: 20, type: "EXPENSE", category: "Дом", amount: "42000.00", description: "Аренда и коммунальные услуги" },
  { daysAgo: 19, type: "EXPENSE", category: "Еда", amount: "6800.00", description: "Продукты на неделю", merchant: "Magnum" },
  { daysAgo: 18, type: "EXPENSE", category: "Транспорт", amount: "1850.00", description: "Поездки по городу", merchant: "Yandex Go" },
  { daysAgo: 17, type: "EXPENSE", category: "Здоровье", amount: "9200.00", description: "Аптека" },
  { daysAgo: 15, type: "EXPENSE", category: "Еда", amount: "4300.00", description: "Обед с коллегами" },
  { daysAgo: 14, type: "INCOME", category: "Фриланс", amount: "65000.00", description: "Оплата за проект" },
  { daysAgo: 13, type: "EXPENSE", category: "Покупки", amount: "24700.00", description: "Покупки для дома" },
  { daysAgo: 12, type: "EXPENSE", category: "Подписки", amount: "3990.00", description: "Подписки за месяц" },
  { daysAgo: 11, type: "EXPENSE", category: "Еда", amount: "7200.00", description: "Ужин с друзьями" },
  { daysAgo: 9, type: "EXPENSE", category: "Транспорт", amount: "2600.00", description: "Такси" },
  { daysAgo: 8, type: "INCOME", category: "Подарки", amount: "15000.00", description: "Подарок на день рождения" },
  { daysAgo: 7, type: "EXPENSE", category: "Развлечения", amount: "12500.00", description: "Билеты в кино и кафе" },
  { daysAgo: 6, type: "EXPENSE", category: "Еда", amount: "5400.00", description: "Продукты" },
  { daysAgo: 5, type: "EXPENSE", category: "Образование", amount: "18000.00", description: "Учебный курс" },
  { daysAgo: 4, type: "EXPENSE", category: "Транспорт", amount: "2100.00", description: "Поездки по городу" },
  { daysAgo: 3, type: "EXPENSE", category: "Покупки", amount: "8900.00", description: "Повседневные покупки" },
  { daysAgo: 2, type: "EXPENSE", category: "Еда", amount: "6100.00", description: "Покупки в супермаркете" },
  { daysAgo: 1, type: "EXPENSE", category: "Развлечения", amount: "7400.00", description: "Встреча с друзьями" },
  { daysAgo: 0, type: "EXPENSE", category: "Транспорт", amount: "1600.00", description: "Поездка по городу" },
];

function getLocalDateKey(daysAgo) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  const date = new Date(today - daysAgo * 24 * 60 * 60 * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

const sql = postgres(databaseUrl);

try {
  const [user] = await sql`select id from users where lower(email) = lower(${userEmail}) limit 1`;
  if (!user) throw new Error(`No registered user found for ${userEmail}. Register in the app first.`);

  const [account] = await sql`
    select id from accounts where user_id = ${user.id} order by created_at limit 1
  `;
  if (!account) throw new Error("The selected user has no account yet. Sign out and sign in again first.");

  const userCategories = await sql`
    select id, name, type from categories where user_id = ${user.id}
  `;
  const categoryByTypeAndName = new Map(userCategories.map((category) => [`${category.type}:${category.name}`, category.id]));

  for (const item of demoTransactions) {
    if (!categoryByTypeAndName.has(`${item.type}:${item.category}`)) {
      throw new Error(`Missing category "${item.category}" for ${item.type}. No rows were added.`);
    }
  }

  const existingDemo = await sql`
    select id from transactions
    where user_id = ${user.id} and merchant = 'Flow demo seed'
    limit 1
  `;
  if (existingDemo.length > 0) throw new Error("Demo transactions were already added for this account.");

  const [existingTransaction] = await sql`
    select id from transactions where user_id = ${user.id} limit 1
  `;
  if (existingTransaction) throw new Error("Demo seed only runs for an empty account, to keep existing records untouched.");

  if (dryRun) {
    console.log(`Dry run: would add ${demoTransactions.length} transactions for ${userEmail}.`);
  } else {
    await sql.begin(async (transaction) => {
      for (const item of demoTransactions) {
        const dateKey = getLocalDateKey(item.daysAgo);
        const occurredAt = new Date(`${dateKey}T12:00:00+05:00`);
        await transaction`
          insert into transactions (user_id, account_id, category_id, type, amount, description, merchant, occurred_at)
          values (
            ${user.id},
            ${account.id},
            ${categoryByTypeAndName.get(`${item.type}:${item.category}`)},
            ${item.type}::transaction_type,
            ${item.amount},
            ${item.description},
            ${item.merchant ?? "Flow demo seed"},
            ${occurredAt}
          )
        `;
      }
    });

    console.log(`Added ${demoTransactions.length} demo transactions to ${userEmail}.`);
  }
} finally {
  await sql.end();
}
