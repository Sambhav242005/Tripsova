"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/components/tripova/app-provider";
import { LoginScreen } from "@/components/tripova/auth/login-screen";
import { AuthShell } from "@/components/tripova/auth/auth-shell";
import { useAuth } from "@/components/tripova/auth/auth-context";

function LoginInner() {
  const { t } = useApp();
  const { isAuth, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuth) router.replace("/");
  }, [isAuth, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: t.accent, animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (isAuth) return null;

  return (
    <AuthShell>
      <LoginScreen t={t} onSwitch={() => router.push("/register")} onSuccess={() => router.replace("/")} />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <AppProvider>
      <LoginInner />
    </AppProvider>
  );
}
