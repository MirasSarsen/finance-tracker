export default function Loading() {
  return (
    <main
      className="dashboard-page loading-page"
      aria-busy="true"
      aria-label="Загрузка приложения"
    >
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <span className="dashboard-brand" aria-hidden="true">
            <span className="brand-mark">F</span>
            Flow
          </span>
          <span className="loading-skeleton loading-avatar" aria-hidden="true" />
        </header>

        <section className="loading-content" role="status" aria-live="polite">
          <span className="loading-status">Загружаем ваши финансы…</span>
          <span className="loading-skeleton loading-title" aria-hidden="true" />
          <span className="loading-skeleton loading-subtitle" aria-hidden="true" />

          <div className="loading-skeleton loading-balance" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="loading-cards" aria-hidden="true">
            <span className="loading-skeleton" />
            <span className="loading-skeleton" />
          </div>

          <div className="loading-skeleton loading-panel" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    </main>
  );
}
