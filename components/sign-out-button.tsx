"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="sign-out-button" onClick={handleSignOut} type="button">
      Выйти
    </button>
  );
}
