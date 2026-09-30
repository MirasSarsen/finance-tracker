"use client";

import Link from "next/link";

type AppErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function AppError({ error, retry }: AppErrorProps) {
  return (
    <main className="dashboard-page error-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="dashboard-brand" href="/" aria-label="Flow — на главную">
            <span className="brand-mark" aria-hidden="true">F</span>
            Flow
          </Link>
        </header>

        <section className="error-card" role="alert" aria-labelledby="error-title">
          <span className="error-icon" aria-hidden="true">!</span>
          <p className="eyebrow">Что-то пошло не так</p>
          <h1 id="error-title">Не удалось загрузить эту страницу</h1>
          <p className="error-copy">
            Данные не потерялись. Попробуйте загрузить страницу ещё раз.
          </p>
          {error.digest ? (
            <p className="error-reference">Код ошибки: {error.digest}</p>
          ) : null}
          <button className="primary-button error-retry" onClick={retry} type="button">
            Попробовать снова
          </button>
        </section>
      </div>
    </main>
  );
}
