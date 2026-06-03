"use client";

import React, { useState } from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";
import { useAuth } from "./auth-context";

interface RegisterScreenProps {
  t: Theme;
  onSwitch: () => void;
  onSuccess: () => void;
}

export function RegisterScreen({ t, onSwitch, onSuccess }: RegisterScreenProps) {
  const { register, error } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
      onSuccess();
    } catch (err: any) {
      setLocalError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px 24px", maxWidth: 400, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Icon name="Compass" size={28} color={t.goldFill} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: t.heading, letterSpacing: 2, margin: "0 0 4px" }}>TRIPOVA</h1>
        <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>Join the traveller community</p>
      </div>
      <form onSubmit={handleSubmit}>
        {(localError || error) && (
          <div style={{ background: t.danger + "14", border: `1px solid ${t.danger}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: t.danger }}>{localError || error}</div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 5, display: "block" }}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 5, display: "block" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 5, display: "block" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 5, display: "block" }}>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            required
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: loading ? t.muted : `linear-gradient(135deg,${t.accent},${t.secondary})`,
            border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
      <p style={{ textAlign: "center", fontSize: 13, color: t.muted, marginTop: 20 }}>
        Already have an account?{" "}
        <button onClick={onSwitch} style={{ background: "transparent", border: "none", color: t.accent, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}>
          Sign In
        </button>
      </p>
    </div>
  );
}
