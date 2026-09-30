"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Главная", icon: "⌂", key: "home" },
  { href: "/transactions", label: "История", icon: "≡", key: "history" },
  { href: "/#transaction-form", label: "Добавить", icon: "＋", key: "add" },
  { href: "/analytics", label: "Аналитика", icon: "▥", key: "analytics" },
  { href: "/profile", label: "Профиль", icon: "●", key: "profile" },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основная навигация" className="bottom-navigation">
      {navigationItems.map((item) => {
        const isActive = item.key === "home"
          ? pathname === "/"
          : item.key === "history"
            ? pathname.startsWith("/transactions")
            : item.key === "analytics"
              ? pathname === "/analytics"
              : item.key === "profile" && pathname === "/profile";

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            className={`bottom-navigation-item${item.key === "add" ? " add" : ""}${isActive ? " active" : ""}`}
            href={item.href}
            key={item.key}
          >
            <span aria-hidden="true" className="bottom-navigation-icon">{item.icon}</span>
            <span className="bottom-navigation-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
