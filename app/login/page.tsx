"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const result = isRegister
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });

      if (result.error) {
        setError(result.error.message || "Не удалось выполнить вход. Проверь данные и попробуй ещё раз.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Сервис временно недоступен. Попробуй ещё раз через минуту.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">f</span>
          <span>flow</span>
        </div>

        <div className="auth-intro">
          <p className="eyebrow">ТВОИ ФИНАНСЫ — ПОД КОНТРОЛЕМ</p>
          <h1 id="auth-heading">{isRegister ? "Деньги любят ясность." : "С возвращением."}</h1>
          <p className="auth-copy">
            {isRegister
              ? "Создай аккаунт и начни вести учёт без лишней суеты."
              : "Войди, чтобы продолжить следить за своими финансами."}
          </p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={isRegister ? "auth-tab active" : "auth-tab"}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Регистрация
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={!isRegister ? "auth-tab active" : "auth-tab"}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Войти
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="field-label">
              Как к тебе обращаться?
              <input
                autoComplete="name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Например, Алия"
                required
                value={name}
              />
            </label>
          )}
          <label className="field-label">
            Электронная почта
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field-label">
            Пароль
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Не менее 8 символов"
              required
              type="password"
              value={password}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button auth-submit" disabled={isPending} type="submit">
            {isPending ? "Подожди…" : isRegister ? "Создать аккаунт" : "Войти в аккаунт"}
            {!isPending && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="auth-footnote">Твои данные доступны только тебе.</p>
      </section>
      <aside className="auth-aside" aria-label="О приложении">
        <div className="aside-orbit orbit-one" />
        <div className="aside-orbit orbit-two" />
        <div className="aside-content">
          <p className="aside-kicker">МЕНЬШЕ ТРЕВОГИ. БОЛЬШЕ ЯСНОСТИ.</p>
          <p className="aside-quote">Хорошие привычки начинаются с одного простого шага.</p>
          <div className="aside-note">
            <span className="note-dot" />
            <span>Начни с того, что важно сегодня</span>
          </div>
        </div>
        <span className="aside-caption">Личный финансовый трекер</span>
      </aside>
    </main>
  );
}
