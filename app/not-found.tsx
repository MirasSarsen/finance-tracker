import Link from "next/link";

export default function NotFound() {
  return (
    <main className="dashboard-page error-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — на главную">
            <span className="brand-mark" aria-hidden="true">F</span>
            Flow
          </Link>
        </header>

        <section className="error-card" aria-labelledby="not-found-title">
          <span className="error-icon not-found-icon" aria-hidden="true">404</span>
          <p className="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</p>
          <h1 id="not-found-title">Похоже, такой страницы нет</h1>
          <p className="error-copy">
            Возможно, ссылка устарела или адрес введён с ошибкой.
          </p>
          <Link className="primary-button error-retry" href="/">
            Вернуться на главную
          </Link>
        </section>
      </div>
    </main>
  );
}
