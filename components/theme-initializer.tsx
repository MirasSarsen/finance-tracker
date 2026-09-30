"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const theme = window.localStorage.getItem("flow-theme");
      if (theme === "dark" || theme === "light") {
        document.documentElement.dataset.theme = theme;
        window.dispatchEvent(new Event("flow-theme-change"));
      }
    } catch {
      // The app stays in its default light theme if browser storage is unavailable.
    }
  }, []);

  return null;
}
