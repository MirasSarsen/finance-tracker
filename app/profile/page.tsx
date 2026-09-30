import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BottomNavigation } from "@/components/bottom-navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [userAccounts, [transactionCount], [categoryCount]] = await Promise.all([
    db.select({ id: accounts.id, name: accounts.name, currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))
      .orderBy(accounts.createdAt),
    db.select({ total: count() }).from(transactions).where(eq(transactions.userId, session.user.id)),
    db.select({ total: count() }).from(categories).where(eq(categories.userId, session.user.id)),
  ]);

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — главная">
            <span className="brand-mark" aria-hidden="true">f</span><span>flow</span>
          </Link>
          <SignOutButton />
        </header>

        <section className="history-page-heading">
          <p className="eyebrow">НАСТРОЙКИ</p>
          <h1>Профиль</h1>
          <p>Данные твоего аккаунта и финансового пространства</p>
        </section>

        <section className="profile-details-card" aria-labelledby="profile-name-heading">
          <div className="profile-details-avatar" aria-hidden="true">
            {session.user.name.trim().charAt(0).toLocaleUpperCase("ru-RU")}
          </div>
          <div className="profile-details-copy">
            <h2 id="profile-name-heading">{session.user.name}</h2>
            <p>{session.user.email}</p>
          </div>
        </section>

        <ThemeToggle />

        <section className="profile-stats-grid" aria-label="Сводка профиля">
          <article className="summary-card">
            <p className="summary-label">Операций</p>
            <p className="summary-value">{transactionCount?.total ?? 0}</p>
          </article>
          <article className="summary-card">
            <p className="summary-label">Категорий</p>
            <p className="summary-value">{categoryCount?.total ?? 0}</p>
          </article>
        </section>

        <section className="profile-accounts-card" aria-labelledby="profile-accounts-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ФИНАНСЫ</p>
              <h2 id="profile-accounts-heading">Мои счета</h2>
            </div>
            <Link className="history-link" href="/">На главную</Link>
          </div>
          {userAccounts.length > 0 ? (
            <ul className="profile-account-list">
              {userAccounts.map((account) => (
                <li className="profile-account-item" key={account.id}>
                  <span className="profile-account-icon" aria-hidden="true">₸</span>
                  <span className="profile-account-name">{account.name}</span>
                  <span className="profile-account-currency">{account.currency}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="analytics-empty">Счёт не найден. Выйди и войди снова, чтобы повторить настройку аккаунта.</p>
          )}
        </section>
      </div>
      <BottomNavigation />
    </main>
  );
}
