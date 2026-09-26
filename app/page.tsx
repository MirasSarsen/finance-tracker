import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { db } from "@/db";
import { accounts, categories } from "@/db/schema";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [account] = await db
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  const userCategories = await db
    .select({ name: categories.name, type: categories.type, icon: categories.icon })
    .from(categories)
    .where(eq(categories.userId, session.user.id));

  const expenseCategoryCount = userCategories.filter((item) => item.type === "EXPENSE").length;
  const incomeCategoryCount = userCategories.filter((item) => item.type === "INCOME").length;

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — главная">
            <span className="brand-mark" aria-hidden="true">f</span>
            <span>flow</span>
          </Link>
          <div className="profile-chip">
            <span className="profile-avatar" aria-hidden="true">
              {session.user.name.trim().charAt(0).toLocaleUpperCase("ru-RU")}
            </span>
            <span className="profile-name">{session.user.name}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="welcome-block">
          <p className="eyebrow">ТВОЁ ФИНАНСОВОЕ ПРОСТРАНСТВО</p>
          <h1>Привет, {session.user.name.split(" ")[0]}.</h1>
          <p>Спокойный контроль над деньгами начинается с маленьких шагов.</p>
        </section>

        <section className="balance-card" aria-labelledby="balance-heading">
          <div className="balance-card-top">
            <div>
              <p className="balance-label" id="balance-heading">Общий баланс</p>
              <p className="balance-amount">0 <span>₸</span></p>
            </div>
            <span className="balance-icon" aria-hidden="true">↗</span>
          </div>
          <div className="balance-card-bottom">
            <span>{account?.name ?? "Счёт не найден"}</span>
            <span>Валюта счёта · KZT</span>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Сводка финансов">
          <article className="summary-card">
            <div className="summary-icon income-icon" aria-hidden="true">↓</div>
            <p className="summary-label">Доходы за неделю</p>
            <p className="summary-value">0 ₸</p>
            <p className="summary-caption">Пока нет операций</p>
          </article>
          <article className="summary-card">
            <div className="summary-icon expense-icon" aria-hidden="true">↑</div>
            <p className="summary-label">Расходы за неделю</p>
            <p className="summary-value">0 ₸</p>
            <p className="summary-caption">Пока нет операций</p>
          </article>
        </section>

        <section className="activity-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ПОСЛЕДНИЕ ДВИЖЕНИЯ</p>
              <h2>История операций</h2>
            </div>
            <span className="activity-count">0 операций</span>
          </div>
          <div className="empty-activity">
            <div className="empty-orb" aria-hidden="true"><span>₸</span></div>
            <h3>Здесь появятся твои операции</h3>
            <p>Счёт и категории готовы. Добавь первую операцию, чтобы увидеть историю и баланс.</p>
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>Счёт: {account ? "готов" : "нужно настроить"}</span>
          <span>{expenseCategoryCount} категорий расходов · {incomeCategoryCount} категорий доходов</span>
        </footer>
      </div>
    </main>
  );
}
