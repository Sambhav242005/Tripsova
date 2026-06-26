"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn, SectionTitle, InputF } from "../primitives/index";
import { Icon } from "../icon";
import { useApp } from "../app-provider";
import { api, ApiError } from "@/lib/api";
import type { BudgetSummary } from "@/lib/types";

const CATEGORIES = ["Food", "Stay", "Transport", "Activities", "Shopping", "Other"];
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function BudgetScreen({ t, embedded = false }: { t: Theme; embedded?: boolean }) {
  const { user } = useApp();
  const self = (user?.name?.trim().split(/\s+/)[0]) || "You";

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthed, setUnauthed] = useState(false);

  // Participants: everyone the backend knows from real expenses, plus anyone the user
  // is adding right now (kept locally until they appear in a saved expense). Always
  // includes the current user so a fresh ledger isn't empty.
  const [extraMembers, setExtraMembers] = useState<string[]>([]);
  const members = useMemo(() => {
    const ordered = [self, ...(summary?.members ?? []), ...extraMembers];
    return Array.from(new Set(ordered.filter(Boolean)));
  }, [self, summary, extraMembers]);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExp, setNewExp] = useState({ desc: "", amount: "", category: "Food", paidBy: self, split: [] as string[] });
  const [newPerson, setNewPerson] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthed(false);
    try {
      const res = await api.get<BudgetSummary>("/api/budget");
      setSummary(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUnauthed(true);
      else setError("Couldn't load your budget. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch the budget on mount; load() flips loading state then awaits the API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const openAdd = () => {
    setNewExp({ desc: "", amount: "", category: "Food", paidBy: members[0] || self, split: members });
    setAdding(true);
  };

  const toggleSplit = (name: string) =>
    setNewExp(n => ({ ...n, split: n.split.includes(name) ? n.split.filter(x => x !== name) : [...n.split, name] }));

  const addPerson = () => {
    const name = newPerson.trim();
    if (!name || members.includes(name)) { setNewPerson(""); return; }
    setExtraMembers(m => [...m, name]);
    setNewExp(n => ({ ...n, split: [...n.split, name] }));
    setNewPerson("");
  };

  const submitExpense = async () => {
    const amount = parseFloat(newExp.amount);
    if (!newExp.desc.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const split = newExp.split.length ? newExp.split : members;
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<BudgetSummary>("/api/budget/expenses", {
        description: newExp.desc.trim(),
        amount,
        category: newExp.category,
        paid_by: newExp.paidBy,
        split,
      });
      setSummary(res);
      setExtraMembers([]); // persisted names now come back in the summary
      setAdding(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUnauthed(true);
      else setError("Couldn't save that expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (id: string) => {
    try {
      const res = await api.delete<BudgetSummary>(`/api/budget/expenses/${id}`);
      setSummary(res);
    } catch {
      setError("Couldn't remove that expense. Please try again.");
    }
  };

  const total = summary?.total ?? 0;
  const expenses = summary?.expenses ?? [];
  const settlements = summary?.settlements ?? [];

  return (
    <div style={{ padding: embedded ? 0 : "0 16px 16px" }}>
      {!embedded && (
        <div style={{ background: `linear-gradient(135deg,${t.accent}12,${t.secondary}08)`, borderRadius: 12, padding: "13px 16px", marginBottom: 20, border: `1px solid ${t.accent}15` }}>
          <div style={{ fontSize: 14, color: t.accent, fontWeight: 700 }}>💰 Budget Tracker</div>
          <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>Your real expenses. Split, tracked, settled.</div>
        </div>
      )}

      {unauthed && (
        <Card t={t}>
          <div style={{ fontSize: 13.5, color: t.text, fontWeight: 700, marginBottom: 4 }}>Sign in to track your budget</div>
          <div style={{ fontSize: 12.5, color: t.muted }}>Your expenses are saved to your account so you can come back to them on any device.</div>
        </Card>
      )}

      {error && (
        <div style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="AlertTriangle" size={15} color={t.danger} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={load} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.danger}40`, background: "transparent", color: t.danger, fontSize: 12, cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {loading && (
        <Card t={t}>
          <div style={{ height: 20, width: "50%", background: t.tag, borderRadius: 6, marginBottom: 10 }} />
          <div style={{ height: 14, width: "30%", background: t.tag, borderRadius: 6 }} />
        </Card>
      )}

      {!loading && !unauthed && (
        <>
          <Card t={t} style={{ background: `linear-gradient(135deg,${t.accent}10,${t.secondary}08)`, border: `1px solid ${t.accent}20` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
              {[
                { label: "Total Spent", val: inr(total), color: t.text },
                { label: "Per Person", val: inr(summary?.per_person ?? 0), color: t.accent },
                { label: "Expenses", val: expenses.length, color: t.secondary },
              ].map(s => (
                <div key={s.label}><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div><div style={{ fontSize: 10, color: t.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>{s.label}</div></div>
              ))}
            </div>
          </Card>

          <SectionTitle t={t}>Expenses</SectionTitle>
          {expenses.length === 0 && !adding && (
            <div style={{ textAlign: "center", padding: "28px 16px", background: t.card, borderRadius: 12, border: `1px solid ${t.border}`, marginBottom: 12 }}>
              <div style={{ fontSize: 13.5, color: t.text, fontWeight: 600 }}>No expenses yet</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 3 }}>Add your first one to start splitting costs with your group.</div>
            </div>
          )}
          {expenses.map(e => (
            <div key={e.id} style={{ background: t.card, borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{e.description}</div>
                <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{[e.category, `Paid by ${e.paid_by}`, `Split ${e.split.length} ${e.split.length === 1 ? "way" : "ways"}`].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{inr(e.amount)}</div>
                  <div style={{ fontSize: 11, color: t.muted }}>{inr(e.amount / Math.max(1, e.split.length))}/person</div>
                </div>
                <button onClick={() => removeExpense(e.id)} aria-label="Remove expense" style={{ background: "transparent", border: "none", cursor: "pointer", color: t.muted, display: "flex", padding: 4 }}>
                  <Icon name="Trash2" size={15} color={t.muted} />
                </button>
              </div>
            </div>
          ))}

          {adding ? (
            <Card t={t}>
              <InputF label="Description" value={newExp.desc} onChange={e => setNewExp(n => ({ ...n, desc: e.target.value }))} placeholder="What was this for?" t={t} />
              <InputF label="Amount (₹)" value={newExp.amount} onChange={e => setNewExp(n => ({ ...n, amount: e.target.value }))} type="number" placeholder="0" t={t} />
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7 }}>Category</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CATEGORIES.map(c => <button key={c} onClick={() => setNewExp(n => ({ ...n, category: c }))} style={{ padding: "5px 12px", borderRadius: 5, border: `1.5px solid ${newExp.category === c ? t.accent : t.border}`, background: newExp.category === c ? t.accent + "12" : t.tag, color: newExp.category === c ? t.accent : t.muted, fontSize: 12, fontWeight: newExp.category === c ? 700 : 400, cursor: "pointer" }}>{c}</button>)}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7 }}>Paid by</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {members.map(m => <button key={m} onClick={() => setNewExp(n => ({ ...n, paidBy: m }))} style={{ padding: "5px 12px", borderRadius: 5, border: `1.5px solid ${newExp.paidBy === m ? t.accent : t.border}`, background: newExp.paidBy === m ? t.accent + "12" : t.tag, color: newExp.paidBy === m ? t.accent : t.muted, fontSize: 12, fontWeight: newExp.paidBy === m ? 700 : 400, cursor: "pointer" }}>{m}</button>)}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7 }}>Split between</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {members.map(m => { const on = newExp.split.includes(m); return <button key={m} onClick={() => toggleSplit(m)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 5, border: `1.5px solid ${on ? t.secondary : t.border}`, background: on ? t.secondary + "12" : t.tag, color: on ? t.secondary : t.muted, fontSize: 12, fontWeight: on ? 700 : 400, cursor: "pointer" }}>{on && <Icon name="Check" size={11} color={t.secondary} />}{m}</button>; })}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newPerson} onChange={e => setNewPerson(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addPerson(); }} placeholder="Add a person…" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 13, boxSizing: "border-box" }} />
                  <Btn onClick={addPerson} outline t={t}>Add</Btn>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={submitExpense} disabled={saving} t={t} full>{saving ? "Saving…" : "Add Expense"}</Btn>
                <Btn onClick={() => setAdding(false)} outline t={t}>Cancel</Btn>
              </div>
            </Card>
          ) : (
            <button onClick={openAdd} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${t.border}`, background: "transparent", color: t.muted, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>+ Add Expense</button>
          )}

          <SectionTitle t={t}>Settle Up</SectionTitle>
          <Card t={t}>
            {settlements.length === 0 ? (
              <div style={{ fontSize: 12.5, color: t.muted, padding: "6px 0" }}>
                {expenses.length === 0 ? "Add expenses to see who owes whom." : "All settled — everyone's even."}
              </div>
            ) : (
              settlements.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < settlements.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: t.text }}><strong>{s.from}</strong> owes <strong>{s.to}</strong></span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.success }}>{inr(s.amount)}</span>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
