"use client";

import { useSyncExternalStore } from "react";

const themeChangeEvent = "flow-theme-change";

function subscribeToTheme(callback: () => void) {
  window.addEventListener(themeChangeEvent, callback);
  return () => window.removeEventListener(themeChangeEvent, callback);
}

function getThemeSnapshot() {
  return document.documentElement.dataset.theme === "dark";
}

function getServerThemeSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(themeChangeEvent));

    try {
      window.localStorage.setItem("flow-theme", nextTheme);
    } catch {
      // The current page still changes theme even if it cannot be saved.
    }
  }

  return (
    <section className="theme-settings-card" aria-labelledby="theme-heading">
      <div className="theme-setting-copy">
        <span className="theme-setting-icon" aria-hidden="true">◐</span>
        <span>
          <strong id="theme-heading">Оформление</strong>
          <span>{isDark ? "Тёмная тема" : "Светлая тема"}</span>
        </span>
      </div>
      <button
        aria-pressed={isDark}
        className="theme-toggle-button"
        onClick={toggleTheme}
        type="button"
      >
        {isDark ? "Выключить" : "Включить тёмную"}
      </button>
    </section>
  );
}
